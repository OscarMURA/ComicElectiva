// Editor module. Exposes window.BubbleEditor and window.Comic.BubbleEditor.
// Loads after panelLoader.js / typewriter.js.
(function () {
  'use strict';

  window.Comic = window.Comic || {};

  // ---- Constants -------------------------------------------------------------
  const EDIT_PASSWORD = 'oscar22lulu';
  const AUTH_KEY = 'comic-edit-auth';

  const STORAGE_KEY = 'comic-user-bubbles';
  const BG_KEY = 'comic-user-backgrounds';
  const CHAR_KEY = 'comic-user-characters';
  const GALLERY_KEY = 'comic-user-character-gallery';
  const BUBBLE_POS_KEY = 'comic-bubble-positions';
  const FONT_SIZE_KEY = 'comic-bubble-fontsizes';
  const MIN_FONT_SIZE = 10;
  const MAX_FONT_SIZE = 40;
  const CHAR_POS_KEY = 'comic-character-positions';
  const PANEL_AUDIO_KEY = 'comic-user-panel-audio';
  const GLOBAL_AUDIO_KEY = 'comic-user-global-audio';
  const GLOBAL_VOL_KEY = 'comic-global-audio-volume';

  const DELETED_PANELS_KEY = 'comic-deleted-panels';
  const DELETED_BUBBLES_KEY = 'comic-deleted-bubbles';
  const PANEL_ORDER_KEY = 'comic-panel-order';
  const EXTRA_PANELS_KEY = 'comic-extra-panels';
  const HISTORY_LIMIT = 50;

  const SPEAKERS = ['bongo', 'narrator', 'nina', 'lumi', 'buho', 'lucesitas'];
  const POSITIONS = [
    'top-left',
    'top-center',
    'top-right',
    'middle-left',
    'center',
    'middle-right',
    'bottom-left',
    'bottom-center',
    'bottom-right',
  ];
  // Default x/y percentages per position name (3x3 grid).
  const POSITION_COORDS = {
    'top-left':      { x: 15, y: 15 },
    'top-center':    { x: 50, y: 15 },
    'top-right':     { x: 85, y: 15 },
    'middle-left':   { x: 15, y: 50 },
    'center':        { x: 50, y: 50 },
    'middle-right':  { x: 85, y: 50 },
    'bottom-left':   { x: 15, y: 85 },
    'bottom-center': { x: 50, y: 85 },
    'bottom-right':  { x: 85, y: 85 },
  };
  const POSITION_LABELS = {
    'top-left':      'Arriba izquierda',
    'top-center':    'Arriba centro',
    'top-right':     'Arriba derecha',
    'middle-left':   'Medio izquierda',
    'center':        'Centro',
    'middle-right':  'Medio derecha',
    'bottom-left':   'Abajo izquierda',
    'bottom-center': 'Abajo centro',
    'bottom-right':  'Abajo derecha',
  };
  const TEXT_OVERRIDES_KEY = 'comic-bubble-text-overrides';
  const TIMING_KEY = 'comic-bubble-timing';
  const BUBBLE_AUDIO_KEY = 'comic-bubble-audio';
  const DEFAULT_DELAY_AFTER = 300;

  const BUBBLE_SIDES_KEY = 'comic-bubble-sides';
  const BUBBLE_TYPES_KEY = 'comic-bubble-types';
  const BUBBLE_TYPES = [
    { id: 'speech',    label: 'Diálogo (con cola)' },
    { id: 'thought',   label: 'Pensamiento (nube)' },
    { id: 'shout',     label: 'Grito (puntiaguda)' },
    { id: 'whisper',   label: 'Susurro (línea punteada)' },
    { id: 'narration', label: 'Narración (caja oscura)' },
  ];
  const BUBBLE_TYPE_CLASSES = BUBBLE_TYPES.map((t) => 'bubble-type-' + t.id);
  const POS_CLASSES = ['bubble-left', 'bubble-right', 'bubble-top-left', 'bubble-top-right', 'bubble-center'];
  const NARRATION_CLASSES = ['bubble-narration', 'narration', 'dialogue--narration'];

  // ---- State -----------------------------------------------------------------
  let panelEl = null;
  let toggleBtn = null;
  let isOpen = false;
  let panelSelect = null;
  let speakerSelect = null;
  let textArea = null;
  let positionSelect = null;
  let exportArea = null;
  let activeChapter = null;
  let activePanelId = null;
  let bgFileInput = null;
  let charFileInput = null;
  let charNameInput = null;
  let charPosSelect = null;
  let charSizeInput = null;
  let galleryList = null;
  let panelAudioFileInput = null;
  let globalAudioFileInput = null;
  let globalVolumeInput = null;

  // ---- Utilities -------------------------------------------------------------
  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      /* ignore — quota or disabled storage */
    }
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function loadStored()       { return loadJSON(STORAGE_KEY, {}); }
  function saveStored(d)      { saveJSON(STORAGE_KEY, d); }
  function loadBackgrounds()  { return loadJSON(BG_KEY, {}); }
  function saveBackgrounds(d) { saveJSON(BG_KEY, d); }
  function loadCharacters()   { return loadJSON(CHAR_KEY, []); }
  function saveCharacters(d)  { saveJSON(CHAR_KEY, d); }
  function loadGallery()      { return loadJSON(GALLERY_KEY, []); }
  function saveGallery(d)     { saveJSON(GALLERY_KEY, d); }
  function loadBubblePos()    { return loadJSON(BUBBLE_POS_KEY, {}); }
  function saveBubblePos(d)   { saveJSON(BUBBLE_POS_KEY, d); }
  function loadCharPos()      { return loadJSON(CHAR_POS_KEY, {}); }
  function saveCharPos(d)     { saveJSON(CHAR_POS_KEY, d); }

  function loadDeletedPanels() { return loadJSON(DELETED_PANELS_KEY, []); }
  function saveDeletedPanels(d) { saveJSON(DELETED_PANELS_KEY, d); }
  function loadDeletedBubbles() { return loadJSON(DELETED_BUBBLES_KEY, []); }
  function saveDeletedBubbles(d) { saveJSON(DELETED_BUBBLES_KEY, d); }
  function loadPanelOrder() { return loadJSON(PANEL_ORDER_KEY, null); }
  function savePanelOrder(arr) { saveJSON(PANEL_ORDER_KEY, arr); }
  function loadExtraPanels() { return loadJSON(EXTRA_PANELS_KEY, {}); }
  function saveExtraPanels(d) { saveJSON(EXTRA_PANELS_KEY, d); }

  function addExtraPanelToStorage(chapterId, panelData) {
    const map = loadExtraPanels();
    const key = String(chapterId);
    if (!Array.isArray(map[key])) map[key] = [];
    if (!map[key].some((p) => String(p.id) === String(panelData.id))) {
      map[key].push(panelData);
    }
    saveExtraPanels(map);
  }

  function removeExtraPanelFromStorage(panelId) {
    const map = loadExtraPanels();
    let changed = false;
    Object.keys(map).forEach((k) => {
      if (!Array.isArray(map[k])) return;
      const before = map[k].length;
      map[k] = map[k].filter((p) => String(p.id) !== String(panelId));
      if (map[k].length !== before) changed = true;
    });
    if (changed) saveExtraPanels(map);
  }

  function getCurrentPanelOrder() {
    return Array.from(document.querySelectorAll('.panel')).map((p) => p.dataset.panelId);
  }

  // ---- History (Undo / Redo) -------------------------------------------------
  const History = (function () {
    const undoStack = [];
    const redoStack = [];
    let applying = false;

    function push(action) {
      if (applying || !action) return;
      undoStack.push(action);
      if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
      // Any new action invalidates the redo stack.
      redoStack.length = 0;
    }

    function undo() {
      if (undoStack.length === 0) return false;
      const action = undoStack.pop();
      applying = true;
      try {
        revert(action);
        redoStack.push(action);
        if (redoStack.length > HISTORY_LIMIT) redoStack.shift();
      } finally {
        applying = false;
      }
      return true;
    }

    function redo() {
      if (redoStack.length === 0) return false;
      const action = redoStack.pop();
      applying = true;
      try {
        reapply(action);
        undoStack.push(action);
        if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
      } finally {
        applying = false;
      }
      return true;
    }

    function revert(a) {
      switch (a.type) {
        case 'move':
          if (a.el && a.before) {
            a.el.style.left = a.before.left;
            a.el.style.top = a.before.top;
            persistElementPosition(a.el, parseFloat(a.before.left), parseFloat(a.before.top));
          }
          break;
        case 'resize':
          if (a.el && a.before) {
            if (a.before.w != null) a.el.style.width = a.before.w + 'px';
            if (a.before.h != null) a.el.style.height = a.before.h + 'px';
            persistElementSize(a.el, parseFloat(a.before.w) || 0, parseFloat(a.before.h) || 0);
          }
          break;
        case 'font':
          if (a.el && a.before != null) {
            setBubbleFontSize(a.el, a.before);
            syncFontSliderToBubble(a.el);
          }
          break;
        case 'addBubble':
          // Undo: remove the bubble.
          if (a.el && a.el.parentNode) {
            a.el.parentNode.removeChild(a.el);
          }
          if (a.bubbleData && a.panelId) {
            const data = loadStored();
            const list = data[a.panelId] || [];
            const filtered = list.filter((b) => b.id !== a.bubbleData.id);
            data[a.panelId] = filtered;
            saveStored(data);
          }
          break;
        case 'deleteBubble':
          // Undo: restore the bubble.
          if (a.parent && a.html) {
            const tmp = document.createElement('div');
            tmp.innerHTML = a.html;
            const node = tmp.firstElementChild;
            if (node) {
              // Strip stale binding markers / inner delete button (re-attached below).
              delete node.dataset.dragBound;
              delete node.dataset.resizeBound;
              delete node.dataset.deleteBound;
              delete node.dataset.deleted;
              node.querySelectorAll('.be-bubble-del, .resize-handle').forEach((n) => n.remove());
              if (a.anchorNextSibling && a.anchorNextSibling.parentNode === a.parent) {
                a.parent.insertBefore(node, a.anchorNextSibling);
              } else {
                a.parent.appendChild(node);
              }
              a.el = node;
              attachDragHandler(node);
              applyEditableClass();
              if (a.userAdded && a.bubbleData && a.panelId) {
                const data = loadStored();
                if (!data[a.panelId]) data[a.panelId] = [];
                data[a.panelId].push(a.bubbleData);
                saveStored(data);
              } else if (!a.userAdded && a.bubbleId) {
                const list = loadDeletedBubbles().filter((id) => id !== a.bubbleId);
                saveDeletedBubbles(list);
              }
            }
          }
          break;
        case 'addCharacter':
          if (a.el && a.el.parentNode) a.el.parentNode.removeChild(a.el);
          if (a.charData) {
            const chars = loadCharacters().filter((c) => c.id !== a.charData.id);
            saveCharacters(chars);
          }
          break;
        case 'deleteCharacter':
          if (a.parent && a.charData) {
            const el = makeCharacterElement(a.charData);
            if (a.anchorNextSibling && a.anchorNextSibling.parentNode === a.parent) {
              a.parent.insertBefore(el, a.anchorNextSibling);
            } else {
              a.parent.appendChild(el);
            }
            a.el = el;
            attachDragHandler(el);
            applyEditableClass();
            const chars = loadCharacters();
            if (!chars.some((c) => c.id === a.charData.id)) {
              chars.push(a.charData);
              saveCharacters(chars);
            }
          }
          break;
        case 'deletePanel':
          // Undo: re-insert the panel element.
          if (a.panelEl && a.parent) {
            if (a.anchorNextSibling && a.anchorNextSibling.parentNode === a.parent) {
              a.parent.insertBefore(a.panelEl, a.anchorNextSibling);
            } else {
              a.parent.appendChild(a.panelEl);
            }
            const list = loadDeletedPanels().filter((id) => String(id) !== String(a.panelId));
            saveDeletedPanels(list);
            refreshPanelSelect();
            renderPanelList();
            if (window.Comic.ScrollManager && window.Comic.ScrollManager.refresh) {
              window.Comic.ScrollManager.refresh();
            }
          }
          break;
        case 'reorderPanels':
          applyPanelOrderList(a.before);
          savePanelOrder(a.before);
          renderPanelList();
          break;
        case 'addPanel':
          // Undo: remover panel del DOM + de storage de extras + del order.
          {
            const el = getPanelById(a.panelId);
            if (el && el.parentNode) el.parentNode.removeChild(el);
            removeExtraPanelFromStorage(a.panelId);
            const order = (loadPanelOrder() || getCurrentPanelOrder())
              .filter((pid) => String(pid) !== String(a.panelId));
            savePanelOrder(order);
            refreshPanelSelect();
            renderPanelList();
            if (window.Comic.ScrollManager && window.Comic.ScrollManager.refresh) {
              window.Comic.ScrollManager.refresh();
            }
          }
          break;
        default: break;
      }
    }

    function reapply(a) {
      switch (a.type) {
        case 'move':
          if (a.el && a.after) {
            a.el.style.left = a.after.left;
            a.el.style.top = a.after.top;
            persistElementPosition(a.el, parseFloat(a.after.left), parseFloat(a.after.top));
          }
          break;
        case 'resize':
          if (a.el && a.after) {
            if (a.after.w != null) a.el.style.width = a.after.w + 'px';
            if (a.after.h != null) a.el.style.height = a.after.h + 'px';
            persistElementSize(a.el, parseFloat(a.after.w) || 0, parseFloat(a.after.h) || 0);
          }
          break;
        case 'font':
          if (a.el && a.after != null) {
            setBubbleFontSize(a.el, a.after);
            syncFontSliderToBubble(a.el);
          }
          break;
        case 'addBubble':
          // Re-add the bubble using stored data.
          if (a.bubbleData && a.panelId) {
            const panel = getPanelById(a.panelId);
            if (panel) {
              const host = panelOverlay(panel);
              const el = makeBubbleElement(a.bubbleData, a.panelId);
              host.appendChild(el);
              attachDragHandler(el);
              applyEditableClass();
              a.el = el;
              const data = loadStored();
              if (!data[a.panelId]) data[a.panelId] = [];
              if (!data[a.panelId].some((b) => b.id === a.bubbleData.id)) {
                data[a.panelId].push(a.bubbleData);
                saveStored(data);
              }
            }
          }
          break;
        case 'deleteBubble':
          // Re-delete (capture current node from DOM in case undo recreated it).
          if (a.bubbleId) {
            const el = document.querySelector(
              '.bubble[data-bubble-id="' + a.bubbleId.replace(/"/g, '\\"') + '"]'
            );
            if (el && el.parentNode) el.parentNode.removeChild(el);
            if (a.userAdded && a.panelId) {
              const data = loadStored();
              const list = (data[a.panelId] || []).filter((b) => b.id !== a.bubbleId);
              data[a.panelId] = list;
              saveStored(data);
            } else {
              const list = loadDeletedBubbles();
              if (list.indexOf(a.bubbleId) === -1) list.push(a.bubbleId);
              saveDeletedBubbles(list);
            }
          }
          break;
        case 'addCharacter':
          if (a.charData) {
            const panel = getPanelById(a.charData.panelId);
            if (panel) {
              const host = panelOverlay(panel);
              const el = makeCharacterElement(a.charData);
              host.appendChild(el);
              attachDragHandler(el);
              applyEditableClass();
              a.el = el;
              const chars = loadCharacters();
              if (!chars.some((c) => c.id === a.charData.id)) {
                chars.push(a.charData);
                saveCharacters(chars);
              }
            }
          }
          break;
        case 'deleteCharacter':
          if (a.charData) {
            const el = document.querySelector(
              '.character-overlay[data-character-id="' + a.charData.id.replace(/"/g, '\\"') + '"]'
            );
            if (el && el.parentNode) el.parentNode.removeChild(el);
            const chars = loadCharacters().filter((c) => c.id !== a.charData.id);
            saveCharacters(chars);
          }
          break;
        case 'deletePanel':
          if (a.panelEl && a.panelEl.parentNode) {
            // Remember reference & anchor for next undo.
            a.parent = a.panelEl.parentNode;
            a.anchorNextSibling = a.panelEl.nextSibling;
            a.panelEl.parentNode.removeChild(a.panelEl);
            const list = loadDeletedPanels();
            if (list.indexOf(a.panelId) === -1) list.push(a.panelId);
            saveDeletedPanels(list);
            refreshPanelSelect();
            renderPanelList();
            if (window.Comic.ScrollManager && window.Comic.ScrollManager.refresh) {
              window.Comic.ScrollManager.refresh();
            }
          }
          break;
        case 'reorderPanels':
          applyPanelOrderList(a.after);
          savePanelOrder(a.after);
          renderPanelList();
          break;
        case 'addPanel':
          // Redo: volver a insertar el panel + persistir en extras.
          if (a.panelData && a.chapterId) {
            addExtraPanelToStorage(a.chapterId, a.panelData);
            const newPanel = insertPanelIntoDom(a.panelData, a.chapterId, null);
            if (newPanel) {
              savePanelOrder(getCurrentPanelOrder());
              refreshPanelSelect();
              renderPanelList();
              if (window.Comic.ScrollManager && window.Comic.ScrollManager.refresh) {
                window.Comic.ScrollManager.refresh();
              }
            }
          }
          break;
        default: break;
      }
    }

    return {
      push: push,
      undo: undo,
      redo: redo,
      canUndo: () => undoStack.length > 0,
      canRedo: () => redoStack.length > 0,
      isApplying: () => applying,
    };
  })();

  // ---- Edit mode gating ------------------------------------------------------
  function isEditUnlocked() {
    try { return sessionStorage.getItem(AUTH_KEY) === 'ok'; } catch (e) { return false; }
  }

  function setEditUnlocked(val) {
    try {
      if (val) sessionStorage.setItem(AUTH_KEY, 'ok');
      else sessionStorage.removeItem(AUTH_KEY);
    } catch (e) { /* ignore */ }
    document.documentElement.classList.toggle('edit-mode-unlocked', !!val);
    applyEditableClass();
  }

  function applyEditableClass() {
    const enabled = isEditUnlocked() && isOpen;
    document.documentElement.classList.toggle('editor-open', isOpen);
    const all = document.querySelectorAll('.bubble, .character-overlay');
    all.forEach((el) => {
      // touchAction: still need to disable touch panning on draggable elements
      // when editor is enabled (so pointerdown drag works).
      el.style.touchAction = enabled ? 'none' : '';
      // Make sure no stale .is-editable is left over — only the selected
      // element gets that look-and-feel now.
      if (!enabled) {
        el.classList.remove('is-editable');
        el.classList.remove('is-selected');
      } else if (!el.classList.contains('is-selected')) {
        el.classList.remove('is-editable');
      }
    });
    if (!enabled) {
      // Hide selection-dependent editor controls.
      updateSelectionEditorControls(null);
    }
  }

  // ---- Selection -------------------------------------------------------------
  function getSelectedBubble() {
    return document.querySelector('.bubble.is-selected, .character-overlay.is-selected');
  }

  function selectBubble(el) {
    // Clear previous selection.
    const prev = document.querySelectorAll('.bubble.is-selected, .character-overlay.is-selected');
    prev.forEach((n) => {
      n.classList.remove('is-selected');
      n.classList.remove('is-editable');
    });
    if (el) {
      el.classList.add('is-selected');
      el.classList.add('is-editable');
      // Ensure drag/resize/delete are bound (idempotent).
      attachDragHandler(el);
      // Sync editor inputs to this element.
      syncEditorToSelection(el);
      updateSelectionEditorControls(el);
    } else {
      updateSelectionEditorControls(null);
    }
  }

  function syncEditorToSelection(el) {
    if (!el) return;
    // Panel select → containing panel.
    const panel = el.closest('.panel');
    if (panel && panelSelect) {
      const pid = panel.dataset.panelId;
      if (pid && panelSelect.value !== pid) {
        const opt = Array.from(panelSelect.options).find((o) => o.value === pid);
        if (opt) panelSelect.value = pid;
      }
    }
    // Speaker select.
    if (speakerSelect && el.dataset.speaker) {
      const opt = Array.from(speakerSelect.options).find((o) => o.value === el.dataset.speaker);
      if (opt) speakerSelect.value = el.dataset.speaker;
    }
    // Text area (bubble only).
    if (textArea && !el.classList.contains('character-overlay')) {
      const fullText = el.dataset.fullText || '';
      // Avoid feedback loops with the input listener.
      if (textArea.value !== fullText) textArea.value = fullText;
    }
    // Position grid.
    if (panelEl) {
      const posName = el.dataset.position || '';
      panelEl.querySelectorAll('.be-pos-cell').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.pos === posName);
      });
    }
    // Font slider.
    syncFontSliderToBubble(el);
    // Timing inputs.
    syncTimingInputsToBubble(el);
    // Bubble type select.
    if (panelEl) {
      const typeSel = panelEl.querySelector('.be-bubble-type');
      if (typeSel && !el.classList.contains('character-overlay')) {
        const t = el.dataset.bubbleType
          || (el.classList.contains('bubble-narration') || el.classList.contains('narration') ? 'narration' : 'speech');
        typeSel.value = t;
      }
    }
    // Side buttons (left / right).
    if (!el.classList.contains('character-overlay')) syncSideButtonsToBubble(el);
    // Per-bubble audio status.
    syncBubbleAudioStatus(el);
  }

  function syncBubbleAudioStatus(el) {
    if (!panelEl) return;
    const statusEl = panelEl.querySelector('.be-bubble-audio-status');
    if (!statusEl) return;
    if (!el || el.classList.contains('character-overlay')) {
      statusEl.textContent = 'Sin audio.';
      return;
    }
    const src = getBubbleAudioSrc(el);
    statusEl.textContent = src
      ? '🎵 Audio asignado a esta burbuja.'
      : 'Sin audio.';
  }

  function syncTimingInputsToBubble(el) {
    if (!panelEl || !el) return;
    const seqInput = panelEl.querySelector('.be-bubble-seq');
    const delayInput = panelEl.querySelector('.be-bubble-delay');
    if (el.classList.contains('character-overlay')) {
      if (seqInput) seqInput.value = '';
      if (delayInput) delayInput.value = '';
      return;
    }
    const t = getBubbleTiming(el);
    if (seqInput) seqInput.value = (t.sequence == null ? '' : String(t.sequence));
    if (delayInput) {
      // Show empty if it's the default; lets the user re-enable explicit value.
      const hasExplicit = el.dataset.delayAfter != null && el.dataset.delayAfter !== '';
      delayInput.value = hasExplicit ? String(t.delayAfter) : '';
    }
  }

  // Show/hide editor sub-sections that only make sense when something is selected.
  function updateSelectionEditorControls(el) {
    if (!panelEl) return;
    const hasSel = !!el;
    const sel = panelEl.querySelectorAll('.be-selection-only');
    sel.forEach((node) => {
      node.style.display = hasSel ? '' : 'none';
    });
  }

  // Click on empty area / panel background → clear selection. Bubble clicks
  // are handled by the per-element pointerdown handler (which calls selectBubble).
  function onGlobalClickForSelection(e) {
    if (!isEditUnlocked() || !isOpen) return;
    // Ignore clicks inside the editor panel UI or password modal.
    if (panelEl && panelEl.contains(e.target)) return;
    if (pwModal && pwModal.contains(e.target)) return;
    if (toggleBtn && toggleBtn.contains(e.target)) return;
    const hit = e.target.closest('.bubble, .character-overlay');
    if (!hit) {
      selectBubble(null);
    }
  }

  // ---- Bubble timing (sequence + delay-after) ------------------------------
  function loadTiming() { return loadJSON(TIMING_KEY, {}); }
  function saveTiming(d) { saveJSON(TIMING_KEY, d); }

  function getBubbleTiming(el) {
    if (!el) return { sequence: null, delayAfter: DEFAULT_DELAY_AFTER };
    const seq = parseFloat(el.dataset.sequence);
    const da = parseInt(el.dataset.delayAfter, 10);
    return {
      sequence: isNaN(seq) ? null : seq,
      delayAfter: isNaN(da) ? DEFAULT_DELAY_AFTER : da,
    };
  }

  function setBubbleTiming(el, sequence, delayAfter) {
    if (!el || !el.dataset.bubbleId) return;
    if (sequence == null || sequence === '') {
      delete el.dataset.sequence;
    } else {
      el.dataset.sequence = String(sequence);
    }
    if (delayAfter == null || delayAfter === '') {
      delete el.dataset.delayAfter;
    } else {
      el.dataset.delayAfter = String(delayAfter);
    }
    const map = loadTiming();
    const entry = { };
    if (sequence != null && sequence !== '' && !isNaN(parseFloat(sequence))) {
      entry.sequence = parseFloat(sequence);
    }
    if (delayAfter != null && delayAfter !== '' && !isNaN(parseInt(delayAfter, 10))) {
      entry.delayAfter = parseInt(delayAfter, 10);
    }
    if (Object.keys(entry).length === 0) {
      delete map[el.dataset.bubbleId];
    } else {
      map[el.dataset.bubbleId] = entry;
    }
    saveTiming(map);
  }

  function applyStoredTiming() {
    const map = loadTiming();
    Object.keys(map).forEach((id) => {
      const el = document.querySelector('.bubble[data-bubble-id="' + id.replace(/"/g, '\\"') + '"]');
      if (!el) return;
      const t = map[id] || {};
      if (typeof t.sequence === 'number') el.dataset.sequence = String(t.sequence);
      if (typeof t.delayAfter === 'number') el.dataset.delayAfter = String(t.delayAfter);
    });
  }

  // ---- Text overrides for original bubbles ----------------------------------
  function loadTextOverrides() { return loadJSON(TEXT_OVERRIDES_KEY, {}); }
  function saveTextOverrides(d) { saveJSON(TEXT_OVERRIDES_KEY, d); }

  function applyTextToBubble(el, newText) {
    if (!el) return;
    el.dataset.fullText = newText;
    const inner = el.querySelector('.dialogue__text');
    if (inner) {
      inner.dataset.fullText = newText;
      const typed = inner.querySelector('.tw-typed');
      const rest = inner.querySelector('.tw-rest');
      if (typed) typed.textContent = '';
      if (rest) rest.textContent = newText;
    } else {
      // Fallback for shapes without the typewriter structure.
      const p = el.querySelector('p');
      if (p) p.textContent = newText;
      else el.textContent = newText;
    }
    // Keep .bubble--empty in sync so empty bubbles stay hidden outside edit mode.
    if ((newText || '').trim()) {
      el.classList.remove('bubble--empty');
    } else {
      el.classList.add('bubble--empty');
    }
  }

  function persistTextChange(el, newText) {
    if (!el) return;
    const panel = el.closest('.panel');
    const panelId = panel ? panel.dataset.panelId : null;
    const bubbleId = el.dataset.bubbleId || '';
    if (el.dataset.userAdded === 'true' && panelId && bubbleId) {
      const data = loadStored();
      const list = data[panelId] || [];
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === bubbleId) {
          list[i].text = newText;
          break;
        }
      }
      data[panelId] = list;
      saveStored(data);
    } else if (bubbleId) {
      const map = loadTextOverrides();
      map[bubbleId] = newText;
      saveTextOverrides(map);
    }
  }

  function applyStoredTextOverrides() {
    const map = loadTextOverrides();
    Object.keys(map).forEach((id) => {
      const el = document.querySelector('.bubble[data-bubble-id="' + id.replace(/"/g, '\\"') + '"]');
      if (el) applyTextToBubble(el, map[id]);
    });
  }

  // ---- Per-bubble audio ----------------------------------------------------
  function loadBubbleAudio() { return loadJSON(BUBBLE_AUDIO_KEY, {}); }
  function saveBubbleAudio(d) { saveJSON(BUBBLE_AUDIO_KEY, d); }

  // Resolve the audio source for a given bubble: prefers the dedicated
  // overrides map; falls back to user-added bubble JSON entry.
  function getBubbleAudioSrc(el) {
    if (!el) return null;
    const id = el.dataset.bubbleId;
    if (!id) return null;
    const map = loadBubbleAudio();
    if (map[id]) return map[id];
    if (el.dataset.userAdded === 'true') {
      const panel = el.closest('.panel');
      const panelId = panel ? panel.dataset.panelId : null;
      if (!panelId) return null;
      const list = (loadStored()[panelId]) || [];
      const entry = list.find((b) => b.id === id);
      return (entry && entry.audio) || null;
    }
    return null;
  }

  function persistBubbleAudio(el, dataURL) {
    if (!el || !el.dataset.bubbleId) return;
    const id = el.dataset.bubbleId;
    if (el.dataset.userAdded === 'true') {
      const panel = el.closest('.panel');
      const panelId = panel ? panel.dataset.panelId : null;
      if (panelId) {
        const data = loadStored();
        const list = data[panelId] || [];
        for (let i = 0; i < list.length; i++) {
          if (list[i].id === id) {
            if (dataURL) list[i].audio = dataURL;
            else delete list[i].audio;
            break;
          }
        }
        data[panelId] = list;
        saveStored(data);
      }
    } else {
      const map = loadBubbleAudio();
      if (dataURL) map[id] = dataURL;
      else delete map[id];
      saveBubbleAudio(map);
    }
    if (dataURL) el.dataset.audio = dataURL;
    else delete el.dataset.audio;
  }

  function applyStoredBubbleAudio() {
    // Original bubbles → from BUBBLE_AUDIO_KEY map.
    const map = loadBubbleAudio();
    Object.keys(map).forEach((id) => {
      const el = document.querySelector('.bubble[data-bubble-id="' + id.replace(/"/g, '\\"') + '"]');
      if (el) el.dataset.audio = map[id];
    });
    // User-added bubbles → from their JSON entry.
    const stored = loadStored();
    Object.keys(stored).forEach((panelId) => {
      (stored[panelId] || []).forEach((b) => {
        if (!b.audio || !b.id) return;
        const el = document.querySelector('.bubble[data-bubble-id="' + b.id.replace(/"/g, '\\"') + '"]');
        if (el) el.dataset.audio = b.audio;
      });
    });
  }

  // ---- Password modal --------------------------------------------------------
  let pwModal = null;
  let pwInput = null;
  let pwError = null;

  function buildPasswordModal() {
    if (pwModal) return;
    pwModal = document.createElement('div');
    pwModal.id = 'password-modal';
    pwModal.className = 'password-modal';
    pwModal.setAttribute('aria-hidden', 'true');
    pwModal.innerHTML =
      '<div class="password-modal__backdrop"></div>' +
      '<div class="password-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="pw-modal-title">' +
        '<h2 id="pw-modal-title" class="password-modal__title">Modo edición</h2>' +
        '<input type="password" class="password-modal__input" placeholder="Contraseña" autocomplete="off" />' +
        '<p class="password-modal__error" aria-live="polite"></p>' +
        '<div class="password-modal__actions">' +
          '<button type="button" class="password-modal__cancel">Cancelar</button>' +
          '<button type="button" class="password-modal__submit">Entrar</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(pwModal);
    pwInput = pwModal.querySelector('.password-modal__input');
    pwError = pwModal.querySelector('.password-modal__error');

    pwModal.querySelector('.password-modal__submit').addEventListener('click', onPasswordSubmit);
    pwModal.querySelector('.password-modal__cancel').addEventListener('click', closePasswordModal);
    pwModal.querySelector('.password-modal__backdrop').addEventListener('click', closePasswordModal);

    pwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onPasswordSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePasswordModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (pwModal && pwModal.classList.contains('is-open') && e.key === 'Escape') {
        closePasswordModal();
      }
    });
  }

  function openPasswordModal() {
    buildPasswordModal();
    pwModal.classList.add('is-open');
    pwModal.setAttribute('aria-hidden', 'false');
    if (pwError) pwError.textContent = '';
    if (pwInput) {
      pwInput.value = '';
      setTimeout(() => pwInput.focus(), 30);
    }
  }

  function closePasswordModal() {
    if (!pwModal) return;
    pwModal.classList.remove('is-open');
    pwModal.setAttribute('aria-hidden', 'true');
  }

  function onPasswordSubmit() {
    if (!pwInput) return;
    const v = pwInput.value;
    if (v === EDIT_PASSWORD) {
      setEditUnlocked(true);
      closePasswordModal();
      open(); // open editor side panel
    } else {
      if (pwError) pwError.textContent = 'Contraseña incorrecta';
      pwInput.classList.remove('shake');
      // force reflow to restart animation
      void pwInput.offsetWidth;
      pwInput.classList.add('shake');
      setTimeout(() => pwInput && pwInput.classList.remove('shake'), 400);
    }
  }

  // ---- Bubble creation (user-added) ------------------------------------------
  function storeBubble(panelId, bubble) {
    const data = loadStored();
    if (!data[panelId]) data[panelId] = [];
    data[panelId].push(bubble);
    saveStored(data);
  }

  function clearStoredFor(panelId) {
    const data = loadStored();
    delete data[panelId];
    saveStored(data);
  }

  function ensureBubbleId(el, panel) {
    if (el.dataset.bubbleId) return el.dataset.bubbleId;
    // For user-added bubbles, generate an id.
    const panelId = panel ? panel.dataset.panelId : 'p';
    const idx = panel
      ? panel.querySelectorAll('.bubble[data-user-added="true"]').length
      : 0;
    const id = panelId + '-u' + idx + '-' + Date.now().toString(36);
    el.dataset.bubbleId = id;
    return id;
  }

  function makeBubbleElement(bubble, panelId) {
    const wrapper = document.createElement('div');
    const type = bubble.type || 'speech';
    const isNarration = type === 'narration';
    const pos = bubble.position || (isNarration ? 'bottom-center' : 'bottom-left');
    const posClass = pos === 'top-left'   ? 'bubble-top-left'
      : pos === 'top-right'  ? 'bubble-top-right'
      : (pos === 'left' || pos === 'bottom-left')  ? 'bubble-left'
      : (pos === 'right' || pos === 'bottom-right') ? 'bubble-right'
      : 'bubble-center';
    if (isNarration) {
      wrapper.className = 'bubble bubble-narration narration dialogue dialogue--narration dialogue--user bubble-type-narration';
    } else {
      wrapper.className = 'bubble ' + posClass + ' dialogue dialogue--' + pos + ' dialogue--user bubble-type-' + type;
    }
    wrapper.dataset.speaker = bubble.speaker || '';
    wrapper.dataset.userAdded = 'true';
    wrapper.dataset.position = pos;
    wrapper.dataset.bubbleType = type;
    wrapper.style.opacity = '0';
    wrapper.style.position = 'absolute';

    const defaults = (window.Comic.PanelLoader && window.Comic.PanelLoader.POSITION_DEFAULTS) || {};
    const def = isNarration
      ? (defaults['narrator'] || { x: 50, y: 85, w: 80 })
      : (defaults[pos] || { x: 15, y: 75 });
    const x = (typeof bubble.x === 'number') ? bubble.x : def.x;
    const y = (typeof bubble.y === 'number') ? bubble.y : def.y;
    wrapper.style.left = x + '%';
    wrapper.style.top = y + '%';
    if (isNarration) {
      const w = (typeof bubble.width === 'number') ? bubble.width : (def.w || 80);
      wrapper.style.width = w + '%';
    }

    // Generate an id so positions can be persisted.
    const id = bubble.id || (panelId + '-u' + Date.now().toString(36));
    wrapper.dataset.bubbleId = id;
    wrapper.dataset.fullText = bubble.text || '';
    if (bubble.audio) wrapper.dataset.audio = bubble.audio;

    const fullText = escapeHtml(bubble.text || '');
    wrapper.innerHTML =
      '<p class="dialogue__text" data-full-text="' + fullText + '">' +
      '<span class="tw-typed dialogue__typed"></span>' +
      '<span class="caret">|</span>' +
      '<span class="tw-rest" aria-hidden="true">' + fullText + '</span>' +
      '</p>';
    return wrapper;
  }

  // ---- Universal drag (bubbles + characters) ---------------------------------
  function getDragParent(el) {
    // Drag relative to nearest .panel__media (or fall back to .panel).
    return el.closest('.panel__media') || el.closest('.panel') || el.parentElement;
  }

  function startDrag(el, e, initialOffset) {
    if (!isEditUnlocked() || !isOpen) return;
    if (e.button != null && e.button !== 0) return;
    // Don't start a drag if the user grabbed a resize handle.
    if (e.target && e.target.closest && e.target.closest('.resize-handle')) return;
    const parent = getDragParent(el);
    if (!parent) return;

    const rect = el.getBoundingClientRect();
    const point = (e.touches && e.touches[0]) || e;
    // Offset from element CENTER (because CSS uses transform: translate(-50%, -50%))
    let grabOffsetX = point.clientX - (rect.left + rect.width / 2);
    let grabOffsetY = point.clientY - (rect.top + rect.height / 2);
    if (initialOffset && typeof initialOffset.x === 'number') {
      grabOffsetX = initialOffset.x;
      grabOffsetY = initialOffset.y;
    }

    const clamp = (v) => Math.max(0, Math.min(100, v));

    // Capture "before" state for history at the start of the drag.
    const beforePos = { left: el.style.left || '', top: el.style.top || '' };
    let movedAny = false;

    el.style.position = 'absolute';
    // Neutralize any active CSS animation that would override left/top during drag.
    el.style.animation = 'none';
    el.style.willChange = 'left, top';
    el.classList.add('dragging');
    el.dataset.placed = '1';
    el.classList.add('bubble--placed');
    e.preventDefault();

    let pendingX = null;
    let pendingY = null;
    let rafScheduled = false;

    function flush() {
      rafScheduled = false;
      if (pendingX != null) el.style.left = pendingX + '%';
      if (pendingY != null) el.style.top = pendingY + '%';
    }

    function onMove(ev) {
      const p = (ev.touches && ev.touches[0]) || ev;
      const r = parent.getBoundingClientRect();
      const centerX = p.clientX - grabOffsetX;
      const centerY = p.clientY - grabOffsetY;
      pendingX = clamp(((centerX - r.left) / r.width) * 100);
      pendingY = clamp(((centerY - r.top) / r.height) * 100);
      movedAny = true;
      if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(flush);
      }
    }

    function onUp() {
      el.classList.remove('dragging');
      el.style.willChange = '';
      // Leave el.style.animation = 'none' so the panel's enter animation does not re-fire.
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);

      // Persist final position (relative to .panel__media), measured at element CENTER.
      const finalRect = el.getBoundingClientRect();
      const r = parent.getBoundingClientRect();
      const xPct = clamp(((finalRect.left + finalRect.width / 2 - r.left) / r.width) * 100);
      const yPct = clamp(((finalRect.top + finalRect.height / 2 - r.top) / r.height) * 100);
      el.style.left = xPct + '%';
      el.style.top = yPct + '%';
      el.dataset.x = xPct.toFixed(2);
      el.dataset.y = yPct.toFixed(2);

      persistElementPosition(el, xPct, yPct);

      if (movedAny) {
        const afterPos = { left: el.style.left || '', top: el.style.top || '' };
        if (afterPos.left !== beforePos.left || afterPos.top !== beforePos.top) {
          History.push({ type: 'move', el: el, before: beforePos, after: afterPos });
        }
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function persistElementPosition(el, xPct, yPct) {
    if (el.classList.contains('character-overlay')) {
      const id = el.dataset.characterId;
      if (!id) return;
      if (el.dataset.userAdded === 'true') {
        // Update the entry in CHAR_KEY records too.
        updateStoredCharacter(el);
        return;
      }
      const map = loadCharPos();
      map[id] = { x: xPct, y: yPct };
      saveCharPos(map);
      return;
    }

    // bubble
    const panel = el.closest('.panel');
    const panelId = panel ? panel.dataset.panelId : null;
    if (el.dataset.userAdded === 'true' && panelId) {
      // Update user-added store by id.
      const data = loadStored();
      const list = data[panelId] || [];
      const id = el.dataset.bubbleId;
      let found = false;
      for (let i = 0; i < list.length; i++) {
        if (list[i].id === id) {
          list[i].x = xPct;
          list[i].y = yPct;
          found = true;
          break;
        }
      }
      if (!found) {
        // Fallback: positional by sibling index among user-added bubbles.
        const siblings = panel
          ? Array.from(panel.querySelectorAll('.bubble[data-user-added="true"]'))
          : [];
        const idx = siblings.indexOf(el);
        if (idx >= 0 && list[idx]) {
          list[idx].x = xPct;
          list[idx].y = yPct;
        }
      }
      data[panelId] = list;
      saveStored(data);
      return;
    }

    // Original bubble (from chapter JSON) — persist into BUBBLE_POS_KEY by data-bubble-id.
    const id = el.dataset.bubbleId;
    if (!id) return;
    const map = loadBubblePos();
    map[id] = { x: xPct, y: yPct };
    saveBubblePos(map);
  }

  function attachDragHandler(el) {
    if (el.dataset.dragBound === '1') {
      ensureResizeHandles(el);
      ensureDeleteButton(el);
      return;
    }
    // Strict selector: only true .bubble and .character-overlay elements.
    if (!el.classList.contains('bubble') && !el.classList.contains('character-overlay')) {
      return;
    }
    el.dataset.dragBound = '1';
    el.addEventListener('pointerdown', function (e) {
      if (!isEditUnlocked() || !isOpen) return;
      // Ignore pointerdowns on internal interactive children.
      if (e.target && e.target.closest && e.target.closest('.be-bubble-del, .resize-handle')) return;
      // Block browser text selection / drag-image so pointermove reaches us.
      e.preventDefault();
      // Select immediately on pointerdown.
      selectBubble(el);
      // Pre-compute grab offset from element CENTER (CSS centers via translate(-50%,-50%)).
      const point = (e.touches && e.touches[0]) || e;
      const rect = el.getBoundingClientRect();
      const initialOffset = {
        x: point.clientX - (rect.left + rect.width / 2),
        y: point.clientY - (rect.top + rect.height / 2),
      };
      // Start dragging immediately — no movement threshold. Even a tiny mouse
      // wobble lands at the same spot; a real drag follows naturally.
      startDrag(el, e, initialOffset);
    });
    ensureResizeHandles(el);
    ensureDeleteButton(el);
  }

  function ensureDeleteButton(el) {
    if (el.dataset.deleteBound === '1') return;
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') return; // characters get their own delete via list / clearAdded
    el.dataset.deleteBound = '1';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'be-bubble-del';
    btn.setAttribute('aria-label', 'Eliminar burbuja');
    btn.textContent = '×';
    btn.style.cssText =
      'position:absolute;top:-10px;right:-10px;width:22px;height:22px;border:0;border-radius:50%;' +
      'background:#d33;color:#fff;font-weight:700;font-size:14px;line-height:20px;padding:0;' +
      'cursor:pointer;z-index:30;display:none;box-shadow:0 1px 4px rgba(0,0,0,0.3);';
    btn.addEventListener('pointerdown', (e) => { e.stopPropagation(); });
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isEditUnlocked() || !isOpen) return;
      if (!confirm('¿Eliminar esta burbuja? Puedes deshacerlo con Ctrl+Z.')) return;
      removeBubble(el, true);
    });
    el.appendChild(btn);
    // Show only when editable; relies on .is-editable class.
    const obs = () => { btn.style.display = el.classList.contains('is-editable') ? 'block' : 'none'; };
    obs();
    // Toggle via a MutationObserver on class changes (cheap, scoped).
    try {
      new MutationObserver(obs).observe(el, { attributes: true, attributeFilter: ['class'] });
    } catch (_) {}
  }

  function removeBubble(el, recordHistory) {
    if (!el || !el.parentNode) return;
    const panel = el.closest('.panel');
    const panelId = panel ? panel.dataset.panelId : null;
    const bubbleId = el.dataset.bubbleId || '';
    const userAdded = el.dataset.userAdded === 'true';
    const parent = el.parentNode;
    const anchorNextSibling = el.nextSibling;
    const html = el.outerHTML;

    let bubbleData = null;
    if (userAdded && panelId) {
      const data = loadStored();
      const list = data[panelId] || [];
      bubbleData = list.find((b) => b.id === bubbleId) || null;
      data[panelId] = list.filter((b) => b.id !== bubbleId);
      saveStored(data);
    } else if (bubbleId) {
      // Mark original bubble as deleted.
      el.dataset.deleted = '1';
      const deleted = loadDeletedBubbles();
      if (deleted.indexOf(bubbleId) === -1) {
        deleted.push(bubbleId);
        saveDeletedBubbles(deleted);
      }
    }

    parent.removeChild(el);

    if (recordHistory !== false) {
      History.push({
        type: 'deleteBubble',
        el: el,
        parent: parent,
        anchorNextSibling: anchorNextSibling,
        panelId: panelId,
        bubbleId: bubbleId,
        userAdded: userAdded,
        html: html,
        bubbleData: bubbleData ? Object.assign({}, bubbleData) : null,
      });
    }
  }

  function restoreBubble(html, parentSelector, beforeBubbleId) {
    const parent = document.querySelector(parentSelector);
    if (!parent || !html) return null;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const node = tmp.firstElementChild;
    if (!node) return null;
    delete node.dataset.dragBound;
    delete node.dataset.resizeBound;
    delete node.dataset.deleteBound;
    delete node.dataset.deleted;
    node.querySelectorAll('.be-bubble-del, .resize-handle').forEach((n) => n.remove());
    const anchor = beforeBubbleId
      ? parent.querySelector('.bubble[data-bubble-id="' + beforeBubbleId.replace(/"/g, '\\"') + '"]')
      : null;
    if (anchor) parent.insertBefore(node, anchor);
    else parent.appendChild(node);
    attachDragHandler(node);
    applyEditableClass();
    return node;
  }

  function bindAllDraggables() {
    // Strict: only bubbles and character overlays. Never headers, captions, intros.
    document.querySelectorAll('.bubble, .character-overlay').forEach((el) => attachDragHandler(el));
  }

  // ---- Resize handles --------------------------------------------------------
  const HANDLE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  const MIN_SIZE = 60;

  function ensureResizeHandles(el) {
    if (el.dataset.resizeBound === '1') return;
    el.dataset.resizeBound = '1';
    // For <img> character overlays we can't inject children directly. Use the
    // image's parent and absolutely position handles relative to the image.
    // Simpler: wrap behavior — for both bubbles (divs) and img, we attach
    // handles to the element if it can contain children, otherwise to its parent.
    if (el.tagName === 'IMG' || el.tagName === 'VIDEO') {
      // Use pointer-based resize without inner handles: track edges via parent overlay
      // We still need a stable surface for the user to grab — use small absolute
      // handles appended to the parent and synced by JS.
      attachExternalImageHandles(el);
      return;
    }
    HANDLE_DIRS.forEach((dir) => {
      const h = document.createElement('span');
      h.className = 'resize-handle resize-handle--' + dir;
      h.dataset.dir = dir;
      // Prevent the handle from being typed-into or selected.
      h.setAttribute('aria-hidden', 'true');
      h.addEventListener('pointerdown', function (e) {
        if (!isEditUnlocked() || !isOpen) return;
        e.stopPropagation();
        startResize(el, dir, e);
      });
      el.appendChild(h);
    });
  }

  function attachExternalImageHandles(img) {
    // For <img>, intercept pointerdown BEFORE the drag handler to detect
    // proximity to a corner — within ~24px of a corner → resize from that
    // corner. Otherwise the event bubbles and drag fires normally.
    const CORNER_RADIUS = 24;
    img.addEventListener('pointerdown', function (e) {
      if (!isEditUnlocked() || !isOpen) return;
      if (!img.classList.contains('is-selected')) return; // require selection first
      const rect = img.getBoundingClientRect();
      const corners = {
        nw: { x: rect.left, y: rect.top },
        ne: { x: rect.right, y: rect.top },
        sw: { x: rect.left, y: rect.bottom },
        se: { x: rect.right, y: rect.bottom },
      };
      let bestDir = null;
      let bestDist = CORNER_RADIUS * CORNER_RADIUS;
      Object.keys(corners).forEach((d) => {
        const dx = e.clientX - corners[d].x;
        const dy = e.clientY - corners[d].y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) { bestDist = dist; bestDir = d; }
      });
      if (bestDir) {
        e.stopPropagation();
        e.preventDefault();
        startResize(img, bestDir, e);
      }
    }, true); // capture phase: runs before the drag handler
  }

  function startResize(el, dir, e) {
    if (e.button != null && e.button !== 0) return;
    e.preventDefault();
    const parent = getDragParent(el);
    if (!parent) return;
    const startRect = el.getBoundingClientRect();
    const point = (e.touches && e.touches[0]) || e;
    const startX = point.clientX;
    const startY = point.clientY;
    const startW = startRect.width;
    const startH = startRect.height;
    const parentRect = parent.getBoundingClientRect();
    const maxW = parentRect.width;
    const maxH = parentRect.height;

    // Capture "before" size for history (use current rendered size).
    const beforeSize = { w: Math.round(startW), h: Math.round(startH) };
    let resizedAny = false;

    el.classList.add('resizing');
    el.style.willChange = 'width, height';
    // Neutralize animation that could fight inline width/height.
    el.style.animation = 'none';
    // Bypass CSS max-width/max-height caps so user-driven size wins.
    el.style.maxWidth = 'none';
    el.style.maxHeight = 'none';
    el.dataset.placed = '1';
    el.classList.add('bubble--placed');

    let pendingW = null;
    let pendingH = null;
    let scheduled = false;

    function flush() {
      scheduled = false;
      if (pendingW != null) el.style.width = pendingW + 'px';
      if (pendingH != null) el.style.height = pendingH + 'px';
    }

    // Aspect-ratio behavior:
    //   - Media characters (img/video): corners are proportional BY DEFAULT;
    //     hold Shift to free-resize. Edge handles (n/s/e/w) are always free.
    //   - Bubbles: corners are free BY DEFAULT; hold Shift to lock aspect.
    const isCorner = dir.length === 2;
    const isMedia = el.tagName === 'IMG' || el.tagName === 'VIDEO';
    const aspect = (startH > 0) ? (startW / startH) : 1;

    function onMove(ev) {
      const p = (ev.touches && ev.touches[0]) || ev;
      const dx = p.clientX - startX;
      const dy = p.clientY - startY;
      let w = startW;
      let h = startH;
      if (dir.indexOf('e') !== -1) w = startW + dx;
      if (dir.indexOf('w') !== -1) w = startW - dx;
      if (dir.indexOf('s') !== -1) h = startH + dy;
      if (dir.indexOf('n') !== -1) h = startH - dy;
      w = Math.max(MIN_SIZE, Math.min(maxW, w));
      h = Math.max(MIN_SIZE, Math.min(maxH, h));
      // For pure horizontal handles (e/w) keep height; for vertical (n/s) keep width.
      if (dir === 'e' || dir === 'w') h = null;
      if (dir === 'n' || dir === 's') w = null;

      // Proportional resize on corners.
      const shift = !!(ev.shiftKey || (ev.touches && ev.touches.length > 1));
      const proportional = isCorner && (isMedia ? !shift : shift);
      if (proportional && w != null && h != null) {
        // Pick the dominant axis (whichever moved more relative to start).
        const dW = Math.abs(w - startW);
        const dH = Math.abs(h - startH);
        if (dW * (1 / Math.max(0.01, aspect)) >= dH) {
          h = w / aspect;
        } else {
          w = h * aspect;
        }
        w = Math.max(MIN_SIZE, Math.min(maxW, w));
        h = Math.max(MIN_SIZE, Math.min(maxH, h));
      }

      pendingW = w;
      pendingH = h;
      resizedAny = true;
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(flush);
      }
    }

    function onUp() {
      el.classList.remove('resizing');
      el.style.willChange = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);

      // Auto-fit font-size so text fits in new dimensions (bubbles only).
      if (!el.classList.contains('character-overlay')) {
        autoFitBubbleFont(el);
      }

      const finalRect = el.getBoundingClientRect();
      el.dataset.w = finalRect.width.toFixed(0);
      el.dataset.h = finalRect.height.toFixed(0);
      persistElementSize(el, finalRect.width, finalRect.height);

      if (resizedAny) {
        const afterSize = { w: Math.round(finalRect.width), h: Math.round(finalRect.height) };
        if (afterSize.w !== beforeSize.w || afterSize.h !== beforeSize.h) {
          History.push({ type: 'resize', el: el, before: beforeSize, after: afterSize });
        }
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ---- Font size control ---------------------------------------------------
  function loadFontSizes() { return loadJSON(FONT_SIZE_KEY, {}); }
  function saveFontSizes(d) { saveJSON(FONT_SIZE_KEY, d); }

  function setBubbleFontSize(el, px) {
    if (!el || !el.dataset.bubbleId) return;
    const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(px)));
    el.style.fontSize = clamped + 'px';
    const map = loadFontSizes();
    map[el.dataset.bubbleId] = clamped;
    saveFontSizes(map);
  }

  // Auto-fit (bidirectional): binary search for the largest font-size whose
  // text content fits within the bubble's current dimensions. Only meaningful
  // when the bubble has an explicit width/height (otherwise the element grows
  // with its content and overflow is impossible to detect).
  function autoFitBubbleFont(el) {
    if (!el) return;
    const hasFixedWidth = el.style.width && el.style.width !== '';
    const hasFixedHeight = el.style.height && el.style.height !== '';
    if (!hasFixedWidth && !hasFixedHeight) {
      return parseFloat(getComputedStyle(el).fontSize) || 22;
    }
    // Read available inner box (subtract padding).
    const cs = getComputedStyle(el);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const box = el.getBoundingClientRect();
    const innerW = Math.max(20, box.width - padX);
    const innerH = Math.max(20, box.height - padY);

    // Extract the full text (prefer data-full-text, then .tw-rest+typed combined).
    let fullText = el.dataset.fullText;
    if (!fullText) {
      const typed = el.querySelector('.tw-typed');
      const rest = el.querySelector('.tw-rest');
      fullText = ((typed && typed.textContent) || '') + ((rest && rest.textContent) || '');
    }
    if (!fullText) fullText = el.textContent || '';

    // Measure with an off-screen ghost that mirrors the typographic rules but
    // has the target inner width so we can compare height honestly.
    const ghost = document.createElement('div');
    ghost.style.cssText =
      'position:absolute;visibility:hidden;left:-9999px;top:0;' +
      'white-space:normal;word-wrap:break-word;overflow-wrap:break-word;' +
      'box-sizing:border-box;padding:0;margin:0;border:0;';
    ghost.style.width = innerW + 'px';
    ghost.style.fontFamily = cs.fontFamily;
    ghost.style.fontWeight = cs.fontWeight;
    ghost.style.fontStyle = cs.fontStyle;
    ghost.style.letterSpacing = cs.letterSpacing;
    ghost.style.lineHeight = cs.lineHeight;
    ghost.textContent = fullText;
    document.body.appendChild(ghost);

    let lo = MIN_FONT_SIZE, hi = MAX_FONT_SIZE, best = MIN_FONT_SIZE;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      ghost.style.fontSize = mid + 'px';
      void ghost.offsetHeight; // force reflow
      const fits = ghost.offsetHeight <= innerH && ghost.scrollWidth <= innerW;
      if (fits) { best = mid; lo = mid + 1; } else { hi = mid - 1; }
    }
    document.body.removeChild(ghost);

    el.style.fontSize = best + 'px';
    setBubbleFontSize(el, best);
    syncFontSliderToBubble(el);
    return best;
  }

  // Find which bubble is "active" for the font-size slider / position grid.
  // Prefer the currently selected bubble; fall back to the first bubble of
  // the panel chosen in the editor (legacy behavior).
  function getActiveBubble() {
    const sel = getSelectedBubble();
    if (sel) return sel;
    let panelId = panelSelect ? panelSelect.value : null;
    if (!panelId) {
      const visible = document.querySelector('.panel.in-view');
      panelId = visible ? visible.dataset.panelId : null;
    }
    if (!panelId) return null;
    const panel = document.querySelector('.panel[data-panel-id="' + panelId + '"]');
    if (!panel) return null;
    // Prefer a non-narration dialogue first; else fallback to any bubble.
    return (
      panel.querySelector('.bubble:not(.bubble-narration):not(.narration)') ||
      panel.querySelector('.bubble')
    );
  }

  function applyFontSizeToActiveBubble(px) {
    // Prefer the currently selected element; fall back to the first bubble
    // of the active panel for backwards compatibility.
    const b = getSelectedBubble() || getActiveBubble();
    if (!b) return;
    setBubbleFontSize(b, px);
  }

  function autoFitActiveBubble() {
    const b = getSelectedBubble() || getActiveBubble();
    if (b) autoFitBubbleFont(b);
  }

  function syncFontSliderToBubble(el) {
    if (!panelEl || !el) return;
    const slider = panelEl.querySelector('.be-font-size');
    const valLabel = panelEl.querySelector('.be-font-size-val');
    if (!slider) return;
    const px = Math.round(parseFloat(getComputedStyle(el).fontSize) || 22);
    slider.value = String(px);
    if (valLabel) valLabel.textContent = String(px);
  }

  function applyStoredFontSizes() {
    const map = loadFontSizes();
    Object.keys(map).forEach((id) => {
      const el = document.querySelector('.bubble[data-bubble-id="' + id.replace(/"/g, '\\"') + '"]');
      if (el) el.style.fontSize = map[id] + 'px';
    });
  }

  function persistElementSize(el, w, h) {
    if (el.classList.contains('character-overlay')) {
      const id = el.dataset.characterId;
      if (!id) return;
      if (el.dataset.userAdded === 'true') {
        // Persist into the user-added characters record (size = width in px).
        el.dataset.size = String(Math.round(w));
        updateStoredCharacter(el);
      }
      const map = loadJSON('comic-character-sizes', {});
      map[id] = { w: Math.round(w), h: Math.round(h) };
      saveJSON('comic-character-sizes', map);
      return;
    }
    // bubble
    const id = el.dataset.bubbleId;
    if (!id) return;
    const map = loadJSON('comic-bubble-sizes', {});
    map[id] = { w: Math.round(w), h: Math.round(h) };
    saveJSON('comic-bubble-sizes', map);
  }

  // ---- Characters ------------------------------------------------------------
  function getPanelById(panelId) {
    return document.querySelector(
      '.panel[data-panel-id="' + String(panelId).replace(/"/g, '\\"') + '"]'
    );
  }

  function panelOverlay(panel) {
    return panel ? (panel.querySelector('.panel__overlay') || panel.querySelector('.panel__media') || panel) : null;
  }

  function detectMediaType(dataURL, fallback) {
    if (fallback === 'video' || fallback === 'image') return fallback;
    if (typeof dataURL === 'string') {
      if (dataURL.indexOf('data:video/') === 0) return 'video';
      if (dataURL.indexOf('data:image/') === 0) return 'image';
      // Url with known extension
      const m = dataURL.toLowerCase().match(/\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/);
      if (m) return 'video';
    }
    return 'image';
  }

  function makeCharacterElement(c) {
    const mediaType = detectMediaType(c.dataURL, c.mediaType);
    const el = document.createElement(mediaType === 'video' ? 'video' : 'img');
    el.className = 'character-overlay';
    el.dataset.userAdded = 'true';
    el.dataset.name = c.name || '';
    el.dataset.characterId = c.id || (c.panelId + '-char-' + Date.now().toString(36));
    el.dataset.mediaType = mediaType;
    if (mediaType === 'video') {
      el.src = c.dataURL;
      el.autoplay = true;
      el.loop = true;
      el.muted = true; // required for autoplay across browsers
      el.defaultMuted = true;
      el.playsInline = true;
      el.setAttribute('playsinline', '');
      el.setAttribute('muted', '');
      el.setAttribute('loop', '');
      el.setAttribute('autoplay', '');
      el.controls = false;
      el.disablePictureInPicture = true;
      el.style.objectFit = 'contain';
      // Best-effort kick to start playback (some browsers need it).
      try { const p = el.play(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
    } else {
      el.alt = c.name || '';
      el.src = c.dataURL;
    }
    el.style.position = 'absolute';
    const size = typeof c.size === 'number' ? c.size : 150;
    el.style.width = size + 'px';
    el.style.height = (typeof c.height === 'number') ? (c.height + 'px') : 'auto';
    el.dataset.size = String(size);

    if (typeof c.x === 'number' && typeof c.y === 'number') {
      el.style.left = c.x + '%';
      el.style.top = c.y + '%';
    } else {
      const pos = c.position || 'center';
      if (pos === 'left') { el.style.left = '10%'; el.style.top = '40%'; }
      else if (pos === 'right') { el.style.left = '70%'; el.style.top = '40%'; }
      else { el.style.left = '40%'; el.style.top = '40%'; }
    }
    return el;
  }

  function updateStoredCharacter(el) {
    const panel = el.closest('.panel');
    if (!panel) return;
    const panelId = panel.dataset.panelId;
    const id = el.dataset.characterId;
    const chars = loadCharacters();
    for (let i = 0; i < chars.length; i++) {
      if (chars[i].id === id || (chars[i].panelId === panelId && !id)) {
        const x = parseFloat(el.dataset.x);
        const y = parseFloat(el.dataset.y);
        if (!isNaN(x)) chars[i].x = x;
        if (!isNaN(y)) chars[i].y = y;
        const w = parseFloat(el.dataset.w);
        const h = parseFloat(el.dataset.h);
        if (!isNaN(w)) { chars[i].size = w; }
        else { chars[i].size = parseFloat(el.dataset.size) || chars[i].size; }
        if (!isNaN(h)) chars[i].height = h;
        if (el.dataset.mediaType) chars[i].mediaType = el.dataset.mediaType;
        saveCharacters(chars);
        return;
      }
    }
  }

  function restoreCharacters() {
    const chars = loadCharacters();
    chars.forEach((c) => {
      if (!c.id) c.id = c.panelId + '-char-' + Math.random().toString(36).slice(2, 8);
      const panel = getPanelById(c.panelId);
      if (!panel) return;
      const host = panelOverlay(panel);
      const el = makeCharacterElement(c);
      host.appendChild(el);
    });
    saveCharacters(chars); // make sure ids are persisted
  }

  function addCharacterFromData(name, dataURL, mediaType) {
    const panelId = getCurrentPanelId();
    const panel = getPanelById(panelId);
    if (!panel) return;
    const size = parseInt(charSizeInput.value, 10) || 150;
    const position = charPosSelect.value || 'center';
    const id = panelId + '-char-' + Date.now().toString(36);
    const type = detectMediaType(dataURL, mediaType);
    const record = {
      id: id,
      panelId: panelId,
      name: name,
      dataURL: dataURL,
      mediaType: type,
      position: position,
      size: size,
    };
    const host = panelOverlay(panel);
    const el = makeCharacterElement(record);
    host.appendChild(el);
    attachDragHandler(el);
    applyEditableClass();

    const chars = loadCharacters();
    chars.push(record);
    saveCharacters(chars);

    const gallery = loadGallery();
    const key = (name || '') + '::' + (dataURL || '').slice(0, 64);
    if (!gallery.some((g) => g._key === key)) {
      gallery.push({ _key: key, name: name, dataURL: dataURL, mediaType: type });
      saveGallery(gallery);
      renderGallery();
    }
  }

  async function onAddCharacter() {
    const file = charFileInput.files && charFileInput.files[0];
    const name = (charNameInput.value || '').trim() || 'personaje';
    if (!file) return;
    try {
      const dataURL = await readFileAsDataURL(file);
      const mediaType = (file.type || '').indexOf('video/') === 0 ? 'video' : 'image';
      // Sube el binario al repo (assets/uploads/...) cuando el servidor está.
      let src = dataURL;
      if (window.Comic.RepoSync && window.Comic.RepoSync.uploadDataUrl) {
        const uploaded = await window.Comic.RepoSync.uploadDataUrl(dataURL, file.name);
        if (uploaded) src = uploaded;
      }
      addCharacterFromData(name, src, mediaType);
      charFileInput.value = '';
      charNameInput.value = '';
    } catch (err) {
      console.warn('[BubbleEditor] character read failed:', err);
    }
  }

  function renderGallery() {
    if (!galleryList) return;
    const gallery = loadGallery();
    if (gallery.length === 0) {
      galleryList.innerHTML =
        '<p class="bubble-editor__empty">Aún no hay personajes guardados.</p>';
      return;
    }
    galleryList.innerHTML = gallery
      .map((g, i) => {
        const type = detectMediaType(g.dataURL, g.mediaType);
        const media = type === 'video'
          ? '<video src="' + g.dataURL + '" autoplay loop muted playsinline></video>'
          : '<img src="' + g.dataURL + '" alt="" />';
        return '<div class="gallery-item" data-index="' + i + '">' +
          media +
          '<span class="gallery-item__name">' + escapeHtml(g.name || '') +
            (type === 'video' ? ' 🎞️' : '') + '</span>' +
          '<button type="button" class="gallery-item__use" data-action="use">Usar</button>' +
          '<button type="button" class="gallery-item__del" data-action="del" aria-label="Borrar">&times;</button>' +
        '</div>';
      })
      .join('');
  }

  function onGalleryClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    const item = btn.closest('.gallery-item');
    if (!item) return;
    const index = parseInt(item.dataset.index, 10);
    const gallery = loadGallery();
    const entry = gallery[index];
    if (!entry) return;
    if (btn.dataset.action === 'use') {
      addCharacterFromData(entry.name, entry.dataURL, entry.mediaType);
    } else if (btn.dataset.action === 'del') {
      gallery.splice(index, 1);
      saveGallery(gallery);
      renderGallery();
    }
  }

  // ---- Backgrounds -----------------------------------------------------------
  // Soporta imagen o video como fondo. Detecta el tipo del src (data URL o
  // extensión) y crea el elemento adecuado, preservando `data-original-src`
  // y `data-user-bg` cuando reemplaza el elemento.
  function applyBackground(panel, src) {
    if (!panel) return;
    const media = panel.querySelector('.panel__media') || panel;
    const mediaType = detectMediaType(src);
    const wantedTag = mediaType === 'video' ? 'VIDEO' : 'IMG';
    let current = media.querySelector('.panel-bg');
    let originalSrc = '';
    let needsNewElement = false;

    if (current && current.tagName === wantedTag) {
      // Mismo tipo → solo actualizamos src.
      originalSrc = current.dataset.originalSrc || current.getAttribute('src') || '';
    } else {
      // Tipo distinto (o no había nada) → reemplazo.
      if (current) {
        originalSrc = current.dataset.originalSrc || current.getAttribute('src') || '';
      }
      needsNewElement = true;
    }

    if (needsNewElement) {
      const next = mediaType === 'video'
        ? document.createElement('video')
        : document.createElement('img');
      next.className = 'panel-bg';
      if (mediaType === 'image') {
        next.alt = '';
        next.loading = 'lazy';
        next.decoding = 'async';
      } else {
        // Video: autoplay silencioso, en loop, in-line (especialmente iOS).
        next.autoplay = true;
        next.loop = true;
        next.muted = true;
        next.defaultMuted = true;
        next.playsInline = true;
        next.setAttribute('autoplay', '');
        next.setAttribute('loop', '');
        next.setAttribute('muted', '');
        next.setAttribute('playsinline', '');
        next.controls = false;
        next.disablePictureInPicture = true;
      }
      if (current && current.parentNode) {
        current.parentNode.replaceChild(next, current);
      } else {
        media.insertBefore(next, media.firstChild);
      }
      current = next;
    }

    if (!current.dataset.originalSrc) {
      // La primera vez que tocamos este panel: guardamos lo que había antes
      // para poder restaurarlo con "Quitar fondo personalizado".
      current.dataset.originalSrc = originalSrc;
    }
    current.src = src;
    current.dataset.userBg = 'true';
    current.dataset.mediaType = mediaType;

    if (mediaType === 'video') {
      // Asegura que arranque (algunos navegadores requieren un kick).
      try { const p = current.play(); if (p && p.catch) p.catch(() => {}); } catch (_) {}
    }

    // Recalcular el tinte del panel con el nuevo medio.
    if (window.Comic.PanelLoader && window.Comic.PanelLoader.applyPanelTint) {
      window.Comic.PanelLoader.applyPanelTint(current);
    }
  }

  function restoreBackgrounds() {
    const data = loadBackgrounds();
    Object.keys(data).forEach((panelId) => {
      const panel = getPanelById(panelId);
      if (panel) applyBackground(panel, data[panelId]);
    });
  }

  async function onBgFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataURL = await readFileAsDataURL(file);
      let src = dataURL;
      if (window.Comic.RepoSync && window.Comic.RepoSync.uploadDataUrl) {
        const uploaded = await window.Comic.RepoSync.uploadDataUrl(dataURL, file.name);
        if (uploaded) src = uploaded;
      }
      const panelId = getCurrentPanelId();
      const panel = getPanelById(panelId);
      if (!panel) return;
      applyBackground(panel, src);
      const data = loadBackgrounds();
      data[panelId] = src;
      saveBackgrounds(data);
    } catch (err) {
      console.warn('[BubbleEditor] background read failed:', err);
    } finally {
      e.target.value = '';
    }
  }

  function removeCustomBackground() {
    const panelId = getCurrentPanelId();
    const panel = getPanelById(panelId);
    if (!panel) return;
    const media = panel.querySelector('.panel__media');
    const current = panel.querySelector('.panel-bg');
    if (current && current.dataset.originalSrc !== undefined) {
      const original = current.dataset.originalSrc || '';
      // El "original" de chapter*.js siempre es una imagen (o vacío). Si el
      // usuario había puesto un video, debemos cambiar la etiqueta de vuelta
      // a <img>; applyBackground hace exactamente eso cuando el src es de tipo
      // imagen, así que delegamos en él para evitar lógica duplicada.
      if (original) {
        applyBackground(panel, original);
        const nextBg = panel.querySelector('.panel-bg');
        // applyBackground marca userBg=true; al ser una restauración del
        // original, lo limpiamos para reflejar el estado real.
        if (nextBg) {
          delete nextBg.dataset.userBg;
          // Preservar el originalSrc; ya quedó en applyBackground.
        }
      } else {
        // No había imagen original → volver al placeholder en blanco.
        if (current.parentNode) {
          const placeholder = document.createElement('div');
          placeholder.className = 'panel-bg panel-bg--placeholder';
          placeholder.setAttribute('aria-hidden', 'true');
          current.parentNode.replaceChild(placeholder, current);
        }
        if (media) media.style.backgroundColor = '#ffffff';
      }
    }
    const data = loadBackgrounds();
    delete data[panelId];
    saveBackgrounds(data);
  }

  // Devuelve el id del panel sobre el que el usuario está actuando: prioriza
  // el más visible en pantalla y sincroniza el dropdown del editor para que
  // refleje el panel real. Evita el bug "agrego cosa al panel 1 cuando estoy
  // viendo el panel 2" cuando el IntersectionObserver no ha actualizado
  // panelSelect (umbral 25-50%).
  function getCurrentPanelId() {
    const visible = detectVisiblePanelId();
    const fallback = panelSelect ? panelSelect.value : null;
    const id = visible || fallback;
    if (id && panelSelect && panelSelect.value !== id) {
      panelSelect.value = id;
    }
    return id;
  }

  // ---- Panels ----------------------------------------------------------------
  function getAllPanels() {
    return Array.from(document.querySelectorAll('.panel'));
  }

  function detectVisiblePanelId() {
    const panels = getAllPanels();
    const vh = window.innerHeight;
    let best = null;
    let bestScore = -Infinity;
    panels.forEach((p) => {
      const r = p.getBoundingClientRect();
      const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
      if (visible > bestScore) {
        bestScore = visible;
        best = p;
      }
    });
    return best ? best.dataset.panelId : null;
  }

  function refreshPanelSelect() {
    if (!panelSelect) return;
    const panels = getAllPanels();
    const current = panelSelect.value;
    panelSelect.innerHTML = panels
      .map((p) =>
        '<option value="' + escapeHtml(p.dataset.panelId) + '">Cap ' +
        escapeHtml(p.dataset.chapter) + ' · Panel ' +
        escapeHtml(p.dataset.panelId) + '</option>'
      )
      .join('');
    const visible = detectVisiblePanelId();
    if (current && panels.some((p) => p.dataset.panelId === current)) {
      panelSelect.value = current;
    } else if (visible) {
      panelSelect.value = visible;
    }
    activePanelId = panelSelect.value;
    const sel = panels.find((p) => p.dataset.panelId === activePanelId);
    activeChapter = sel ? sel.dataset.chapter : null;
  }

  // ---- Position grid + text edit handlers -----------------------------------
  function onPositionGridClick(e) {
    const btn = e.target.closest('.be-pos-cell');
    if (!btn) return;
    const sel = getSelectedBubble();
    if (!sel) return;
    const pos = btn.dataset.pos;
    const coords = POSITION_COORDS[pos];
    if (!coords) return;
    const beforePos = { left: sel.style.left || '', top: sel.style.top || '' };
    sel.style.left = coords.x + '%';
    sel.style.top = coords.y + '%';
    sel.dataset.x = String(coords.x);
    sel.dataset.y = String(coords.y);
    sel.dataset.position = pos;
    sel.dataset.placed = '1';
    sel.classList.add('bubble--placed');
    persistElementPosition(sel, coords.x, coords.y);
    const afterPos = { left: sel.style.left, top: sel.style.top };
    if (afterPos.left !== beforePos.left || afterPos.top !== beforePos.top) {
      History.push({ type: 'move', el: sel, before: beforePos, after: afterPos });
    }
    // Refresh active button.
    if (panelEl) {
      panelEl.querySelectorAll('.be-pos-cell').forEach((b) => {
        b.classList.toggle('is-active', b.dataset.pos === pos);
      });
    }
  }

  function onTextAreaInput() {
    const sel = getSelectedBubble();
    if (!sel || sel.classList.contains('character-overlay')) return;
    if (!textArea) return;
    const newText = textArea.value;
    applyTextToBubble(sel, newText);
    persistTextChange(sel, newText);
  }

  // ---- Bubble type (visual variant) -----------------------------------------
  function loadBubbleTypes() {
    return loadJSON(BUBBLE_TYPES_KEY, {});
  }

  function saveBubbleType(bubbleId, type) {
    if (!bubbleId) return;
    const map = loadBubbleTypes();
    if (type && type !== 'speech') {
      map[bubbleId] = type;
    } else {
      delete map[bubbleId];
    }
    saveJSON(BUBBLE_TYPES_KEY, map);
  }

  function applyBubbleType(el, type) {
    if (!el) return;
    const newType = type || 'speech';
    const wasNarration = el.classList.contains('bubble-type-narration');
    const willBeNarration = newType === 'narration';

    // Remove all existing bubble-type-* classes.
    BUBBLE_TYPE_CLASSES.forEach((c) => el.classList.remove(c));
    el.classList.add('bubble-type-' + newType);
    el.dataset.bubbleType = newType;

    if (willBeNarration && !wasNarration) {
      // Switch to narration look: drop side-tail classes, add narration classes.
      POS_CLASSES.forEach((c) => el.classList.remove(c));
      // Also remove dialogue--<position> tail-driving classes.
      Array.from(el.classList).forEach((c) => {
        if (/^dialogue--(top|bottom|middle|center|left|right)/.test(c)) el.classList.remove(c);
      });
      NARRATION_CLASSES.forEach((c) => el.classList.add(c));
    } else if (!willBeNarration && wasNarration) {
      // Restore a sensible side-tail variant.
      NARRATION_CLASSES.forEach((c) => el.classList.remove(c));
      const pos = el.dataset.position || 'bottom-left';
      const posClass = pos === 'top-left'  ? 'bubble-top-left'
        : pos === 'top-right' ? 'bubble-top-right'
        : (pos === 'left' || pos === 'bottom-left')  ? 'bubble-left'
        : (pos === 'right' || pos === 'bottom-right') ? 'bubble-right'
        : 'bubble-center';
      el.classList.add(posClass, 'dialogue--' + pos);
      el.style.width = '';
    }
  }

  function setSelectedBubbleType(type) {
    const sel = getSelectedBubble();
    if (!sel || sel.classList.contains('character-overlay')) return;
    const id = sel.dataset.bubbleId;
    applyBubbleType(sel, type);
    saveBubbleType(id, type);
  }

  function applyStoredBubbleTypes() {
    const map = loadBubbleTypes();
    Object.keys(map).forEach((id) => {
      const el = document.querySelector('.bubble[data-bubble-id="' + id.replace(/"/g, '\\"') + '"]');
      if (!el) return;
      applyBubbleType(el, map[id]);
    });
  }

  // ---- Bubble side (tail direction left/right) ------------------------------
  function loadBubbleSides() {
    return loadJSON(BUBBLE_SIDES_KEY, {});
  }

  function saveBubbleSide(bubbleId, side) {
    if (!bubbleId) return;
    const map = loadBubbleSides();
    if (side === 'left' || side === 'right' || side === 'top-left' || side === 'top-right') {
      map[bubbleId] = side;
    } else {
      delete map[bubbleId];
    }
    saveJSON(BUBBLE_SIDES_KEY, map);
  }

  function getBubbleSide(el) {
    if (!el) return null;
    if (el.classList.contains('bubble-narration') || el.classList.contains('narration')) return null;
    if (el.classList.contains('bubble-right')) return 'right';
    if (el.classList.contains('bubble-top-left')) return 'top-left';
    if (el.classList.contains('bubble-top-right')) return 'top-right';
    if (el.classList.contains('bubble-left')) return 'left';
    return null;
  }

  function applyBubbleSide(el, side) {
    if (!el) return;
    if (el.classList.contains('bubble-narration') || el.classList.contains('narration')) return;
    el.classList.remove('bubble-left', 'bubble-right', 'bubble-top-left', 'bubble-top-right');
    Array.from(el.classList).forEach((c) => {
      if (/^dialogue--(top|bottom|middle)-(left|right)$/.test(c)) el.classList.remove(c);
    });
    if (side === 'left') {
      el.classList.add('bubble-left');
      el.dataset.position = 'bottom-left';
      el.classList.add('dialogue--bottom-left');
    } else if (side === 'right') {
      el.classList.add('bubble-right');
      el.dataset.position = 'bottom-right';
      el.classList.add('dialogue--bottom-right');
    } else if (side === 'top-left') {
      el.classList.add('bubble-top-left');
      el.dataset.position = 'top-left';
    } else if (side === 'top-right') {
      el.classList.add('bubble-top-right');
      el.dataset.position = 'top-right';
    } else {
      // Default to left as a safe fallback.
      el.classList.add('bubble-left');
      el.dataset.position = 'bottom-left';
      el.classList.add('dialogue--bottom-left');
    }
  }

  function setSelectedBubbleSide(side) {
    const sel = getSelectedBubble();
    if (!sel || sel.classList.contains('character-overlay')) return;
    if (sel.classList.contains('bubble-narration') || sel.classList.contains('narration')) return;
    const id = sel.dataset.bubbleId;
    applyBubbleSide(sel, side);
    saveBubbleSide(id, side);
    syncSideButtonsToBubble(sel);
  }

  function applyStoredBubbleSides() {
    const map = loadBubbleSides();
    Object.keys(map).forEach((id) => {
      const el = document.querySelector('.bubble[data-bubble-id="' + id.replace(/"/g, '\\"') + '"]');
      if (!el) return;
      applyBubbleSide(el, map[id]);
    });
  }

  function syncSideButtonsToBubble(el) {
    if (!panelEl) return;
    const btns = panelEl.querySelectorAll('.be-side-btn');
    const side = getBubbleSide(el);
    btns.forEach((b) => {
      const isActive = b.dataset.side === side;
      b.classList.toggle('is-active', isActive);
      b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  // ---- User bubble add -------------------------------------------------------
  function getDraftType() {
    const sel = panelEl && panelEl.querySelector('.be-bubble-type');
    return (sel && sel.value) || 'speech';
  }

  function addBubble() {
    const panelId = getCurrentPanelId();
    const panel = getPanelById(panelId);
    if (!panel) return;
    // To create a new bubble, first clear selection — otherwise typing into
    // the textarea was modifying the selected bubble live.
    if (getSelectedBubble()) selectBubble(null);
    const text = (textArea ? textArea.value.trim() : '');
    if (!text) return;
    const id = panelId + '-u' + Date.now().toString(36);
    const type = getDraftType();
    const bubble = {
      id: id,
      speaker: (speakerSelect && speakerSelect.value) || 'narrator',
      text: text,
      position: type === 'narration' ? 'bottom-center' : 'bottom-left',
      type: type,
    };

    const host = panelOverlay(panel);
    const el = makeBubbleElement(bubble, panelId);
    host.appendChild(el);
    attachDragHandler(el);
    applyEditableClass();
    storeBubble(panelId, bubble);

    document.dispatchEvent(
      new CustomEvent('bubble:typewrite', {
        detail: { bubble: el, panel: panel, panelId: panelId },
      })
    );

    History.push({
      type: 'addBubble',
      el: el,
      panelId: panelId,
      bubbleData: Object.assign({}, bubble),
    });

    textArea.value = '';
    // Auto-select the newly added bubble for immediate editing.
    selectBubble(el);
  }

  function addCaption() {
    const panelId = getCurrentPanelId();
    const panel = getPanelById(panelId);
    if (!panel) return;
    if (getSelectedBubble()) selectBubble(null);
    const text = (textArea && textArea.value.trim())
      || 'Editá este caption…';
    const id = panelId + '-uc' + Date.now().toString(36);
    const bubble = {
      id: id,
      speaker: 'narrator',
      text: text,
      position: 'bottom-center',
      type: 'narration',
      width: 80,
    };

    const host = panelOverlay(panel);
    const el = makeBubbleElement(bubble, panelId);
    host.appendChild(el);
    attachDragHandler(el);
    applyEditableClass();
    storeBubble(panelId, bubble);

    document.dispatchEvent(
      new CustomEvent('bubble:typewrite', {
        detail: { bubble: el, panel: panel, panelId: panelId },
      })
    );

    History.push({
      type: 'addBubble',
      el: el,
      panelId: panelId,
      bubbleData: Object.assign({}, bubble),
    });

    if (textArea) textArea.value = '';
    selectBubble(el);
  }

  function restoreFromStorage() {
    const data = loadStored();
    Object.keys(data).forEach((panelId) => {
      const panel = getPanelById(panelId);
      if (!panel) return;
      const host = panelOverlay(panel);
      (data[panelId] || []).forEach((bubble) => {
        if (!bubble.id) bubble.id = panelId + '-u' + Math.random().toString(36).slice(2, 8);
        const el = makeBubbleElement(bubble, panelId);
        host.appendChild(el);
      });
    });
    saveStored(loadStored()); // persist generated ids if any
  }

  // ---- Audio: panel + global -------------------------------------------------
  async function onPanelAudioChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataURL = await readFileAsDataURL(file);
      let src = dataURL;
      if (window.Comic.RepoSync && window.Comic.RepoSync.uploadDataUrl) {
        const uploaded = await window.Comic.RepoSync.uploadDataUrl(dataURL, file.name);
        if (uploaded) src = uploaded;
      }
      const panelId = getCurrentPanelId();
      const map = loadJSON(PANEL_AUDIO_KEY, {});
      map[panelId] = src;
      saveJSON(PANEL_AUDIO_KEY, map);
      if (window.Comic.AudioManager && typeof window.Comic.AudioManager.setPanelAudio === 'function') {
        window.Comic.AudioManager.setPanelAudio(panelId, src);
      }
    } catch (err) {
      console.warn('[BubbleEditor] panel audio read failed:', err);
    } finally {
      e.target.value = '';
    }
  }

  function removePanelAudio() {
    const panelId = panelSelect.value;
    const map = loadJSON(PANEL_AUDIO_KEY, {});
    delete map[panelId];
    saveJSON(PANEL_AUDIO_KEY, map);
    if (window.Comic.AudioManager && typeof window.Comic.AudioManager.setPanelAudio === 'function') {
      window.Comic.AudioManager.setPanelAudio(panelId, null);
    }
  }

  async function onGlobalAudioChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const dataURL = await readFileAsDataURL(file);
      let src = dataURL;
      if (window.Comic.RepoSync && window.Comic.RepoSync.uploadDataUrl) {
        const uploaded = await window.Comic.RepoSync.uploadDataUrl(dataURL, file.name);
        if (uploaded) src = uploaded;
      }
      try { localStorage.setItem(GLOBAL_AUDIO_KEY, src); } catch (_) {}
      if (window.Comic.AudioManager && typeof window.Comic.AudioManager.setGlobalAudio === 'function') {
        window.Comic.AudioManager.setGlobalAudio(src);
      }
    } catch (err) {
      console.warn('[BubbleEditor] global audio read failed:', err);
    } finally {
      e.target.value = '';
    }
  }

  function toggleGlobalAudio() {
    if (window.Comic.AudioManager && typeof window.Comic.AudioManager.toggleGlobalAudio === 'function') {
      window.Comic.AudioManager.toggleGlobalAudio();
    }
  }

  function onGlobalVolumeChange() {
    if (!globalVolumeInput) return;
    const v = parseInt(globalVolumeInput.value, 10) / 100;
    try { localStorage.setItem(GLOBAL_VOL_KEY, String(v)); } catch (_) {}
    if (window.Comic.AudioManager && typeof window.Comic.AudioManager.setGlobalVolume === 'function') {
      window.Comic.AudioManager.setGlobalVolume(v);
    }
  }

  // ---- Export ----------------------------------------------------------------
  function exportChapterJson() {
    if (!exportArea) return;
    const panelId = panelSelect.value;
    const panel = getPanelById(panelId);
    if (!panel) {
      exportArea.value = '';
      return;
    }
    const chapter = panel.dataset.chapter;
    const bubbles = loadStored();
    const backgrounds = loadBackgrounds();
    const characters = loadCharacters();
    const bubblePositions = loadBubblePos();

    const chapterPanels = Array.from(
      document.querySelectorAll('.panel[data-chapter="' + chapter + '"]')
    ).map((p) => {
      const pid = p.dataset.panelId;
      const originalPositions = {};
      Object.keys(bubblePositions).forEach((bid) => {
        if (bid.indexOf(pid + '-') === 0) originalPositions[bid] = bubblePositions[bid];
      });
      return {
        id: pid,
        addedBubbles: bubbles[pid] || [],
        originalBubblePositions: originalPositions,
        customBackground: backgrounds[pid] || null,
        addedCharacters: characters
          .filter((c) => c.panelId === pid)
          .map((c) => ({
            name: c.name,
            dataURL: c.dataURL,
            mediaType: c.mediaType || detectMediaType(c.dataURL),
            position: c.position,
            size: c.size,
            height: c.height,
            x: c.x,
            y: c.y,
          })),
      };
    });

    const out = { chapter: Number(chapter) || chapter, panels: chapterPanels };

    const code =
      '// Pega esto en js/chapters/chapter' + chapter + '.js y fusiónalo con los paneles existentes\n' +
      '// Incluye burbujas, fondos personalizados, personajes y posiciones movidas.\n' +
      'window.Chapters = window.Chapters || {};\n' +
      'window.Chapters.userContent = window.Chapters.userContent || {};\n' +
      'window.Chapters.userContent[' + JSON.stringify(chapter) + '] = ' +
      JSON.stringify(out, null, 2) + ';\n';

    exportArea.value = code;
    exportArea.select();
  }

  // ---- Panel delete / restore / reorder helpers -----------------------------
  function removePanelById(panelId, recordHistory) {
    const panel = getPanelById(panelId);
    if (!panel) return false;
    if (!panel.parentNode) return false;
    const parent = panel.parentNode;
    const anchorNextSibling = panel.nextSibling;
    const chapterId = panel.dataset.chapter;

    const deleted = loadDeletedPanels();
    if (deleted.indexOf(panelId) === -1) {
      deleted.push(panelId);
      saveDeletedPanels(deleted);
    }
    parent.removeChild(panel);

    if (recordHistory !== false) {
      History.push({
        type: 'deletePanel',
        panelEl: panel,
        parent: parent,
        anchorNextSibling: anchorNextSibling,
        chapterId: chapterId,
        panelId: panelId,
      });
    }

    refreshPanelSelect();
    renderPanelList();
    if (window.Comic.ScrollManager && window.Comic.ScrollManager.refresh) {
      window.Comic.ScrollManager.refresh();
    }
    return true;
  }

  function restorePanel(panelEl, parent, anchorNextSibling) {
    if (!panelEl || !parent) return;
    if (anchorNextSibling && anchorNextSibling.parentNode === parent) {
      parent.insertBefore(panelEl, anchorNextSibling);
    } else {
      parent.appendChild(panelEl);
    }
    const pid = panelEl.dataset.panelId;
    const list = loadDeletedPanels().filter((id) => String(id) !== String(pid));
    saveDeletedPanels(list);
    refreshPanelSelect();
    renderPanelList();
    if (window.Comic.ScrollManager && window.Comic.ScrollManager.refresh) {
      window.Comic.ScrollManager.refresh();
    }
  }

  function applyPanelOrderList(order) {
    if (!Array.isArray(order)) return;
    order.forEach((pid) => {
      const panel = document.querySelector(
        '.panel[data-panel-id="' + String(pid).replace(/"/g, '\\"') + '"]'
      );
      if (!panel) return;
      const chapter = panel.dataset.chapter;
      const targetChapter = document.querySelector(
        '.chapter[data-chapter="' + String(chapter).replace(/"/g, '\\"') + '"]'
      );
      if (targetChapter) targetChapter.appendChild(panel);
    });
    if (window.Comic.ScrollManager && window.Comic.ScrollManager.refresh) {
      window.Comic.ScrollManager.refresh();
    }
  }

  function deleteCurrentPanel() {
    if (!panelSelect) return;
    const panelId = getCurrentPanelId();
    if (!panelId) return;
    if (!confirm('¿Eliminar el panel actual? Puedes deshacerlo con Ctrl+Z.')) return;
    removePanelById(panelId, true);
  }

  function buildUserPanelData(chapterId) {
    const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const id = 'e' + chapterId + '-up-' + stamp;
    return {
      id: id,
      image: '',
      narration: 'Nuevo panel — editá esta narración',
      dialogues: [],
    };
  }

  // Inserta el panelData en el DOM, en el capítulo correspondiente, justo
  // después de `anchorPanel` (si pertenece al mismo capítulo). Si no hay
  // anchor, lo agrega al final del capítulo.
  function insertPanelIntoDom(panelData, chapterId, anchorPanel) {
    const PL = window.Comic.PanelLoader;
    if (!PL || typeof PL.renderPanelHTML !== 'function') return null;
    const html = PL.renderPanelHTML(panelData, chapterId);
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const newPanel = tmp.firstElementChild;
    if (!newPanel) return null;

    const chapterEl = document.querySelector(
      '.chapter[data-chapter="' + String(chapterId).replace(/"/g, '\\"') + '"]'
    );
    if (!chapterEl) return null;

    const anchorIsInChapter = anchorPanel && anchorPanel.parentNode === chapterEl;
    if (anchorIsInChapter) {
      chapterEl.insertBefore(newPanel, anchorPanel.nextSibling);
    } else {
      chapterEl.appendChild(newPanel);
    }
    // Tinte: panel nuevo arranca sin imagen → blanco. Si trae imagen,
    // applyAllPanelTints calculará el matiz cuando cargue.
    if (window.Comic.PanelLoader && window.Comic.PanelLoader.applyAllPanelTints) {
      window.Comic.PanelLoader.applyAllPanelTints(newPanel);
    }
    // Escala visual: el nuevo panel también debe respetar --panel-scale
    // según el ancho actual del viewport.
    if (window.Comic.PanelLoader && window.Comic.PanelLoader.observePanelScales) {
      window.Comic.PanelLoader.observePanelScales(newPanel);
    }
    return newPanel;
  }

  function syncOrderAfterInsert(newPanelId, anchorPanelId) {
    // Reordena `comic-panel-order` para incluir el nuevo panel justo después
    // del ancla (o al final si no hay). Usa el orden actual del DOM como base.
    const current = getCurrentPanelOrder();
    // current ya refleja la inserción porque leemos del DOM; persistimos.
    savePanelOrder(current);
    return current;
  }

  function addPanelAfterCurrent() {
    let anchor = null;
    let chapterId = null;
    const currentId = getCurrentPanelId();
    if (currentId) {
      anchor = getPanelById(currentId);
      if (anchor) chapterId = anchor.dataset.chapter;
    }
    if (!chapterId) {
      // Fallback: primer capítulo disponible en el DOM.
      const firstChapter = document.querySelector('.chapter');
      chapterId = firstChapter ? firstChapter.dataset.chapter : null;
    }
    if (!chapterId) {
      alert('No se pudo determinar la escena destino.');
      return;
    }

    const panelData = buildUserPanelData(chapterId);
    addExtraPanelToStorage(chapterId, panelData);
    const newPanel = insertPanelIntoDom(panelData, chapterId, anchor);
    if (!newPanel) {
      removeExtraPanelFromStorage(panelData.id);
      alert('No se pudo insertar el panel en el DOM.');
      return;
    }
    syncOrderAfterInsert(panelData.id, anchor ? anchor.dataset.panelId : null);

    refreshPanelSelect();
    renderPanelList();
    if (window.Comic.ScrollManager && window.Comic.ScrollManager.refresh) {
      window.Comic.ScrollManager.refresh();
    }

    History.push({
      type: 'addPanel',
      panelData: panelData,
      chapterId: chapterId,
      panelId: panelData.id,
    });

    // Llevar al usuario al nuevo panel para que pueda editarlo enseguida.
    if (window.Comic.ScrollManager && window.Comic.ScrollManager.goToPanel) {
      window.Comic.ScrollManager.goToPanel(panelData.id);
    } else {
      newPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // ---- Panel list (orden visual + drag/drop) --------------------------------
  let panelListEl = null;

  function getPanelLabel(panel) {
    const cap = panel.dataset.chapter || '?';
    const pid = panel.dataset.panelId || '?';
    // First narration / dialogue text as title hint.
    const first =
      panel.querySelector('.bubble-narration .dialogue__text, .bubble .dialogue__text');
    let hint = '';
    if (first) {
      hint = (first.dataset.fullText || first.textContent || '').trim();
      if (hint.length > 36) hint = hint.slice(0, 33) + '…';
    }
    return 'Cap ' + cap + ' · Panel ' + pid + (hint ? ' — ' + hint : '');
  }

  function getPanelThumbSrc(panel) {
    // Acepta tanto imagen como video como fondo del panel.
    const el = panel.querySelector('img.panel-bg, video.panel-bg');
    if (!el || !el.src) return { src: '', type: 'image' };
    return {
      src: el.src,
      type: el.tagName === 'VIDEO' ? 'video' : 'image',
    };
  }

  function renderPanelList() {
    if (!panelListEl) return;
    const panels = Array.from(document.querySelectorAll('.panel'));
    panelListEl.innerHTML = panels
      .map((p) => {
        const pid = p.dataset.panelId || '';
        const label = escapeHtml(getPanelLabel(p));
        const thumbInfo = getPanelThumbSrc(p);
        let thumb;
        if (!thumbInfo.src) {
          thumb = '<span class="be-panel-item__thumb be-panel-item__thumb--empty"></span>';
        } else if (thumbInfo.type === 'video') {
          thumb = '<video class="be-panel-item__thumb" src="' + escapeHtml(thumbInfo.src) +
                  '" muted playsinline preload="metadata"></video>';
        } else {
          thumb = '<img class="be-panel-item__thumb" src="' + escapeHtml(thumbInfo.src) + '" alt="" />';
        }
        return (
          '<li class="be-panel-item" draggable="true" data-panel-id="' + escapeHtml(pid) + '" ' +
          'style="display:flex;align-items:center;gap:8px;padding:6px 8px;margin:4px 0;' +
          'border:1px solid rgba(44,44,44,0.18);border-radius:8px;background:rgba(255,255,255,0.55);cursor:grab">' +
            thumb +
            '<span class="be-panel-item__label" style="flex:1;font-size:12px;line-height:1.2">' + label + '</span>' +
            '<button type="button" class="be-panel-item__goto" data-action="goto" aria-label="Ir al panel" ' +
              'style="border:0;background:rgba(44,44,44,0.1);border-radius:6px;padding:4px 6px;cursor:pointer">📷</button>' +
            '<button type="button" class="be-panel-item__del" data-action="del" aria-label="Eliminar panel" ' +
              'style="border:0;background:#d33;color:#fff;border-radius:6px;padding:4px 8px;cursor:pointer">✕</button>' +
          '</li>'
        );
      })
      .join('');

    // Style the thumb (inline so we don't touch CSS).
    panelListEl.querySelectorAll('.be-panel-item__thumb').forEach((t) => {
      t.style.cssText =
        'width:60px;height:40px;object-fit:cover;border-radius:4px;flex-shrink:0;' +
        'background:rgba(44,44,44,0.12);display:inline-block';
    });
  }

  function onPanelListClick(e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const li = btn.closest('.be-panel-item');
    if (!li) return;
    const pid = li.dataset.panelId;
    if (!pid) return;
    if (btn.dataset.action === 'goto') {
      if (window.Comic.ScrollManager && window.Comic.ScrollManager.goToPanel) {
        window.Comic.ScrollManager.goToPanel(pid);
      } else {
        const p = getPanelById(pid);
        if (p) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (btn.dataset.action === 'del') {
      if (!confirm('¿Eliminar este panel? Puedes deshacerlo con Ctrl+Z.')) return;
      removePanelById(pid, true);
    }
  }

  // ---- Drag & drop for panel list -------------------------------------------
  let dragSrcLi = null;

  function onPanelListDragStart(e) {
    const li = e.target.closest('.be-panel-item');
    if (!li) return;
    dragSrcLi = li;
    li.classList.add('be-panel-item--dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', li.dataset.panelId || ''); } catch (_) {}
    }
  }

  function onPanelListDragOver(e) {
    if (!dragSrcLi) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const li = e.target.closest('.be-panel-item');
    if (!li || li === dragSrcLi) return;
    const rect = li.getBoundingClientRect();
    const before = (e.clientY - rect.top) < rect.height / 2;
    if (before) li.parentNode.insertBefore(dragSrcLi, li);
    else li.parentNode.insertBefore(dragSrcLi, li.nextSibling);
  }

  function onPanelListDrop(e) {
    if (!dragSrcLi) return;
    e.preventDefault();
    dragSrcLi.classList.remove('be-panel-item--dragging');

    const beforeOrder = getCurrentPanelOrder();
    // Apply new order from the LI list to the DOM.
    const newOrder = Array.from(panelListEl.querySelectorAll('.be-panel-item'))
      .map((li) => li.dataset.panelId);
    applyPanelOrderList(newOrder);
    savePanelOrder(newOrder);
    if (JSON.stringify(beforeOrder) !== JSON.stringify(newOrder)) {
      History.push({ type: 'reorderPanels', before: beforeOrder, after: newOrder });
    }
    dragSrcLi = null;
  }

  function onPanelListDragEnd() {
    if (dragSrcLi) dragSrcLi.classList.remove('be-panel-item--dragging');
    dragSrcLi = null;
  }

  function clearAddedBubbles() {
    const panelId = panelSelect.value;
    const panel = getPanelById(panelId);
    if (!panel) return;

    panel.querySelectorAll('.bubble[data-user-added="true"]')
      .forEach((el) => el.parentNode && el.parentNode.removeChild(el));
    clearStoredFor(panelId);

    panel.querySelectorAll('.character-overlay[data-user-added="true"]')
      .forEach((el) => el.parentNode && el.parentNode.removeChild(el));
    const chars = loadCharacters().filter((c) => c.panelId !== panelId);
    saveCharacters(chars);

    removeCustomBackground();
  }

  function logoutEditMode() {
    if (!confirm('¿Cerrar la sesión de edición?')) return;
    setEditUnlocked(false);
    close();
  }

  // ---- UI build --------------------------------------------------------------
  function buildUI() {
    toggleBtn = document.createElement('button');
    toggleBtn.id = 'editor-toggle';
    toggleBtn.className = 'editor-toggle';
    toggleBtn.type = 'button';
    toggleBtn.setAttribute('aria-label', 'Abrir editor');
    toggleBtn.textContent = '✏️';

    panelEl = document.createElement('aside');
    panelEl.id = 'bubble-editor';
    panelEl.className = 'bubble-editor';
    panelEl.setAttribute('aria-hidden', 'true');
    panelEl.innerHTML =
      '<header class="bubble-editor__header">' +
      '<h2>Editor</h2>' +
      '<button type="button" class="bubble-editor__close" aria-label="Cerrar">&times;</button>' +
      '</header>' +
      '<div class="bubble-editor__body">' +
      '<label>Panel actual<select class="be-panel"></select></label>' +
      '<section class="be-section">' +
      '<h3>Orden de paneles</h3>' +
      '<p style="margin:0 0 8px;font-size:12px;opacity:0.8">Arrastra para reordenar. Usa Ctrl+Z para deshacer.</p>' +
      '<ol class="be-panel-list" style="list-style:none;padding:0;margin:0;max-height:260px;overflow-y:auto"></ol>' +
      '</section>' +
      '<section class="be-section">' +
      '<h3>Burbujas</h3>' +
      '<label>Texto<textarea class="be-text" rows="3" placeholder="Escribe el diálogo. La burbuja se crea con este texto y luego la arrastras donde quieras."></textarea></label>' +
      '<label>Tipo de burbuja<select class="be-bubble-type">' +
      BUBBLE_TYPES.map((t) =>
        '<option value="' + t.id + '">' + escapeHtml(t.label) + '</option>'
      ).join('') +
      '</select></label>' +
      '<div class="be-selection-only" style="display:none">' +
      '<label style="display:block;margin-bottom:6px">Cola de la burbuja</label>' +
      '<div class="be-side-toggle" role="group" aria-label="Lado de la cola" ' +
        'style="display:flex;gap:8px;margin-bottom:10px">' +
      '<button type="button" class="be-side-btn" data-side="left" aria-pressed="false" ' +
        'title="Cola abajo izquierda">↙ Abajo izq</button>' +
      '<button type="button" class="be-side-btn" data-side="right" aria-pressed="false" ' +
        'title="Cola abajo derecha">Abajo der ↘</button>' +
      '<button type="button" class="be-side-btn" data-side="top-left" aria-pressed="false" ' +
        'title="Cola arriba izquierda">↖ Arriba izq</button>' +
      '<button type="button" class="be-side-btn" data-side="top-right" aria-pressed="false" ' +
        'title="Cola arriba derecha">Arriba der ↗</button>' +
      '</div>' +
      '</div>' +
      '<div class="bubble-editor__actions" style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button type="button" class="be-add">Agregar burbuja</button>' +
      '<button type="button" class="be-add-caption" title="Caja de narración oscura como la del prólogo">+ Caption oscuro</button>' +
      '</div>' +
      '<hr style="border:0;border-top:1px solid rgba(44,44,44,0.15);margin:12px 0" />' +
      '<h4 style="margin:0 0 8px;font-family:Fredoka,sans-serif;font-size:14px">Tamaño de texto (burbuja seleccionada)</h4>' +
      '<div class="be-selection-only" style="display:none">' +
      '<label>Tamaño px <span class="be-font-size-val">22</span>' +
      '<input type="range" class="be-font-size" min="10" max="40" value="22" />' +
      '</label>' +
      '<button type="button" class="be-font-auto">Auto-ajustar al cuadro</button>' +
      '</div>' +
      '<hr style="border:0;border-top:1px solid rgba(44,44,44,0.15);margin:12px 0" />' +
      '<h4 style="margin:0 0 8px;font-family:Fredoka,sans-serif;font-size:14px">Ritmo de aparición</h4>' +
      '<p style="margin:0 0 8px;font-size:12px;opacity:0.8">' +
      'Las burbujas aparecen una a una. Define el orden y cuánto espera antes de pasar a la siguiente.' +
      '</p>' +
      '<div class="be-selection-only" style="display:none">' +
      '<label>Orden de aparición ' +
      '<input type="number" class="be-bubble-seq" step="1" min="0" placeholder="(orden por defecto)" ' +
      'style="width:90px;margin-left:6px" /></label>' +
      '<label>Pausa después (ms) ' +
      '<input type="number" class="be-bubble-delay" step="50" min="0" placeholder="' + DEFAULT_DELAY_AFTER + '" ' +
      'style="width:110px;margin-left:6px" /></label>' +
      '<button type="button" class="be-timing-clear" ' +
      'style="margin-top:6px;border:0;background:rgba(44,44,44,0.1);border-radius:6px;padding:6px 10px;cursor:pointer">' +
      'Restablecer ritmo</button>' +
      '</div>' +
      '<hr style="border:0;border-top:1px solid rgba(44,44,44,0.15);margin:12px 0" />' +
      '<h4 style="margin:0 0 8px;font-family:Fredoka,sans-serif;font-size:14px">Audio de la burbuja</h4>' +
      '<p style="margin:0 0 8px;font-size:12px;opacity:0.8">' +
      'Sube un clip que se reproducirá cuando la burbuja seleccionada empiece a escribirse.' +
      '</p>' +
      '<div class="be-selection-only" style="display:none">' +
      '<label>Audio<input type="file" class="be-bubble-audio" accept="audio/*" /></label>' +
      '<p class="be-bubble-audio-status" style="margin:6px 0;font-size:12px;opacity:0.8">Sin audio.</p>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button type="button" class="be-bubble-audio-preview" ' +
      'style="border:0;background:rgba(44,44,44,0.1);border-radius:6px;padding:6px 10px;cursor:pointer">▶ Probar</button>' +
      '<button type="button" class="be-bubble-audio-remove" ' +
      'style="border:0;background:rgba(211,51,51,0.15);color:#a82020;border-radius:6px;padding:6px 10px;cursor:pointer">Quitar audio</button>' +
      '</div>' +
      '</div>' +
      '</section>' +
      '<section class="be-section">' +
      '<h3>Fondo del panel actual</h3>' +
      '<label>Cambiar fondo (imagen o video)<input type="file" class="be-bg-file" accept="image/*,video/*" /></label>' +
      '<p style="margin:4px 0 6px;font-size:11px;opacity:0.7">Los videos se reproducen en bucle, silenciados, y el panel calcula su tinte a partir del primer fotograma.</p>' +
      '<button type="button" class="be-bg-remove">Quitar fondo personalizado</button>' +
      '</section>' +
      '<section class="be-section">' +
      '<h3>Agregar personaje al panel</h3>' +
      '<label>Imagen, GIF o video del personaje<input type="file" class="be-char-file" accept="image/*,video/*" /></label>' +
      '<p style="margin:6px 0;font-size:11px;opacity:0.7">Mantén <strong>Shift</strong> al redimensionar para liberar las proporciones; sin Shift, las imágenes/videos se escalan proporcionalmente.</p>' +
      '<label>Nombre<input type="text" class="be-char-name" placeholder="Nombre del personaje" /></label>' +
      '<label>Posición<select class="be-char-pos">' +
      '<option value="left">left</option>' +
      '<option value="center" selected>center</option>' +
      '<option value="right">right</option>' +
      '</select></label>' +
      '<label>Tamaño (px) <span class="be-char-size-val">150</span>' +
      '<input type="range" class="be-char-size" min="50" max="400" value="150" />' +
      '</label>' +
      '<button type="button" class="be-char-add">Agregar personaje</button>' +
      '</section>' +
      '<section class="be-section">' +
      '<h3>Galería de personajes guardados</h3>' +
      '<div class="be-gallery"></div>' +
      '</section>' +
      '<section class="be-section">' +
      '<h3>Audio del panel actual</h3>' +
      '<label>Subir audio (SFX)<input type="file" class="be-panel-audio" accept="audio/*" /></label>' +
      '<button type="button" class="be-panel-audio-remove">Quitar audio personalizado</button>' +
      '</section>' +
      '<section class="be-section">' +
      '<h3>Música general</h3>' +
      '<label>Subir música<input type="file" class="be-global-audio" accept="audio/*" /></label>' +
      '<button type="button" class="be-global-audio-toggle">Reproducir / Detener</button>' +
      '<label>Volumen <span class="be-global-vol-val">30</span>' +
      '<input type="range" class="be-global-vol" min="0" max="100" value="30" />' +
      '</label>' +
      '</section>' +
      '<section class="be-section">' +
      '<h3>Respaldo del estado</h3>' +
      '<p style="margin:0 0 8px;font-size:12px;opacity:0.8">' +
      'Guarda un archivo .json con TODO el cuento (fondos, personajes, burbujas, ' +
      'posiciones, ritmo, audio). Úsalo para mover el cuento a otro navegador ' +
      'o para tener un respaldo.' +
      '</p>' +
      '<div class="bubble-editor__actions">' +
      '<button type="button" class="be-state-export">💾 Descargar estado</button>' +
      '<button type="button" class="be-state-import">📂 Cargar estado…</button>' +
      '<input type="file" class="be-state-file" accept="application/json,.json" style="display:none" />' +
      '</div>' +
      '<p class="be-state-msg" style="margin:8px 0 0;font-size:12px;min-height:14px"></p>' +
      '</section>' +
      '<section class="be-section">' +
      '<h3>Acciones</h3>' +
      '<div class="bubble-editor__actions">' +
      '<button type="button" class="be-export">Exportar JSON</button>' +
      '<button type="button" class="be-clear">Borrar añadidas</button>' +
      '<button type="button" class="be-add-panel" style="background:#2a8a4a;color:#fff;border:0;border-radius:6px;padding:6px 10px;cursor:pointer;font-weight:600">➕ Agregar panel a esta escena</button>' +
      '<button type="button" class="be-delete-panel" style="background:#d33;color:#fff;border:0;border-radius:6px;padding:6px 10px;cursor:pointer;font-weight:600">🗑️ Eliminar panel actual</button>' +
      '</div>' +
      '<label>Export<textarea class="be-export-out" rows="8" readonly></textarea></label>' +
      '<button type="button" class="be-logout">Cerrar sesión de edición</button>' +
      '</section>' +
      '</div>';

    document.body.appendChild(toggleBtn);
    document.body.appendChild(panelEl);

    panelSelect = panelEl.querySelector('.be-panel');
    speakerSelect = panelEl.querySelector('.be-speaker');
    textArea = panelEl.querySelector('.be-text');
    positionSelect = panelEl.querySelector('.be-pos-grid');
    exportArea = panelEl.querySelector('.be-export-out');

    // Position grid: click → move selected bubble to that position.
    if (positionSelect) {
      positionSelect.addEventListener('click', onPositionGridClick);
      // Highlight active cell via inline style observer (no CSS edits).
      const styleActive = (btn, on) => {
        if (on) {
          btn.style.background = 'rgba(44,44,44,0.85)';
          btn.style.color = '#fff';
          btn.style.borderColor = 'rgba(44,44,44,1)';
        } else {
          btn.style.background = 'rgba(255,255,255,0.55)';
          btn.style.color = '#2C2C2C';
          btn.style.borderColor = 'rgba(44,44,44,0.25)';
        }
      };
      try {
        new MutationObserver((muts) => {
          muts.forEach((m) => {
            if (m.target && m.target.classList && m.target.classList.contains('be-pos-cell')) {
              styleActive(m.target, m.target.classList.contains('is-active'));
            }
          });
        }).observe(positionSelect, { attributes: true, subtree: true, attributeFilter: ['class'] });
      } catch (_) {}
    }
    // Text area: edits the selected bubble's text live.
    if (textArea) {
      textArea.addEventListener('input', onTextAreaInput);
    }

    bgFileInput = panelEl.querySelector('.be-bg-file');
    charFileInput = panelEl.querySelector('.be-char-file');
    charNameInput = panelEl.querySelector('.be-char-name');
    charPosSelect = panelEl.querySelector('.be-char-pos');
    charSizeInput = panelEl.querySelector('.be-char-size');
    galleryList = panelEl.querySelector('.be-gallery');
    panelAudioFileInput = panelEl.querySelector('.be-panel-audio');
    globalAudioFileInput = panelEl.querySelector('.be-global-audio');
    globalVolumeInput = panelEl.querySelector('.be-global-vol');
    panelListEl = panelEl.querySelector('.be-panel-list');

    if (panelListEl) {
      panelListEl.addEventListener('click', onPanelListClick);
      panelListEl.addEventListener('dragstart', onPanelListDragStart);
      panelListEl.addEventListener('dragover', onPanelListDragOver);
      panelListEl.addEventListener('drop', onPanelListDrop);
      panelListEl.addEventListener('dragend', onPanelListDragEnd);
    }

    const deletePanelBtn = panelEl.querySelector('.be-delete-panel');
    if (deletePanelBtn) deletePanelBtn.addEventListener('click', deleteCurrentPanel);
    const addPanelBtn = panelEl.querySelector('.be-add-panel');
    if (addPanelBtn) addPanelBtn.addEventListener('click', addPanelAfterCurrent);

    const charSizeVal = panelEl.querySelector('.be-char-size-val');
    charSizeInput.addEventListener('input', () => {
      if (charSizeVal) charSizeVal.textContent = charSizeInput.value;
    });

    const globalVolVal = panelEl.querySelector('.be-global-vol-val');
    // Init slider from saved value.
    try {
      const v = parseFloat(localStorage.getItem(GLOBAL_VOL_KEY));
      if (!isNaN(v)) {
        globalVolumeInput.value = String(Math.round(v * 100));
        if (globalVolVal) globalVolVal.textContent = globalVolumeInput.value;
      }
    } catch (_) {}
    globalVolumeInput.addEventListener('input', () => {
      if (globalVolVal) globalVolVal.textContent = globalVolumeInput.value;
      onGlobalVolumeChange();
    });

    toggleBtn.addEventListener('click', onToggleClick);
    panelEl.querySelector('.bubble-editor__close').addEventListener('click', close);
    panelEl.querySelector('.be-add').addEventListener('click', addBubble);
    const addCaptionBtn = panelEl.querySelector('.be-add-caption');
    if (addCaptionBtn) addCaptionBtn.addEventListener('click', addCaption);
    const sideToggle = panelEl.querySelector('.be-side-toggle');
    if (sideToggle) {
      sideToggle.addEventListener('click', (e) => {
        const btn = e.target.closest('.be-side-btn');
        if (!btn) return;
        setSelectedBubbleSide(btn.dataset.side);
      });
    }
    const bubbleTypeSel = panelEl.querySelector('.be-bubble-type');
    if (bubbleTypeSel) {
      bubbleTypeSel.addEventListener('change', () => {
        // If a bubble is selected, mutate its type; otherwise it's just a draft
        // value for the next "Agregar burbuja".
        const sel = getSelectedBubble();
        if (sel && !sel.classList.contains('character-overlay')) {
          setSelectedBubbleType(bubbleTypeSel.value);
        }
      });
    }
    panelEl.querySelector('.be-export').addEventListener('click', exportChapterJson);
    panelEl.querySelector('.be-clear').addEventListener('click', clearAddedBubbles);
    panelEl.querySelector('.be-bg-remove').addEventListener('click', removeCustomBackground);
    panelEl.querySelector('.be-char-add').addEventListener('click', onAddCharacter);
    panelEl.querySelector('.be-panel-audio-remove').addEventListener('click', removePanelAudio);
    panelEl.querySelector('.be-global-audio-toggle').addEventListener('click', toggleGlobalAudio);
    panelEl.querySelector('.be-logout').addEventListener('click', logoutEditMode);

    // Timing inputs (sequence + delay after)
    const seqInput = panelEl.querySelector('.be-bubble-seq');
    const delayInput = panelEl.querySelector('.be-bubble-delay');
    const timingClearBtn = panelEl.querySelector('.be-timing-clear');
    function applyTimingFromInputs() {
      const sel = getSelectedBubble();
      if (!sel || sel.classList.contains('character-overlay')) return;
      const seqVal = seqInput && seqInput.value !== '' ? seqInput.value : null;
      const delayVal = delayInput && delayInput.value !== '' ? delayInput.value : null;
      setBubbleTiming(sel, seqVal, delayVal);
    }
    if (seqInput) {
      seqInput.addEventListener('input', applyTimingFromInputs);
      seqInput.addEventListener('change', applyTimingFromInputs);
    }
    if (delayInput) {
      delayInput.addEventListener('input', applyTimingFromInputs);
      delayInput.addEventListener('change', applyTimingFromInputs);
    }
    if (timingClearBtn) {
      timingClearBtn.addEventListener('click', () => {
        const sel = getSelectedBubble();
        if (!sel) return;
        if (seqInput) seqInput.value = '';
        if (delayInput) delayInput.value = '';
        setBubbleTiming(sel, null, null);
      });
    }

    // Per-bubble audio
    const bubbleAudioInput = panelEl.querySelector('.be-bubble-audio');
    const bubbleAudioStatus = panelEl.querySelector('.be-bubble-audio-status');
    const bubbleAudioPreviewBtn = panelEl.querySelector('.be-bubble-audio-preview');
    const bubbleAudioRemoveBtn = panelEl.querySelector('.be-bubble-audio-remove');
    if (bubbleAudioInput) {
      bubbleAudioInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const sel = getSelectedBubble();
        if (!sel || sel.classList.contains('character-overlay')) {
          alert('Selecciona primero la burbuja a la que quieres agregar audio.');
          e.target.value = '';
          return;
        }
        try {
          const dataURL = await readFileAsDataURL(file);
          let src = dataURL;
          if (window.Comic.RepoSync && window.Comic.RepoSync.uploadDataUrl) {
            const uploaded = await window.Comic.RepoSync.uploadDataUrl(dataURL, file.name);
            if (uploaded) src = uploaded;
          }
          persistBubbleAudio(sel, src);
          syncBubbleAudioStatus(sel);
        } catch (err) {
          console.warn('[BubbleEditor] bubble audio read failed:', err);
        } finally {
          e.target.value = '';
        }
      });
    }
    if (bubbleAudioRemoveBtn) {
      bubbleAudioRemoveBtn.addEventListener('click', () => {
        const sel = getSelectedBubble();
        if (!sel || sel.classList.contains('character-overlay')) return;
        persistBubbleAudio(sel, null);
        syncBubbleAudioStatus(sel);
      });
    }
    if (bubbleAudioPreviewBtn) {
      bubbleAudioPreviewBtn.addEventListener('click', () => {
        const sel = getSelectedBubble();
        if (!sel) return;
        const src = getBubbleAudioSrc(sel);
        if (!src) { alert('Esta burbuja todavía no tiene audio.'); return; }
        if (window.Comic.AudioManager && window.Comic.AudioManager.playBubbleAudio) {
          window.Comic.AudioManager.playBubbleAudio(src, { bubbleId: sel.dataset.bubbleId });
        }
      });
    }

    // Font-size slider + auto-fit
    const fontSizeInput = panelEl.querySelector('.be-font-size');
    const fontSizeVal = panelEl.querySelector('.be-font-size-val');
    if (fontSizeInput) {
      let fontBefore = null;
      let fontTargetEl = null;
      fontSizeInput.addEventListener('pointerdown', () => {
        const b = getActiveBubble();
        fontTargetEl = b;
        if (b) fontBefore = Math.round(parseFloat(getComputedStyle(b).fontSize) || 22);
      });
      fontSizeInput.addEventListener('input', () => {
        if (fontSizeVal) fontSizeVal.textContent = fontSizeInput.value;
        applyFontSizeToActiveBubble(parseInt(fontSizeInput.value, 10));
      });
      fontSizeInput.addEventListener('change', () => {
        if (fontTargetEl && fontBefore != null) {
          const after = parseInt(fontSizeInput.value, 10);
          if (after !== fontBefore) {
            History.push({ type: 'font', el: fontTargetEl, before: fontBefore, after: after });
          }
        }
        fontBefore = null;
        fontTargetEl = null;
      });
    }
    const autoFitBtn = panelEl.querySelector('.be-font-auto');
    if (autoFitBtn) autoFitBtn.addEventListener('click', () => {
      const b = getActiveBubble();
      if (!b) return;
      const before = Math.round(parseFloat(getComputedStyle(b).fontSize) || 22);
      autoFitActiveBubble();
      const after = Math.round(parseFloat(getComputedStyle(b).fontSize) || 22);
      if (after !== before) History.push({ type: 'font', el: b, before: before, after: after });
    });

    bgFileInput.addEventListener('change', onBgFileChange);
    panelAudioFileInput.addEventListener('change', onPanelAudioChange);
    globalAudioFileInput.addEventListener('change', onGlobalAudioChange);
    galleryList.addEventListener('click', onGalleryClick);

    // State snapshot: export to JSON file / import from JSON file.
    const stateExportBtn = panelEl.querySelector('.be-state-export');
    const stateImportBtn = panelEl.querySelector('.be-state-import');
    const stateFileInput = panelEl.querySelector('.be-state-file');
    const stateMsg = panelEl.querySelector('.be-state-msg');
    function showStateMsg(text, isError) {
      if (!stateMsg) return;
      stateMsg.textContent = text || '';
      stateMsg.style.color = isError ? '#d33' : '#2a7a3a';
      if (text) setTimeout(() => { if (stateMsg.textContent === text) stateMsg.textContent = ''; }, 5000);
    }
    if (stateExportBtn) {
      stateExportBtn.addEventListener('click', () => {
        try {
          if (window.Comic.StoryState) window.Comic.StoryState.downloadJSON();
          showStateMsg('Estado descargado.');
        } catch (err) {
          showStateMsg('No se pudo descargar: ' + err.message, true);
        }
      });
    }
    if (stateImportBtn && stateFileInput) {
      stateImportBtn.addEventListener('click', () => stateFileInput.click());
      stateFileInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!window.Comic.StoryState) {
          showStateMsg('Módulo de estado no disponible.', true);
          return;
        }
        const replace = confirm(
          'Importar estado del archivo:\n\n' +
          'OK = REEMPLAZAR el estado actual (borra lo de este navegador).\n' +
          'Cancelar = FUSIONAR con lo existente.'
        );
        try {
          await window.Comic.StoryState.importFromFile(file, { replace: replace, reload: true });
          showStateMsg('Estado importado. Recargando…');
        } catch (err) {
          showStateMsg('Archivo inválido: ' + err.message, true);
        } finally {
          stateFileInput.value = '';
        }
      });
    }

    document.addEventListener('panel:enter', (e) => {
      if (!isOpen || !panelSelect) return;
      const id = e.detail && e.detail.id;
      if (id && panelSelect.value !== id) {
        const opt = Array.from(panelSelect.options).find((o) => o.value === id);
        if (opt) panelSelect.value = id;
      }
      // Sync font-size slider to the active bubble of the new panel.
      const b = getActiveBubble();
      if (b) syncFontSliderToBubble(b);
    });

    if (panelSelect) {
      panelSelect.addEventListener('change', () => {
        const b = getActiveBubble();
        if (b) syncFontSliderToBubble(b);
      });
    }

    // Global keyboard shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z.
    document.addEventListener('keydown', onGlobalKeydown);
    // Global click → handles deselect when clicking empty area.
    document.addEventListener('click', onGlobalClickForSelection);
  }

  function onGlobalKeydown(e) {
    if (!isEditUnlocked() || !isOpen) return;
    // Don't interfere when typing into a text field inside the editor.
    const tgt = e.target;
    if (tgt && (tgt.tagName === 'TEXTAREA' || (tgt.tagName === 'INPUT' && /^(text|password|number|search)$/i.test(tgt.type || 'text')))) {
      return;
    }
    const key = (e.key || '').toLowerCase();
    // Delete / Backspace deletes the currently selected bubble or character.
    if (key === 'delete' || key === 'backspace') {
      const sel = getSelectedBubble();
      if (sel) {
        e.preventDefault();
        if (sel.classList.contains('character-overlay')) {
          if (confirm('¿Eliminar este personaje? Puedes deshacerlo con Ctrl+Z.')) {
            removeCharacter(sel, true);
          }
        } else {
          if (confirm('¿Eliminar esta burbuja? Puedes deshacerlo con Ctrl+Z.')) {
            removeBubble(sel, true);
          }
        }
      }
      return;
    }
    const isMod = e.ctrlKey || e.metaKey;
    if (!isMod) return;
    if (key === 'z' && !e.shiftKey) {
      e.preventDefault();
      History.undo();
    } else if ((key === 'y') || (key === 'z' && e.shiftKey)) {
      e.preventDefault();
      History.redo();
    }
  }

  function removeCharacter(el, recordHistory) {
    if (!el || !el.parentNode) return;
    const parent = el.parentNode;
    const anchorNextSibling = el.nextSibling;
    const characterId = el.dataset.characterId;
    // Remove from comic-user-characters
    const chars = loadCharacters();
    const filtered = chars.filter((c) => c.id !== characterId);
    saveCharacters(filtered);
    // Remove from positions/sizes too
    const positions = loadCharPos();
    delete positions[characterId];
    saveCharPos(positions);
    const sizes = loadJSON('comic-character-sizes', {});
    delete sizes[characterId];
    saveJSON('comic-character-sizes', sizes);

    const html = el.outerHTML;
    el.remove();

    if (recordHistory) {
      History.push({
        type: 'deleteCharacter',
        html: html,
        parent: parent,
        anchorNextSibling: anchorNextSibling,
        characterId: characterId,
      });
    }
  }

  function onToggleClick() {
    if (isEditUnlocked()) {
      if (isOpen) close();
      else open();
    } else {
      openPasswordModal();
    }
  }

  function open() {
    if (!panelEl) return;
    if (!isEditUnlocked()) {
      openPasswordModal();
      return;
    }
    refreshPanelSelect();
    renderPanelList();
    panelEl.classList.add('is-open');
    panelEl.setAttribute('aria-hidden', 'false');
    isOpen = true;
    applyEditableClass();
    bindAllDraggables();
    // Mientras se edita, no escondemos burbujas pendientes: las mostramos
    // todas para poder seleccionarlas y editarlas sin esperar al typewriter.
    if (window.Comic.Typewriter && window.Comic.Typewriter.revealAll) {
      window.Comic.Typewriter.revealAll();
    }
  }

  function close() {
    if (!panelEl) return;
    panelEl.classList.remove('is-open');
    panelEl.setAttribute('aria-hidden', 'true');
    isOpen = false;
    applyEditableClass();
  }

  function restoreAll() {
    restoreFromStorage();
    restoreBackgrounds();
    restoreCharacters();
    if (window.Comic.PanelLoader) {
      if (window.Comic.PanelLoader.applyStoredBubblePositions) {
        window.Comic.PanelLoader.applyStoredBubblePositions();
      }
      if (window.Comic.PanelLoader.applyStoredCharacterPositions) {
        window.Comic.PanelLoader.applyStoredCharacterPositions();
      }
      if (window.Comic.PanelLoader.applyStoredBubbleSizes) {
        window.Comic.PanelLoader.applyStoredBubbleSizes();
      }
      if (window.Comic.PanelLoader.applyStoredCharacterSizes) {
        window.Comic.PanelLoader.applyStoredCharacterSizes();
      }
    } else {
      // Fallback: apply sizes from localStorage directly.
      applySizesFallback();
    }
    markPlacedFromStorage();
    applyStoredFontSizes();
    applyStoredTextOverrides();
    applyStoredTiming();
    applyStoredBubbleTypes();
    applyStoredBubbleSides();
    applyStoredBubbleAudio();
    refreshPanelSelect();
    renderPanelList();
    renderGallery();
    bindAllDraggables();

    // Restore unlocked state class on <html> for the session.
    if (isEditUnlocked()) {
      document.documentElement.classList.add('edit-mode-unlocked');
    }
  }

  function applySizesFallback() {
    const bsizes = loadJSON('comic-bubble-sizes', {});
    Object.keys(bsizes).forEach((id) => {
      const el = document.querySelector('.bubble[data-bubble-id="' + id.replace(/"/g, '\\"') + '"]');
      if (!el) return;
      const sz = bsizes[id] || {};
      if (typeof sz.w === 'number') el.style.width = sz.w + 'px';
      if (typeof sz.h === 'number') el.style.height = sz.h + 'px';
    });
    const csizes = loadJSON('comic-character-sizes', {});
    Object.keys(csizes).forEach((id) => {
      const el = document.querySelector('.character-overlay[data-character-id="' + id.replace(/"/g, '\\"') + '"]');
      if (!el) return;
      const sz = csizes[id] || {};
      if (typeof sz.w === 'number') el.style.width = sz.w + 'px';
      if (typeof sz.h === 'number') el.style.height = sz.h + 'px';
    });
  }

  function markPlacedFromStorage() {
    // Mark elements with stored positions/sizes so the CSS can suppress the
    // panel-enter animation that would otherwise reset their visual state.
    const bpos = loadBubblePos();
    Object.keys(bpos).forEach((id) => {
      const el = document.querySelector('.bubble[data-bubble-id="' + id.replace(/"/g, '\\"') + '"]');
      if (el) {
        el.dataset.placed = '1';
        el.classList.add('bubble--placed');
      }
    });
    const cpos = loadCharPos();
    Object.keys(cpos).forEach((id) => {
      const el = document.querySelector('.character-overlay[data-character-id="' + id.replace(/"/g, '\\"') + '"]');
      if (el) {
        el.dataset.placed = '1';
      }
    });
  }

  function init() {
    buildUI();
    if (document.querySelectorAll('.panel').length > 0) {
      restoreAll();
    } else {
      document.addEventListener('panels:loaded', restoreAll, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  const api = {
    init: init,
    open: open,
    close: close,
    addBubble: addBubble,
    exportChapterJson: exportChapterJson,
    clearAddedBubbles: clearAddedBubbles,
    isUnlocked: isEditUnlocked,
    unlock: () => setEditUnlocked(true),
    logout: logoutEditMode,
    applySizes: applySizesFallback,
    bindAllDraggables: bindAllDraggables,
    // Undo / redo
    undo: () => History.undo(),
    redo: () => History.redo(),
    canUndo: () => History.canUndo(),
    canRedo: () => History.canRedo(),
    history: History,
    // Panel ops
    removePanelById: removePanelById,
    restorePanel: restorePanel,
    deleteCurrentPanel: deleteCurrentPanel,
    addPanelAfterCurrent: addPanelAfterCurrent,
    renderPanelList: renderPanelList,
    applyPanelOrder: applyPanelOrderList,
    // Bubble ops
    removeBubble: removeBubble,
    restoreBubble: restoreBubble,
  };

  window.BubbleEditor = api;
  window.Comic.BubbleEditor = api;
  window.Editor = api;
})();
