(function () {
  'use strict';

  window.Comic = window.Comic || {};

  const PANEL_SELECTOR = '.panel';
  const PARALLAX_FACTOR = 0.15;

  let observer = null;
  let panels = [];
  let activePanelId = null;
  let parallaxTicking = false;

  function emitPanelEnter(panel) {
    const id = panel.dataset.panelId;
    if (id === activePanelId) return;
    activePanelId = id;
    document.dispatchEvent(
      new CustomEvent('panel:enter', {
        detail: {
          id: id,
          chapter: panel.dataset.chapter,
          ambient: panel.dataset.ambient || null,
          sfx: panel.dataset.sfx || null,
          element: panel,
        },
      })
    );
    // Fire typewriter event for each dialogue bubble in the panel.
    const bubbles = panel.querySelectorAll('.dialogue');
    bubbles.forEach((bubble) => {
      document.dispatchEvent(
        new CustomEvent('bubble:typewrite', {
          detail: { bubble: bubble, panel: panel, panelId: id },
        })
      );
    });
  }

  function onPanelLeave(panel) {
    // When a panel leaves, mark its bubbles so they can re-type next time.
    const bubbles = panel.querySelectorAll('.dialogue');
    bubbles.forEach((bubble) => {
      document.dispatchEvent(
        new CustomEvent('bubble:reset', {
          detail: { bubble: bubble, panel: panel },
        })
      );
    });
  }

  function applyParallax() {
    parallaxTicking = false;
    const vh = window.innerHeight;
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      const bg = panel.querySelector('.panel-bg');
      if (!bg) continue;
      const rect = panel.getBoundingClientRect();
      // Only animate panels close to / inside viewport.
      if (rect.bottom < -vh || rect.top > vh * 2) continue;
      const center = rect.top + rect.height / 2;
      const offset = (center - vh / 2) * PARALLAX_FACTOR;
      bg.style.transform = 'translate3d(0,' + (-offset).toFixed(2) + 'px,0)';
    }
  }

  function onScrollDesktop() {
    if (parallaxTicking) return;
    parallaxTicking = true;
    window.requestAnimationFrame(applyParallax);
  }

  function setupObserver(isMobile) {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    const threshold = isMobile ? 0.5 : 0.25;

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const panel = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
            if (!isMobile) panel.classList.add('in-view');
            emitPanelEnter(panel);
          } else if (!entry.isIntersecting) {
            // NOTE: no quitamos .in-view — una vez visto un panel, queda visible.
            // Evita el "titilar" cuando el scroll roza el límite del viewport.
            if (panel.dataset.panelId === activePanelId) {
              activePanelId = null;
            }
            onPanelLeave(panel);
          }
        });
      },
      {
        threshold: [threshold],
        rootMargin: '0px',
      }
    );

    panels.forEach((p) => observer.observe(p));
  }

  function collectPanels() {
    panels = Array.from(document.querySelectorAll(PANEL_SELECTOR));
  }

  function refresh() {
    collectPanels();
    const isMobile = !!window.Comic.isMobile;
    setupObserver(isMobile);
    if (!isMobile) {
      applyParallax();
    } else {
      // Reset any leftover transform when switching to mobile.
      panels.forEach((p) => {
        const bg = p.querySelector('.panel-bg');
        if (bg) bg.style.transform = '';
      });
    }
  }

  function goToPanel(id) {
    const target = document.querySelector(
      '.panel[data-panel-id="' + String(id).replace(/"/g, '\\"') + '"]'
    );
    if (!target) return false;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return true;
  }

  function init() {
    collectPanels();
    const isMobile = !!window.Comic.isMobile;
    setupObserver(isMobile);

    window.addEventListener('scroll', onScrollDesktop, { passive: true });
    if (!isMobile) applyParallax();

    document.addEventListener('panels:loaded', refresh);
    document.addEventListener('device:change', refresh);
  }

  window.Comic.ScrollManager = {
    init: init,
    refresh: refresh,
    goToPanel: goToPanel,
    getActivePanelId: function () {
      return activePanelId;
    },
  };
})();
