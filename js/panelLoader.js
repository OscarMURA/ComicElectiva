(function () {
  'use strict';

  window.Comic = window.Comic || {};

  const STORY_URL = './js/data/story.json';
  const CONTAINER_SELECTOR = '#story-container';

  // Default positions (in %) for each `position` keyword.
  const POSITION_DEFAULTS = {
    'top-left':     { x: 15, y: 15 },
    'top-right':    { x: 70, y: 15 },
    'center':       { x: 40, y: 45 },
    'bottom-left':  { x: 15, y: 75 },
    'bottom-right': { x: 70, y: 75 },
    'left':         { x: 15, y: 45 },
    'right':        { x: 70, y: 45 },
    'narrator':     { x: 10, y: 85, w: 80 },
  };

  let storyData = null;

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function positionToClass(pos) {
    // Map original `position` keyword to the new bubble-* class.
    if (pos === 'left' || pos === 'top-left' || pos === 'bottom-left') return 'bubble-left';
    if (pos === 'right' || pos === 'top-right' || pos === 'bottom-right') return 'bubble-right';
    if (pos === 'center') return 'bubble-center';
    return 'bubble-left';
  }

  function bubbleStyle(d) {
    // Use d.x/d.y if provided (numbers in %); else map from `position`.
    const def = POSITION_DEFAULTS[d.position || 'bottom-left'] || POSITION_DEFAULTS['bottom-left'];
    const x = (typeof d.x === 'number') ? d.x : def.x;
    const y = (typeof d.y === 'number') ? d.y : def.y;
    let style = 'left:' + x + '%;top:' + y + '%;';
    if (def.w) style += 'width:' + def.w + '%;';
    return style;
  }

  function renderDialogue(d, panelId, idx) {
    const speaker = escapeHtml(d.speaker || '');
    const text = escapeHtml(d.text || '');
    const bubbleId = escapeHtml(panelId + '-d' + idx);
    const cls = positionToClass(d.position || 'bottom-left');
    const style = bubbleStyle(d);
    return (
      '<div class="bubble ' + cls + ' dialogue dialogue--' + escapeHtml(d.position || 'bottom-left') + '"' +
      ' data-bubble-id="' + bubbleId + '"' +
      ' data-speaker="' + speaker + '"' +
      ' data-position="' + escapeHtml(d.position || 'bottom-left') + '"' +
      ' data-full-text="' + text + '"' +
      ' style="' + style + ';opacity:0">' +
      '<p class="dialogue__text" data-full-text="' + text + '">' +
      '<span class="tw-typed dialogue__typed"></span>' +
      '<span class="caret">|</span>' +
      '<span class="tw-rest" aria-hidden="true">' + text + '</span>' +
      '</p>' +
      '</div>'
    );
  }

  function renderNarration(narration, panelId) {
    if (!narration) return '';
    const def = POSITION_DEFAULTS['narrator'];
    const style = 'left:' + def.x + '%;top:' + def.y + '%;width:' + def.w + '%;';
    const text = escapeHtml(narration);
    const bubbleId = escapeHtml(panelId + '-narration');
    return (
      '<div class="bubble bubble-narration narration dialogue dialogue--narration"' +
      ' data-bubble-id="' + bubbleId + '"' +
      ' data-position="narrator"' +
      ' data-full-text="' + text + '"' +
      ' style="' + style + ';opacity:0">' +
      '<p class="dialogue__text" data-full-text="' + text + '">' +
      '<span class="tw-typed dialogue__typed"></span>' +
      '<span class="caret">|</span>' +
      '<span class="tw-rest" aria-hidden="true">' + text + '</span>' +
      '</p>' +
      '</div>'
    );
  }

  function renderDialogues(dialogues, panelId) {
    if (!Array.isArray(dialogues) || dialogues.length === 0) return '';
    return dialogues.map((d, i) => renderDialogue(d, panelId, i)).join('');
  }

  function renderPanel(panel, chapterId) {
    const id = escapeHtml(panel.id != null ? panel.id : '');
    const image = escapeHtml(panel.image || '');
    const sfx = escapeHtml(panel.sfx || '');
    const ambient = escapeHtml(panel.ambient || '');
    const chapter = escapeHtml(chapterId);

    const attrs = [
      'class="panel"',
      'data-panel-id="' + id + '"',
      'data-chapter="' + chapter + '"',
    ];
    if (ambient) attrs.push('data-ambient="' + ambient + '"');
    if (sfx) attrs.push('data-sfx="' + sfx + '"');

    const bg = image
      ? '<img class="panel-bg" src="' + image + '" alt="" loading="lazy" decoding="async" />'
      : '<div class="panel-bg panel-bg--placeholder" aria-hidden="true"></div>';

    const overlayContent =
      renderNarration(panel.narration, panel.id) +
      renderDialogues(panel.dialogues, panel.id);

    return (
      '<section ' + attrs.join(' ') + '>' +
        '<div class="panel__media">' +
          bg +
          '<div class="panel__overlay">' + overlayContent + '</div>' +
        '</div>' +
      '</section>'
    );
  }

  function renderChapterIntro(ch) {
    const title = escapeHtml(ch.title || '');
    const id = escapeHtml(ch.id);
    const act = ch.act ? escapeHtml(ch.act) : '';
    const scene = ch.scene ? escapeHtml(ch.scene) : '';
    const note = ch.note ? escapeHtml(ch.note) : '';
    return (
      '<header class="chapter-intro" data-chapter="' + id + '">' +
      '<span class="chapter-intro__label">' +
        'Capítulo ' + id + (act ? ' · ' + act : '') +
      '</span>' +
      '<h2 class="chapter-intro__title">Escena ' + id + ' · ' + title + '</h2>' +
      (scene ? '<p class="chapter-intro__scene">' + scene + '</p>' : '') +
      (note ? '<p class="chapter-intro__note">' + note + '</p>' : '') +
      '</header>'
    );
  }

  async function fetchStory() {
    try {
      const res = await fetch(STORY_URL, { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      console.warn('[PanelLoader] Could not load story.json:', err);
      return null;
    }
  }

  function getChapterPanels(chapterId) {
    const chapters = window.Chapters || {};
    const data = chapters[chapterId] || chapters[String(chapterId)];
    if (!data) return [];
    if (Array.isArray(data)) return data;
    return Array.isArray(data.panels) ? data.panels : [];
  }

  function loadDeletedPanels() {
    try {
      const raw = localStorage.getItem('comic-deleted-panels');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function loadDeletedBubbles() {
    try {
      const raw = localStorage.getItem('comic-deleted-bubbles');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function loadPanelOrder() {
    try {
      const raw = localStorage.getItem('comic-panel-order');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function loadExtraPanels() {
    try {
      const raw = localStorage.getItem('comic-extra-panels');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function applyPanelOrder() {
    const order = loadPanelOrder();
    if (!Array.isArray(order) || order.length === 0) return;
    const container = document.querySelector(CONTAINER_SELECTOR);
    if (!container) return;
    // Move panels into the saved order, anchored to their chapter article.
    order.forEach((pid) => {
      const panel = container.querySelector(
        '.panel[data-panel-id="' + String(pid).replace(/"/g, '\\"') + '"]'
      );
      if (!panel) return;
      const chapter = panel.closest('.chapter');
      if (!chapter) return;
      // Append in order; same chapter only — preserves chapter intro at top.
      const sameChapterId = panel.dataset.chapter;
      const targetChapter = container.querySelector(
        '.chapter[data-chapter="' + String(sameChapterId).replace(/"/g, '\\"') + '"]'
      );
      if (targetChapter) targetChapter.appendChild(panel);
    });
  }

  function applyStoredBubblePositions() {
    let stored = {};
    try {
      const raw = localStorage.getItem('comic-bubble-positions');
      stored = raw ? JSON.parse(raw) : {};
    } catch (e) {
      stored = {};
    }
    Object.keys(stored).forEach((id) => {
      const el = document.querySelector('.bubble[data-bubble-id="' + id.replace(/"/g, '\\"') + '"]');
      if (!el) return;
      const pos = stored[id] || {};
      if (typeof pos.x === 'number') el.style.left = pos.x + '%';
      if (typeof pos.y === 'number') el.style.top = pos.y + '%';
    });
  }

  function applyStoredCharacterPositions() {
    let stored = {};
    try {
      const raw = localStorage.getItem('comic-character-positions');
      stored = raw ? JSON.parse(raw) : {};
    } catch (e) {
      stored = {};
    }
    Object.keys(stored).forEach((id) => {
      const el = document.querySelector('.character-overlay[data-character-id="' + id.replace(/"/g, '\\"') + '"]');
      if (!el) return;
      const pos = stored[id] || {};
      if (typeof pos.x === 'number') el.style.left = pos.x + '%';
      if (typeof pos.y === 'number') el.style.top = pos.y + '%';
    });
  }

  function applyStoredBubbleSizes() {
    let stored = {};
    try {
      const raw = localStorage.getItem('comic-bubble-sizes');
      stored = raw ? JSON.parse(raw) : {};
    } catch (e) {
      stored = {};
    }
    Object.keys(stored).forEach((id) => {
      const el = document.querySelector('.bubble[data-bubble-id="' + id.replace(/"/g, '\\"') + '"]');
      if (!el) return;
      const sz = stored[id] || {};
      if (typeof sz.w === 'number') { el.style.maxWidth = 'none'; el.style.width = sz.w + 'px'; }
      if (typeof sz.h === 'number') { el.style.maxHeight = 'none'; el.style.height = sz.h + 'px'; }
    });
  }

  function applyStoredCharacterSizes() {
    let stored = {};
    try {
      const raw = localStorage.getItem('comic-character-sizes');
      stored = raw ? JSON.parse(raw) : {};
    } catch (e) {
      stored = {};
    }
    Object.keys(stored).forEach((id) => {
      const el = document.querySelector('.character-overlay[data-character-id="' + id.replace(/"/g, '\\"') + '"]');
      if (!el) return;
      const sz = stored[id] || {};
      if (typeof sz.w === 'number') el.style.width = sz.w + 'px';
      if (typeof sz.h === 'number') el.style.height = sz.h + 'px';
    });
  }

  async function init() {
    const container = document.querySelector(CONTAINER_SELECTOR);
    if (!container) {
      console.warn('[PanelLoader] #story-container not found.');
      return;
    }

    storyData = await fetchStory();
    const chapters = (storyData && Array.isArray(storyData.chapters))
      ? storyData.chapters
      : [];

    if (chapters.length === 0) {
      container.innerHTML =
        '<p class="empty-state">No hay capítulos disponibles aún.</p>';
      return;
    }

    const deletedPanels = loadDeletedPanels();
    const deletedBubbles = loadDeletedBubbles();
    const extraPanels = loadExtraPanels();
    const isDeletedPanel = (pid) =>
      deletedPanels.indexOf(String(pid)) !== -1 || deletedPanels.indexOf(pid) !== -1;
    const isDeletedBubble = (bid) =>
      deletedBubbles.indexOf(String(bid)) !== -1 || deletedBubbles.indexOf(bid) !== -1;

    const html = chapters
      .map((ch) => {
        const base = getChapterPanels(ch.id);
        const extras = Array.isArray(extraPanels[ch.id])
          ? extraPanels[ch.id]
          : (Array.isArray(extraPanels[String(ch.id)]) ? extraPanels[String(ch.id)] : []);
        const panels = base.concat(extras).filter((p) => !isDeletedPanel(p.id));
        const panelsHtml = panels.map((p) => renderPanel(p, ch.id)).join('');
        return (
          '<article class="chapter" data-chapter="' +
          escapeHtml(ch.id) +
          '">' +
          renderChapterIntro(ch) +
          panelsHtml +
          '</article>'
        );
      })
      .join('');

    container.innerHTML = html;

    // Filter out individually deleted bubbles (originals from JSON).
    if (deletedBubbles.length) {
      deletedBubbles.forEach((bid) => {
        const el = container.querySelector(
          '.bubble[data-bubble-id="' + String(bid).replace(/"/g, '\\"') + '"]'
        );
        if (el && el.parentNode) el.parentNode.removeChild(el);
      });
    }

    // Apply saved panel order (intra-chapter reorder).
    applyPanelOrder();

    // Apply persisted positions and sizes for original bubbles and characters.
    applyStoredBubblePositions();
    applyStoredCharacterPositions();
    applyStoredBubbleSizes();
    applyStoredCharacterSizes();

    // Tinte de fondo a partir de la imagen (o blanco si no hay imagen).
    applyAllPanelTints(container);

    // Escala visual proporcional al ancho actual de cada panel.
    observePanelScales(container);

    document.dispatchEvent(
      new CustomEvent('panels:loaded', {
        detail: { chapterCount: chapters.length },
      })
    );
  }

  function findPanelData(panelId) {
    const chapters = window.Chapters || {};
    const keys = Object.keys(chapters);
    for (let i = 0; i < keys.length; i++) {
      const data = chapters[keys[i]];
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.panels) ? data.panels : []);
      for (let j = 0; j < list.length; j++) {
        if (String(list[j].id) === String(panelId)) {
          return { panel: list[j], chapterId: keys[i] };
        }
      }
    }
    const extras = loadExtraPanels();
    const ekeys = Object.keys(extras);
    for (let i = 0; i < ekeys.length; i++) {
      const list = extras[ekeys[i]] || [];
      for (let j = 0; j < list.length; j++) {
        if (String(list[j].id) === String(panelId)) {
          return { panel: list[j], chapterId: ekeys[i] };
        }
      }
    }
    return null;
  }

  function renderPanelHTML(panel, chapterId) {
    return renderPanel(panel, chapterId);
  }

  // ---- Panel tint: color promedio de la imagen como background -------------
  // Calcula el color promedio de `imgEl` (downscaling a 24x24 en canvas) y
  // devuelve { r, g, b } sin procesar. Si no se puede leer (CORS), null.
  function computeAverageRgb(imgEl) {
    try {
      const w = 24, h = 24;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.drawImage(imgEl, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 32) continue;
        r += data[i]; g += data[i + 1]; b += data[i + 2];
        n++;
      }
      if (!n) return null;
      return { r: r / n, g: g / n, b: b / n };
    } catch (e) {
      return null;
    }
  }

  function mixWithWhite(rgb, mix) {
    return {
      r: Math.round(rgb.r + (255 - rgb.r) * mix),
      g: Math.round(rgb.g + (255 - rgb.g) * mix),
      b: Math.round(rgb.b + (255 - rgb.b) * mix),
    };
  }

  function rgbStr(rgb) {
    return 'rgb(' + Math.round(rgb.r) + ',' + Math.round(rgb.g) + ',' + Math.round(rgb.b) + ')';
  }
  function rgbaStr(rgb, a) {
    return 'rgba(' + Math.round(rgb.r) + ',' + Math.round(rgb.g) + ',' + Math.round(rgb.b) + ',' + a + ')';
  }

  // Devuelve true si el medio tiene pixels disponibles para sampling.
  // Para <img>: naturalWidth > 0. Para <video>: readyState >= 2 (HAVE_CURRENT_DATA).
  function mediaHasPixels(el) {
    if (!el) return false;
    if (el.tagName === 'VIDEO') return el.readyState >= 2 && el.videoWidth > 0;
    return el.complete && el.naturalWidth > 0;
  }

  function applyPanelTint(mediaEl) {
    if (!mediaEl) return;
    const media = mediaEl.closest('.panel__media');
    const panel = mediaEl.closest('.panel');
    if (!media) return;
    const isVideo = mediaEl.tagName === 'VIDEO';
    const run = () => {
      if (!mediaHasPixels(mediaEl)) return;
      const raw = computeAverageRgb(mediaEl);
      if (!raw) return;
      // Fondo del panel: matiz pastel suave (mezcla con blanco).
      const soft = mixWithWhite(raw, 0.55);
      media.style.backgroundColor = rgbStr(soft);
      // Variables para el "aura" alrededor del panel: usan el color saturado
      // para que la sombra y el wash exterior tiñan el papel crema.
      if (panel) {
        panel.style.setProperty('--panel-tint-soft', rgbStr(soft));
        panel.style.setProperty('--panel-tint-glow', rgbaStr(raw, 0.55));
        panel.style.setProperty('--panel-tint-wash', rgbaStr(raw, 0.18));
      }
    };
    if (mediaHasPixels(mediaEl)) {
      run();
    } else if (isVideo) {
      // loadeddata = el primer frame ya está disponible para drawImage.
      mediaEl.addEventListener('loadeddata', run, { once: true });
      mediaEl.addEventListener('error', () => {
        media.style.backgroundColor = '#ffffff';
      }, { once: true });
    } else {
      mediaEl.addEventListener('load', run, { once: true });
      mediaEl.addEventListener('error', () => {
        media.style.backgroundColor = '#ffffff';
      }, { once: true });
    }
  }

  // ---- Panel scale: hace que burbujas y personajes se vean ----------------
  //      proporcionales cuando la ventana se achica.
  //
  // Las posiciones (left/top) ya están en %, así que escalan solas con el
  // panel. Pero el tamaño y el font-size de las burbujas/personajes están
  // guardados en píxeles absolutos (se fijaron desde el editor en desktop a
  // ~1280px de ancho). En pantallas pequeñas eso hace que todo se vea enorme.
  //
  // Solución: se publica `--panel-scale = clientWidth / 1280` en cada panel
  // y la CSS aplica `transform: ... scale(var(--panel-scale))` a burbujas y
  // personajes. Como ya estaban centrados con `translate(-50%, -50%)`, la
  // escala se aplica respecto al centro y la posición no se ve afectada.

  const PANEL_SCALE_REFERENCE = 1280; // ancho de diseño (máximo en desktop)
  const PANEL_SCALE_MIN = 0.45;       // no encoger por debajo de esto (legibilidad)
  const PANEL_SCALE_MAX = 1;          // y no agrandar arriba del original
  let panelScaleObserver = null;

  function updatePanelScale(panel) {
    if (!panel) return;
    // Aplicamos la misma fórmula tanto en desktop como en móvil: el contenido
    // (burbujas, personajes) escala proporcional al ancho real del panel.
    // En móvil esto es esencial para que las cosas no se salgan del viewport.
    const w = panel.clientWidth;
    if (!w) return;
    // Curva con raíz cuadrada: más suave que la lineal en pantallas chicas
    // (para legibilidad), pero igual proporcional al ancho.
    //   1280px → 1.0
    //    800px → 0.79
    //    600px → 0.68
    //    400px → 0.56
    //    320px → 0.50
    let scale = Math.sqrt(w / PANEL_SCALE_REFERENCE);
    if (scale > PANEL_SCALE_MAX) scale = PANEL_SCALE_MAX;
    if (scale < PANEL_SCALE_MIN) scale = PANEL_SCALE_MIN;
    // 3 decimales: suficiente precisión, evita repintar por cambios <0.001.
    panel.style.setProperty('--panel-scale', scale.toFixed(3));
  }

  function observePanelScales(root) {
    const scope = root || document;
    const panels = [];
    if (scope.nodeType === 1 && scope.classList && scope.classList.contains('panel')) {
      panels.push(scope);
    }
    scope.querySelectorAll && scope.querySelectorAll('.panel').forEach((p) => {
      if (panels.indexOf(p) === -1) panels.push(p);
    });

    // Inicializar el valor de cada panel ahora mismo (síncrono) para que
    // burbujas y personajes nazcan ya con el tamaño correcto sin "popping".
    panels.forEach(updatePanelScale);

    if (typeof ResizeObserver !== 'function') return;
    if (!panelScaleObserver) {
      panelScaleObserver = new ResizeObserver((entries) => {
        entries.forEach((entry) => updatePanelScale(entry.target));
      });
    }
    panels.forEach((p) => panelScaleObserver.observe(p));
  }

  function applyAllPanelTints(root) {
    const scope = root || document;
    // Si `root` es un panel concreto, incluirlo además de sus descendientes.
    const isElement = scope && scope.nodeType === 1;
    const panels = [];
    if (isElement && scope.classList && scope.classList.contains('panel')) {
      panels.push(scope);
    }
    scope.querySelectorAll && scope.querySelectorAll('.panel').forEach((p) => {
      if (panels.indexOf(p) === -1) panels.push(p);
    });
    panels.forEach((p) => {
      // Acepta tanto <img class="panel-bg"> como <video class="panel-bg">.
      const bg = p.querySelector('img.panel-bg, video.panel-bg');
      const placeholder = p.querySelector('.panel-bg--placeholder');
      const media = p.querySelector('.panel__media');
      if (bg) {
        applyPanelTint(bg);
      } else if (placeholder && media) {
        media.style.backgroundColor = '#ffffff';
      }
    });
  }

  window.Comic.PanelLoader = {
    init: init,
    getStory: function () {
      return storyData;
    },
    applyStoredBubblePositions: applyStoredBubblePositions,
    applyStoredCharacterPositions: applyStoredCharacterPositions,
    applyStoredBubbleSizes: applyStoredBubbleSizes,
    applyStoredCharacterSizes: applyStoredCharacterSizes,
    applyPanelOrder: applyPanelOrder,
    findPanelData: findPanelData,
    renderPanelHTML: renderPanelHTML,
    applyPanelTint: applyPanelTint,
    applyAllPanelTints: applyAllPanelTints,
    observePanelScales: observePanelScales,
    updatePanelScale: updatePanelScale,
    POSITION_DEFAULTS: POSITION_DEFAULTS,
  };
})();
