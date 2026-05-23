// Sincroniza el estado del editor con el backend (server.py) para que TODO
// (burbujas, fondos, personajes — incluidos GIF/video/audio — posiciones,
// tamaños, ritmo, audios por burbuja, etc.) quede persistido en el repo:
//
//   - js/data/scenes/sceneN.json  (snapshot dividido por escena)
//   - js/data/state.json          (snapshot completo, fallback/legacy)
//   - assets/uploads/<hash>       (archivos binarios subidos)
//
// Flujo:
//   1) En index.html, un script sincrónico hace GET /api/state ANTES de que
//      cualquier otro módulo lea localStorage. Eso siembra localStorage con
//      el estado del repo, así todos arrancan iguales.
//   2) Cualquier `localStorage.setItem` sobre una clave manejada por
//      StoryState dispara un POST debounced a /api/state.
//   3) `uploadDataUrl(dataURL)` sube binarios al servidor y devuelve la
//      URL relativa (`assets/uploads/xxxx.ext`) para guardar en lugar del
//      Base64 — así el state.json se mantiene pequeño y los binarios viven
//      como archivos del repo.
(function () {
  'use strict';

  window.Comic = window.Comic || {};

  const STATE_URL = '/api/state';
  const UPLOAD_URL = '/api/upload';
  const DEBOUNCE_MS = 1500;

  let serverAvailable = true;
  let suppressSync = false;
  let pendingTimer = null;
  let lastPushedJSON = null;

  function isManagedKey(key) {
    if (!window.Comic.StoryState) return false;
    const keys = window.Comic.StoryState.listKeys();
    return keys.indexOf(key) !== -1;
  }

  async function uploadDataUrl(dataUrl, filename) {
    if (!serverAvailable) return null;
    if (typeof dataUrl !== 'string' || dataUrl.indexOf('data:') !== 0) {
      // Ya es una URL del repo (o externa), no hace falta subir.
      return dataUrl;
    }
    try {
      const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl: dataUrl, filename: filename || '' }),
      });
      if (!res.ok) {
        console.warn('[RepoSync] upload falló:', res.status);
        return null;
      }
      const json = await res.json();
      return (json && json.url) || null;
    } catch (e) {
      console.warn('[RepoSync] upload error:', e);
      serverAvailable = false;
      return null;
    }
  }

  async function pushNow() {
    if (!serverAvailable) return;
    if (!window.Comic.StoryState) return;
    const snap = window.Comic.StoryState.exportSnapshot();
    const body = JSON.stringify(snap);
    if (body === lastPushedJSON) return;
    try {
      const res = await fetch(STATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });
      if (res.ok) {
        lastPushedJSON = body;
      } else {
        console.warn('[RepoSync] push estado falló:', res.status);
      }
    } catch (e) {
      console.warn('[RepoSync] push estado error:', e);
      serverAvailable = false;
    }
  }

  function schedulePush() {
    if (suppressSync || !serverAvailable) return;
    if (pendingTimer) clearTimeout(pendingTimer);
    pendingTimer = setTimeout(pushNow, DEBOUNCE_MS);
  }

  // Engancha localStorage para detectar cambios sin tocar cada llamada del editor.
  function hookStorage() {
    const proto = window.Storage && window.Storage.prototype;
    if (!proto || proto.__repoSyncHooked) return;
    proto.__repoSyncHooked = true;
    const origSet = proto.setItem;
    const origRem = proto.removeItem;
    proto.setItem = function (k, v) {
      origSet.call(this, k, v);
      if (this === window.localStorage && isManagedKey(k)) schedulePush();
    };
    proto.removeItem = function (k) {
      origRem.call(this, k);
      if (this === window.localStorage && isManagedKey(k)) schedulePush();
    };
  }

  function setSuppressed(v) { suppressSync = !!v; }

  // Marca el snapshot recién recibido como "ya empujado" para no rebotarlo.
  function markCurrentAsSynced() {
    if (!window.Comic.StoryState) return;
    try {
      lastPushedJSON = JSON.stringify(window.Comic.StoryState.exportSnapshot());
    } catch (_) {}
  }

  function init() {
    hookStorage();
    markCurrentAsSynced();
    // Si el seed sincrónico ya pobló localStorage no hace falta volver a tirar
    // GET; aun así, una recarga blanda asegura consistencia si alguien empujó
    // mientras la pestaña estaba abierta. Por ahora omitimos polling.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Cuando la pestaña vuelve a foco, hace push si hay cambios locales.
        schedulePush();
      }
    });
    window.addEventListener('beforeunload', () => {
      // Intento de último push antes de cerrar.
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        pendingTimer = null;
      }
      // No await — best effort.
      pushNow();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.Comic.RepoSync = {
    uploadDataUrl: uploadDataUrl,
    push: pushNow,
    schedulePush: schedulePush,
    setSuppressed: setSuppressed,
    markCurrentAsSynced: markCurrentAsSynced,
    isAvailable: function () { return serverAvailable; },
  };
})();
