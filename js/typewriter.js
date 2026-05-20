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

  function onBubbleTypewrite(e) {
    const bubble = e.detail && e.detail.bubble;
    if (!bubble) return;
    // Reset if it was previously typed so it re-types on re-entry.
    if (bubble.dataset.typed === '1') {
      resetBubble(bubble);
    }
    // Small stagger if multiple bubbles in the same panel.
    const siblings = bubble.parentNode
      ? bubble.parentNode.querySelectorAll('.dialogue')
      : [bubble];
    const index = Array.prototype.indexOf.call(siblings, bubble);
    const delay = Math.max(0, index) * 350;
    setTimeout(() => typewriteBubble(bubble), delay);
  }

  function onBubbleReset(e) {
    const bubble = e.detail && e.detail.bubble;
    if (!bubble) return;
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
  };

  window.Typewriter = api;
  window.Comic.Typewriter = api;
})();
