// NOTA: Este módulo debe agregarse al <head> del index.html ANTES de main.js.
// Expone window.Typewriter y window.Comic.Typewriter.
// Recomendado: <script src="js/typewriter.js"></script> antes de los demás módulos.
(function () {
  'use strict';

  window.Comic = window.Comic || {};

  const DEFAULT_SPEED = 35;
  const PUNCT_PAUSE = { '.': 220, ',': 120, '!': 240, '?': 240, ';': 160, ':': 140 };
  const FADE_MS = 280;

  let nextId = 1;
  const controllers = {};
  const bubbleToController = new WeakMap();

  function cancel(id) {
    const ctrl = controllers[id];
    if (!ctrl) return;
    ctrl.cancelled = true;
    if (ctrl.timeoutId) clearTimeout(ctrl.timeoutId);
    delete controllers[id];
  }

  // Find the typed/rest spans within the bubble container. Returns null if not present.
  function getTypewriterParts(element) {
    if (!element) return null;
    const typed = element.querySelector('.tw-typed, .dialogue__typed');
    const rest = element.querySelector('.tw-rest');
    if (typed && rest) return { typed: typed, rest: rest };
    return null;
  }

  function type(element, text, speedMs) {
    if (!element) return null;
    speedMs = typeof speedMs === 'number' ? speedMs : DEFAULT_SPEED;

    // Cancel any in-progress typing on this element.
    const prev = bubbleToController.get(element);
    if (prev) cancel(prev.id);

    const id = nextId++;
    const ctrl = {
      id: id,
      cancelled: false,
      timeoutId: null,
      element: element,
      finish: function () {},
    };
    controllers[id] = ctrl;
    bubbleToController.set(element, ctrl);

    const parts = getTypewriterParts(element);
    const caret = element.querySelector('.caret');
    element.classList.add('typing');
    element.classList.remove('tw-done');
    if (caret) caret.style.display = '';

    if (parts) {
      // New mode: typed + rest spans. Reserve full text in rest, reveal letter-by-letter.
      parts.typed.textContent = '';
      parts.rest.textContent = text;

      const total = text.length;
      let i = 0;

      function step() {
        if (ctrl.cancelled) return;
        if (i >= total) {
          element.classList.remove('typing');
          element.classList.add('tw-done');
          if (caret) caret.style.display = 'none';
          parts.rest.textContent = '';
          delete controllers[id];
          if (typeof ctrl.finish === 'function') ctrl.finish();
          return;
        }
        const ch = text.charAt(i);
        parts.typed.textContent += ch;
        // Remove first char from rest (preserves layout reservation only for what hasn't been typed).
        parts.rest.textContent = text.slice(i + 1);
        i++;
        let delay = speedMs;
        if (PUNCT_PAUSE[ch] != null) delay += PUNCT_PAUSE[ch];
        ctrl.timeoutId = setTimeout(step, delay);
      }

      ctrl.timeoutId = setTimeout(step, speedMs);
    } else {
      // Fallback: write directly to the element's first reasonable typed target.
      const typedEl = element.querySelector('.dialogue__typed') || element;
      typedEl.textContent = '';

      let i = 0;
      const total = text.length;

      function step() {
        if (ctrl.cancelled) return;
        if (i >= total) {
          element.classList.remove('typing');
          element.classList.add('tw-done');
          if (caret) caret.style.display = 'none';
          delete controllers[id];
          if (typeof ctrl.finish === 'function') ctrl.finish();
          return;
        }
        const ch = text.charAt(i);
        typedEl.textContent += ch;
        i++;
        let delay = speedMs;
        if (PUNCT_PAUSE[ch] != null) delay += PUNCT_PAUSE[ch];
        ctrl.timeoutId = setTimeout(step, delay);
      }

      ctrl.timeoutId = setTimeout(step, speedMs);
    }

    return {
      id: id,
      cancel: function () {
        cancel(id);
      },
    };
  }

  function fadeIn(element) {
    if (!element) return;
    // Use rAF to ensure transition applies even if opacity was inline.
    requestAnimationFrame(() => {
      element.style.transition = 'opacity ' + FADE_MS + 'ms ease-out';
      element.style.opacity = '1';
    });
  }

  function getFullText(bubble) {
    const p = bubble.querySelector('.dialogue__text');
    if (p) {
      const attr = p.getAttribute('data-full-text');
      if (attr) return attr;
    }
    return bubble.getAttribute('data-full-text') || bubble.dataset.fullText || '';
  }

  function resetBubble(bubble) {
    const ctrl = bubbleToController.get(bubble);
    if (ctrl) cancel(ctrl.id);
    const parts = getTypewriterParts(bubble);
    if (parts) {
      parts.typed.textContent = '';
      // Restore the rest to the full text so layout stays reserved.
      const full = getFullText(bubble);
      parts.rest.textContent = full;
    } else {
      const typedEl = bubble.querySelector('.dialogue__typed');
      if (typedEl) typedEl.textContent = '';
    }
    const caret = bubble.querySelector('.caret');
    if (caret) caret.style.display = '';
    bubble.classList.remove('typing');
    bubble.classList.remove('tw-done');
    bubble.classList.remove('bubble--entering');
    bubble.classList.remove('bubble--pending');
    bubble.style.opacity = '0';
    bubble.dataset.typed = '';
  }

  function typewriteBubble(bubble, opts) {
    if (!bubble) return null;
    opts = opts || {};
    const text = opts.text || getFullText(bubble);
    if (!text) return null;
    // If already fully typed and not forced, skip.
    if (bubble.dataset.typed === '1' && !opts.force) {
      bubble.style.opacity = '1';
      return null;
    }
    fadeIn(bubble);
    // The target for typing is the bubble itself (type() will look up parts).
    const handle = type(bubble, text, opts.speed);
    if (handle) {
      const ctrl = controllers[handle.id];
      if (ctrl) {
        ctrl.finish = function () {
          bubble.dataset.typed = '1';
        };
      }
    }
    return handle;
  }

  // ---- Sequential per-panel orchestration ----------------------------------
  // Bubbles in the same panel appear one-by-one in order (data-sequence asc,
  // fallback to DOM order). After each bubble finishes typing, we wait
  // data-delay-after ms (default DEFAULT_DELAY_AFTER) before starting the next.
  const DEFAULT_DELAY_AFTER = 300;
  const panelStates = new WeakMap();

  function bubbleOrder(b) {
    const raw = b && b.dataset ? b.dataset.sequence : '';
    const seq = parseFloat(raw);
    if (!isNaN(seq)) return seq;
    const parent = b.parentNode;
    if (!parent) return 0;
    return Array.prototype.indexOf.call(parent.children, b);
  }

  function getPanelState(panel) {
    if (!panel) return null;
    let s = panelStates.get(panel);
    if (!s) {
      s = { queue: [], scheduled: false, running: false, currentBubble: null, timeoutId: 0 };
      panelStates.set(panel, s);
    }
    return s;
  }

  function stopBubbleAudioFor(bubble) {
    if (!bubble || !bubble.dataset) return;
    const id = bubble.dataset.bubbleId;
    if (id && window.Comic && window.Comic.AudioManager &&
        typeof window.Comic.AudioManager.stopBubbleAudio === 'function') {
      window.Comic.AudioManager.stopBubbleAudio(id);
    }
  }

  function clearPanelState(panel) {
    const s = panelStates.get(panel);
    if (!s) return;
    if (s.timeoutId) { clearTimeout(s.timeoutId); s.timeoutId = 0; }
    if (s.currentBubble) {
      const ctrl = bubbleToController.get(s.currentBubble);
      if (ctrl) cancel(ctrl.id);
      stopBubbleAudioFor(s.currentBubble);
      s.currentBubble.classList.remove('bubble--entering', 'bubble--pending');
    }
    s.queue.forEach(function (b) {
      stopBubbleAudioFor(b);
      if (b && b.classList) b.classList.remove('bubble--entering', 'bubble--pending');
    });
    // Belt-and-suspenders: detener cualquier audio activo de burbujas del panel,
    // incluso si la cola ya estaba vacía (audio largo que sigue después de tipear).
    if (panel && panel.querySelectorAll) {
      panel.querySelectorAll('.bubble[data-audio]').forEach(stopBubbleAudioFor);
    }
    s.queue.length = 0;
    s.running = false;
    s.scheduled = false;
    s.currentBubble = null;
  }

  function typewriteBubbleWithCallback(bubble, cb) {
    const handle = typewriteBubble(bubble);
    if (!handle) { cb(); return; }
    const ctrl = controllers[handle.id];
    if (!ctrl) { setTimeout(cb, 0); return; }
    const prev = ctrl.finish;
    ctrl.finish = function () {
      try { if (typeof prev === 'function') prev(); } catch (_) {}
      cb();
    };
  }

  function advance(panel) {
    const s = getPanelState(panel);
    if (!s) return;
    const bubble = s.queue.shift();
    if (!bubble) {
      s.running = false;
      s.currentBubble = null;
      return;
    }
    s.currentBubble = bubble;
    // Reveal: stop being "pending", play the entrance animation.
    bubble.classList.remove('bubble--pending');
    bubble.classList.add('bubble--entering');
    // Trigger per-bubble audio if defined (set by editor or chapter JSON).
    const audioSrc = bubble.dataset && bubble.dataset.audio;
    if (audioSrc && window.Comic && window.Comic.AudioManager &&
        typeof window.Comic.AudioManager.playBubbleAudio === 'function') {
      window.Comic.AudioManager.playBubbleAudio(audioSrc, {
        bubbleId: bubble.dataset.bubbleId || null,
      });
    }
    typewriteBubbleWithCallback(bubble, () => {
      // Strip the --entering class shortly after typing completes so the
      // bubble settles into its final styles without the keyframed transform.
      setTimeout(function () { bubble.classList.remove('bubble--entering'); }, 60);
      const raw = bubble.dataset.delayAfter;
      const n = parseInt(raw, 10);
      const wait = isNaN(n) ? DEFAULT_DELAY_AFTER : Math.max(0, n);
      s.timeoutId = setTimeout(() => advance(panel), wait);
    });
  }

  function flushPanel(panel) {
    const s = getPanelState(panel);
    if (!s) return;
    s.scheduled = false;
    if (s.running) return;
    s.queue.sort((a, b) => bubbleOrder(a) - bubbleOrder(b));
    s.running = true;
    // Esperar al gesto de desbloqueo: si avanzamos antes, playBubbleAudio
    // se queda en silencio (chequea !unlocked) y la primera burbuja se tipea
    // sin sonido.
    const AM = window.Comic && window.Comic.AudioManager;
    if (AM && typeof AM.isUnlocked === 'function' && !AM.isUnlocked()) {
      document.addEventListener('audio:unlocked', function () {
        advance(panel);
      }, { once: true });
      return;
    }
    advance(panel);
  }

  function bubbleHasText(bubble) {
    const t = (getFullText(bubble) || '').trim();
    return t.length > 0;
  }

  function isEditMode() {
    try {
      return document.documentElement.classList.contains('editor-open');
    } catch (_) { return false; }
  }

  function revealBubbleFull(bubble) {
    if (!bubble) return;
    const ctrl = bubbleToController.get(bubble);
    if (ctrl) cancel(ctrl.id);
    const text = getFullText(bubble);
    const parts = getTypewriterParts(bubble);
    if (parts) {
      parts.typed.textContent = text;
      parts.rest.textContent = '';
    } else {
      const typedEl = bubble.querySelector('.dialogue__typed');
      if (typedEl) typedEl.textContent = text;
    }
    const caret = bubble.querySelector('.caret');
    if (caret) caret.style.display = 'none';
    bubble.classList.remove('typing', 'bubble--pending', 'bubble--entering');
    bubble.classList.add('tw-done');
    bubble.style.opacity = '1';
    bubble.dataset.typed = '1';
  }

  function revealAll() {
    document.querySelectorAll('.bubble').forEach((b) => {
      if (bubbleHasText(b)) {
        revealBubbleFull(b);
      } else {
        b.classList.add('bubble--empty');
        b.classList.remove('bubble--pending', 'bubble--entering');
      }
    });
    // Clear any in-flight per-panel queues.
    document.querySelectorAll('.panel').forEach((panel) => {
      const s = panelStates.get(panel);
      if (!s) return;
      if (s.timeoutId) { clearTimeout(s.timeoutId); s.timeoutId = 0; }
      s.queue.length = 0;
      s.running = false;
      s.scheduled = false;
      s.currentBubble = null;
    });
  }

  function onBubbleTypewrite(e) {
    const bubble = e.detail && e.detail.bubble;
    if (!bubble) return;

    // Empty bubbles: never enqueue, never animate. CSS hides them outside
    // edit mode; in edit mode they appear semitransparent so they can be
    // selected and given text.
    if (!bubbleHasText(bubble)) {
      bubble.classList.add('bubble--empty');
      bubble.classList.remove('bubble--pending', 'bubble--entering');
      bubble.style.opacity = '0';
      return;
    }
    bubble.classList.remove('bubble--empty');

    // Edit mode: skip sequencing — show full text immediately so the author
    // can see and select every bubble at once.
    if (isEditMode()) {
      revealBubbleFull(bubble);
      return;
    }

    // Reset if it was previously typed so it re-types on re-entry.
    if (bubble.dataset.typed === '1') resetBubble(bubble);

    const panel = bubble.closest ? (bubble.closest('.panel') || bubble.parentNode) : bubble.parentNode;
    const s = getPanelState(panel);
    if (!s) {
      // Fallback: type immediately.
      typewriteBubble(bubble);
      return;
    }
    if (s.queue.indexOf(bubble) === -1 && s.currentBubble !== bubble) {
      // Hide the bubble until its turn arrives. CSS does the rest.
      bubble.classList.add('bubble--pending');
      bubble.classList.remove('bubble--entering');
      s.queue.push(bubble);
    }
    if (!s.scheduled && !s.running) {
      s.scheduled = true;
      // Coalesce all bubble:typewrite events fired in the same tick.
      requestAnimationFrame(() => flushPanel(panel));
    }
  }

  function onBubbleReset(e) {
    const bubble = e.detail && e.detail.bubble;
    if (!bubble) return;
    stopBubbleAudioFor(bubble);
    const panel = bubble.closest ? (bubble.closest('.panel') || bubble.parentNode) : bubble.parentNode;
    clearPanelState(panel);
    resetBubble(bubble);
  }

  function init() {
    document.addEventListener('bubble:typewrite', onBubbleTypewrite);
    document.addEventListener('bubble:reset', onBubbleReset);
  }

  // Auto-init on DOM ready so consumers don't have to call it.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  const api = {
    type: type,
    typewriteBubble: typewriteBubble,
    reset: resetBubble,
    cancel: cancel,
    init: init,
    revealAll: revealAll,
    revealBubble: revealBubbleFull,
  };

  window.Typewriter = api;
  window.Comic.Typewriter = api;
})();
