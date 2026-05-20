// js/immersion.js — Floating particles layer (fireflies / star sparkles).
// Exposes window.Immersion (and window.Comic.Immersion) with start/stop/setIntensity.
(function () {
  'use strict';

  window.Comic = window.Comic || {};

  const DEFAULT_COUNT = 25;
  const MIN_COUNT = 5;
  const MAX_COUNT = 80;

  let canvas = null;
  let ctx = null;
  let rafId = null;
  let particles = [];
  let running = false;
  let dpr = 1;
  let width = 0;
  let height = 0;
  let lastTime = 0;
  let color = 'rgba(255, 214, 107, 0.6)'; // var(--color-primary)-ish with alpha

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  function readPrimaryColor() {
    try {
      const styles = getComputedStyle(document.documentElement);
      const c = (styles.getPropertyValue('--color-primary') || '').trim();
      if (c) {
        // If it's a hex like #FFD66B, convert to rgba with alpha 0.6.
        const hex = c.match(/^#([0-9a-f]{6})$/i);
        if (hex) {
          const n = parseInt(hex[1], 16);
          const r = (n >> 16) & 255;
          const g = (n >> 8) & 255;
          const b = n & 255;
          return 'rgba(' + r + ',' + g + ',' + b + ',0.6)';
        }
        // Otherwise leave it as-is and trust the CSS.
        return c;
      }
    } catch (e) {}
    return color;
  }

  function createCanvas() {
    // Reuse existing #immersion-canvas if present (declared in HTML); else create one.
    canvas = document.getElementById('immersion-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'immersion-canvas';
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '5';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
    }
    ctx = canvas.getContext('2d');
    resize();
  }

  function resize() {
    if (!canvas) return;
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeParticle() {
    return {
      x: Math.random() * width,
      y: Math.random() * height + Math.random() * 50,
      r: 1 + Math.random() * 2,         // 1-3 px
      vy: 0.15 + Math.random() * 0.35,   // upward drift
      ax: Math.random() * Math.PI * 2,   // phase for sinusoidal x
      af: 0.4 + Math.random() * 0.6,     // frequency of lateral drift
      amp: 8 + Math.random() * 16,       // lateral drift amplitude
      baseX: 0,
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.6 + Math.random() * 1.2,
      alpha: 0.4 + Math.random() * 0.6,
    };
  }

  function seedParticles(count) {
    particles = [];
    for (let i = 0; i < count; i++) {
      const p = makeParticle();
      p.baseX = p.x;
      particles.push(p);
    }
  }

  function step(now) {
    if (!running) return;
    const dt = lastTime ? Math.min(50, now - lastTime) : 16;
    lastTime = now;
    const dts = dt / 1000;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y -= p.vy * dt * 0.06;
      p.ax += p.af * dts;
      const drawX = p.baseX + Math.sin(p.ax) * p.amp;
      p.twinklePhase += p.twinkleSpeed * dts;
      const tw = 0.5 + 0.5 * Math.sin(p.twinklePhase);
      const a = p.alpha * (0.4 + 0.6 * tw);

      // Wrap when above viewport — respawn at bottom.
      if (p.y < -10) {
        p.y = height + 10;
        p.baseX = Math.random() * width;
        p.ax = Math.random() * Math.PI * 2;
      }

      // Render — glow + dot.
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(drawX, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      // Soft halo
      ctx.globalAlpha = a * 0.25;
      ctx.beginPath();
      ctx.arc(drawX, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    if (prefersReducedMotion()) return;
    if (!canvas) createCanvas();
    color = readPrimaryColor();
    if (particles.length === 0) seedParticles(DEFAULT_COUNT);
    running = true;
    lastTime = 0;
    rafId = requestAnimationFrame(step);
    window.addEventListener('resize', onResize);
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (ctx) ctx.clearRect(0, 0, width, height);
    window.removeEventListener('resize', onResize);
  }

  function setIntensity(n) {
    const count = Math.max(MIN_COUNT, Math.min(MAX_COUNT, parseInt(n, 10) || DEFAULT_COUNT));
    seedParticles(count);
  }

  function onResize() {
    resize();
    // Re-anchor particle baseX so they don't get stuck off-screen.
    for (let i = 0; i < particles.length; i++) {
      particles[i].baseX = Math.min(width, Math.max(0, particles[i].baseX));
      particles[i].y = Math.min(height + 20, particles[i].y);
    }
  }

  const api = {
    start: start,
    stop: stop,
    setIntensity: setIntensity,
    isRunning: () => running,
  };

  window.Immersion = api;
  window.Comic.Immersion = api;
})();
