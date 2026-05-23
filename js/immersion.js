// js/immersion.js — Floating particles layer (fireflies / star sparkles).
// Exposes window.Immersion (and window.Comic.Immersion) with start/stop/setIntensity.
(function () {
  'use strict';

  window.Comic = window.Comic || {};

  const DEFAULT_COUNT = 70;
  const MIN_COUNT = 10;
  const MAX_COUNT = 200;

  // Tonos para el brillo tipo luciérnaga: núcleo blanco-cálido, halo dorado.
  const CORE_RGB = [255, 244, 200];   // núcleo casi blanco con tibieza
  const GLOW_RGB = [255, 196, 77];    // halo dorado miel

  let canvas = null;
  let ctx = null;
  let rafId = null;
  let particles = [];
  let running = false;
  let dpr = 1;
  let width = 0;
  let height = 0;
  let lastTime = 0;

  function prefersReducedMotion() {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  function rgba(rgb, a) {
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
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
      // z=0 → detrás de los paneles (.panel { z-index: 1 }) pero delante del body.
      canvas.style.zIndex = '0';
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
    // Mezcla: ~80% luciérnagas (más lentas, halo grande), ~20% chispitas
    // pequeñas y veloces que dan textura de polvo dorado.
    const isFirefly = Math.random() < 0.8;
    return {
      x: Math.random() * width,
      y: Math.random() * height + Math.random() * 80,
      r: isFirefly ? 1.6 + Math.random() * 2.2 : 0.7 + Math.random() * 1.2,
      vy: isFirefly ? 0.05 + Math.random() * 0.18 : 0.25 + Math.random() * 0.4,
      ax: Math.random() * Math.PI * 2,
      af: isFirefly ? 0.25 + Math.random() * 0.5 : 0.6 + Math.random() * 0.8,
      amp: isFirefly ? 14 + Math.random() * 28 : 6 + Math.random() * 10,
      baseX: 0,
      twinklePhase: Math.random() * Math.PI * 2,
      // Las luciérnagas pulsan más despacio (efecto bioluminiscente).
      twinkleSpeed: isFirefly ? 0.8 + Math.random() * 1.2 : 1.6 + Math.random() * 1.8,
      alpha: 0.55 + Math.random() * 0.45,
      glow: isFirefly ? 6 + Math.random() * 4 : 3 + Math.random() * 1.5,
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
    // 'lighter' suma colores → varias luciérnagas cercanas se acumulan en un
    // dorado más brillante (efecto de enjambre luminoso).
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y -= p.vy * dt * 0.06;
      p.ax += p.af * dts;
      const drawX = p.baseX + Math.sin(p.ax) * p.amp;
      p.twinklePhase += p.twinkleSpeed * dts;
      const tw = 0.5 + 0.5 * Math.sin(p.twinklePhase);
      const a = p.alpha * (0.35 + 0.65 * tw);

      // Wrap cuando salen por arriba → reaparecen abajo.
      if (p.y < -20) {
        p.y = height + 10;
        p.baseX = Math.random() * width;
        p.ax = Math.random() * Math.PI * 2;
      }

      const haloR = p.r * p.glow;

      // 1) Halo exterior dorado-miel (más grande y tenue).
      const outer = ctx.createRadialGradient(drawX, p.y, 0, drawX, p.y, haloR);
      outer.addColorStop(0,    rgba(GLOW_RGB, 0.55 * a));
      outer.addColorStop(0.4,  rgba(GLOW_RGB, 0.22 * a));
      outer.addColorStop(1,    rgba(GLOW_RGB, 0));
      ctx.fillStyle = outer;
      ctx.beginPath();
      ctx.arc(drawX, p.y, haloR, 0, Math.PI * 2);
      ctx.fill();

      // 2) Halo medio dorado más concentrado.
      const midR = p.r * 2.4;
      const mid = ctx.createRadialGradient(drawX, p.y, 0, drawX, p.y, midR);
      mid.addColorStop(0, rgba(GLOW_RGB, 0.9 * a));
      mid.addColorStop(1, rgba(GLOW_RGB, 0));
      ctx.fillStyle = mid;
      ctx.beginPath();
      ctx.arc(drawX, p.y, midR, 0, Math.PI * 2);
      ctx.fill();

      // 3) Núcleo cálido casi blanco — la "chispa" de la luciérnaga.
      ctx.fillStyle = rgba(CORE_RGB, Math.min(1, a * 1.1));
      ctx.beginPath();
      ctx.arc(drawX, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    rafId = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    if (prefersReducedMotion()) return;
    if (!canvas) createCanvas();
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
