(function () {
  'use strict';

  window.Comic = window.Comic || {};

  const MOBILE_BREAKPOINT = 768;

  function detectDevice() {
    const isMobile = window.innerWidth <= MOBILE_BREAKPOINT;
    const html = document.documentElement;
    html.classList.toggle('is-mobile', isMobile);
    html.classList.toggle('is-desktop', !isMobile);
    window.Comic.isMobile = isMobile;
    return isMobile;
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }

  function hidePreloader() {
    const pre = document.getElementById('preloader');
    if (!pre) return;
    pre.classList.add('hidden');
    // Remove after transition so it never blocks input.
    setTimeout(() => {
      if (pre.parentNode) pre.parentNode.removeChild(pre);
    }, 800);
  }

  async function bootstrap() {
    detectDevice();

    window.addEventListener(
      'resize',
      debounce(() => {
        const wasMobile = window.Comic.isMobile;
        const nowMobile = detectDevice();
        if (wasMobile !== nowMobile) {
          document.dispatchEvent(
            new CustomEvent('device:change', { detail: { isMobile: nowMobile } })
          );
        }
      }, 150)
    );

    try {
      if (window.Comic.PanelLoader && typeof window.Comic.PanelLoader.init === 'function') {
        await window.Comic.PanelLoader.init();
      }
    } catch (err) {
      console.error('[Comic] PanelLoader failed:', err);
    }

    try {
      if (window.Comic.ScrollManager && typeof window.Comic.ScrollManager.init === 'function') {
        window.Comic.ScrollManager.init();
      }
    } catch (err) {
      console.error('[Comic] ScrollManager failed:', err);
    }

    try {
      if (window.Comic.AudioManager && typeof window.Comic.AudioManager.init === 'function') {
        window.Comic.AudioManager.init();
      }
    } catch (err) {
      console.error('[Comic] AudioManager failed:', err);
    }

    hidePreloader();
    document.dispatchEvent(new CustomEvent('comic:ready'));

    // Indicador de capítulo: actualizar el total y seguir el panel visible.
    initChapterIndicator();

    // Immersion layer (particles). Loaded dynamically so HTML doesn't need to change.
    try {
      await loadImmersion();
      if (window.Comic.Immersion && typeof window.Comic.Immersion.start === 'function') {
        window.Comic.Immersion.start();
      }
    } catch (err) {
      console.warn('[Comic] Immersion failed to load:', err);
    }
  }

  function initChapterIndicator() {
    const numEl = document.getElementById('chapter-indicator-number');
    const totalEl = document.getElementById('chapter-indicator-total');
    if (!numEl || !totalEl) return;

    const chapters = Array.from(document.querySelectorAll('.chapter[data-chapter]'));
    const total = chapters.length;
    if (total > 0) totalEl.textContent = String(total);

    function setActive(chapterId) {
      if (chapterId == null) return;
      const str = String(chapterId);
      if (numEl.textContent !== str) numEl.textContent = str;
    }

    // Inicial: el primer capítulo cargado.
    if (chapters[0]) setActive(chapters[0].dataset.chapter);

    document.addEventListener('panel:enter', (e) => {
      const id = e.detail && e.detail.chapter;
      if (id) setActive(id);
    });
  }

  function loadImmersion() {
    return new Promise((resolve, reject) => {
      if (window.Comic.Immersion) return resolve();
      const existing = document.querySelector('script[data-immersion]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', reject);
        return;
      }
      const s = document.createElement('script');
      s.src = 'js/immersion.js';
      s.defer = true;
      s.setAttribute('data-immersion', '1');
      s.onload = () => resolve();
      s.onerror = (e) => reject(e);
      document.head.appendChild(s);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  window.Comic.bootstrap = bootstrap;
})();
