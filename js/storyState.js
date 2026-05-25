// Story state snapshot: centralizes localStorage keys for the comic so the
// user can back everything up (bubbles, backgrounds, characters, positions,
// sizes, panel order, deletions, audio, text overrides, timing) to a JSON
// file and restore it later from any browser.
//
// Exposes window.Comic.StoryState with:
//   - listKeys()        → array of managed keys
//   - exportSnapshot()  → object snapshot
//   - downloadJSON()    → triggers a download of the snapshot
//   - importSnapshot(obj, opts) → applies a snapshot (opts.replace = clear keys first)
//   - importFromFile(file, opts) → reads a File and imports it
//   - clearAll()        → wipes every managed key
(function () {
  'use strict';

  window.Comic = window.Comic || {};

  const VERSION = 1;
  const KEYS = [
    'comic-user-bubbles',
    'comic-user-backgrounds',
    'comic-user-characters',
    'comic-user-character-gallery',
    'comic-bubble-positions',
    'comic-bubble-fontsizes',
    'comic-character-positions',
    'comic-user-panel-audio',
    'comic-user-global-audio',
    'comic-global-audio-volume',
    'comic-deleted-panels',
    'comic-deleted-bubbles',
    'comic-panel-order',
    'comic-bubble-text-overrides',
    'comic-bubble-timing',
    'comic-bubble-audio',
    'comic-bubble-sizes',
    'comic-character-sizes',
    'comic-extra-panels',
    'comic-bubble-sides',
  ];

  function listKeys() { return KEYS.slice(); }

  function readKey(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return null;
      // Try JSON first; fall back to raw string (e.g. global volume).
      try { return JSON.parse(raw); } catch (_) { return raw; }
    } catch (e) { return null; }
  }

  function writeKey(key, value) {
    try {
      if (value == null) { localStorage.removeItem(key); return; }
      const v = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, v);
    } catch (e) { /* quota / disabled */ }
  }

  function exportSnapshot() {
    const data = {};
    KEYS.forEach((k) => {
      const v = readKey(k);
      if (v !== null && v !== undefined) data[k] = v;
    });
    return {
      app: 'HilosDelAgua',
      version: VERSION,
      savedAt: new Date().toISOString(),
      data: data,
    };
  }

  function clearAll() {
    KEYS.forEach((k) => { try { localStorage.removeItem(k); } catch (_) {} });
  }

  function importSnapshot(snapshot, opts) {
    opts = opts || {};
    if (!snapshot) throw new Error('Snapshot vacío');
    const data = snapshot.data || snapshot; // accept raw map too
    if (typeof data !== 'object') throw new Error('Snapshot inválido');
    if (opts.replace) clearAll();
    Object.keys(data).forEach((k) => {
      if (KEYS.indexOf(k) === -1) return; // ignore unknown keys
      writeKey(k, data[k]);
    });
    if (opts.reload !== false) {
      // Reload so every module re-reads its persisted state cleanly.
      setTimeout(() => location.reload(), 50);
    }
  }

  function downloadJSON(filename) {
    const snap = exportSnapshot();
    const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = filename || ('comic-estado-' + stamp + '.json');
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 200);
  }

  function importFromFile(file, opts) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('Sin archivo'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(String(reader.result));
          importSnapshot(json, opts);
          resolve(json);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  window.Comic.StoryState = {
    VERSION: VERSION,
    listKeys: listKeys,
    exportSnapshot: exportSnapshot,
    importSnapshot: importSnapshot,
    importFromFile: importFromFile,
    downloadJSON: downloadJSON,
    clearAll: clearAll,
  };
})();
