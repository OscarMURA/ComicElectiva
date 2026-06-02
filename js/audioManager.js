(function () {
  'use strict';

  window.Comic = window.Comic || {};

  const AMBIENT_PATH = 'assets/sounds/ambient/';
  const EFFECTS_PATH = 'assets/sounds/effects/';
  const STORAGE_KEY = 'comic.muted';
  const GLOBAL_AUDIO_KEY = 'comic-user-global-audio';
  const GLOBAL_VOL_KEY = 'comic-global-audio-volume';
  const PANEL_AUDIO_KEY = 'comic-user-panel-audio';
  const CROSSFADE_MS = 1200;
  const AMBIENT_VOLUME = 0.95;
  const SYNTH_AMBIENT_VOLUME = 0.78;
  const SFX_VOLUME = 1;
  const GLOBAL_DEFAULT_VOLUME = 0.85;
  const GLOBAL_AUDIO_GAIN = 2.2;
  const AMBIENT_AUDIO_GAIN = 1.8;
  const SFX_AUDIO_GAIN = 2.4;

  let muted = false;
  let unlocked = false;
  let currentAmbientKey = null;
  let currentAmbient = null;
  let pendingAmbientKey = null;
  const sfxCache = {};
  const brokenAudio = new Set();
  let muteBtn = null;
  let overlay = null;
  let synthContext = null;
  let synthMaster = null;
  let currentSynth = null;
  let currentSynthKey = null;
  const audioBoosts = new WeakMap();

  // Global background music (loops across whole story).
  let globalAudio = null;
  let globalSrc = null;
  let globalVolume = GLOBAL_DEFAULT_VOLUME;
  let globalShouldPlay = true; // whether user wants global track on

  function loadMuted() {
    try { return localStorage.getItem(STORAGE_KEY) === '1'; }
    catch (e) { return false; }
  }

  function saveMuted(val) {
    try { localStorage.setItem(STORAGE_KEY, val ? '1' : '0'); }
    catch (e) { /* ignore */ }
  }

  function buildAmbientUrl(key) {
    if (!key) return null;
    if (key.indexOf('data:') === 0) return key;
    if (key.indexOf('/') !== -1) return key;
    if (key.indexOf('.') === -1) return AMBIENT_PATH + key + '.mp3';
    return AMBIENT_PATH + key;
  }

  function buildSfxUrl(key) {
    if (!key) return null;
    if (key.indexOf('data:') === 0) return key;
    if (key.indexOf('/') !== -1) return key;
    if (key.indexOf('.') === -1) return EFFECTS_PATH + key + '.mp3';
    return EFFECTS_PATH + key;
  }

  function createAudio(url, opts) {
    const a = new Audio();
    a.src = url;
    a.preload = 'auto';
    if (opts && opts.loop) a.loop = true;
    if (opts && typeof opts.volume === 'number') a.volume = opts.volume;
    a.addEventListener('error', () => { /* silent */ });
    return a;
  }

  function applyAudioBoost(audio, gainValue) {
    if (!audio) return null;
    const ctx = getAudioContext();
    if (!ctx) return null;
    try {
      let boost = audioBoosts.get(audio);
      if (!boost) {
        const source = ctx.createMediaElementSource(audio);
        const gain = ctx.createGain();
        source.connect(gain);
        gain.connect(ctx.destination);
        boost = { gain: gain };
        audioBoosts.set(audio, boost);
      }
      boost.gain.gain.value = muted ? 0 : gainValue;
      return boost;
    } catch (e) {
      return null;
    }
  }

  function getAudioContext() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    if (!synthContext) {
      synthContext = new Ctx();
      synthMaster = synthContext.createGain();
      synthMaster.gain.value = muted ? 0 : SYNTH_AMBIENT_VOLUME;
      synthMaster.connect(synthContext.destination);
    }
    if (synthContext.state === 'suspended') {
      const p = synthContext.resume();
      if (p && p.catch) p.catch(() => {});
    }
    return synthContext;
  }

  function isSynthAmbientKey(key) {
    return /^synth:cap[1-9]$/.test(String(key || ''));
  }

  function synthChapterFromKey(key) {
    const match = String(key || '').match(/cap([1-9])/);
    return match ? match[1] : '1';
  }

  const SYNTH_PRESETS = {
    '1': { root: 196, scale: [0, 3, 7, 10], wave: 'sine', color: 'water' },
    '2': { root: 220, scale: [0, 5, 7, 12], wave: 'triangle', color: 'dream' },
    '3': { root: 174.61, scale: [0, 4, 7, 9], wave: 'sine', color: 'field' },
    '4': { root: 164.81, scale: [0, 3, 5, 10], wave: 'triangle', color: 'street' },
    '5': { root: 246.94, scale: [0, 4, 7, 12], wave: 'sine', color: 'spark' },
    '6': { root: 146.83, scale: [0, 3, 7, 8], wave: 'sawtooth', color: 'river' },
    '7': { root: 185, scale: [0, 5, 7, 10], wave: 'triangle', color: 'kitchen' },
    '8': { root: 261.63, scale: [0, 4, 7, 11], wave: 'sine', color: 'hope' },
    '9': { root: 207.65, scale: [0, 3, 7, 12], wave: 'triangle', color: 'night' },
  };

  function note(root, semitone, octave) {
    return root * Math.pow(2, (semitone + octave * 12) / 12);
  }

  function scheduleTone(ctx, out, freq, start, duration, opts) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const attack = opts.attack || 1.2;
    const release = opts.release || 2.4;
    const peak = opts.gain || 0.06;
    const end = start + duration;

    osc.type = opts.wave || 'sine';
    osc.frequency.setValueAtTime(freq, start);
    if (opts.detune) osc.detune.setValueAtTime(opts.detune, start);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(opts.cutoff || 900, start);
    filter.Q.setValueAtTime(opts.q || 0.6, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
    gain.gain.setValueAtTime(Math.max(0.0002, peak), Math.max(start + attack, end - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    osc.start(start);
    osc.stop(end + 0.05);
  }

  function createSynthAmbient(key) {
    const ctx = getAudioContext();
    if (!ctx) return null;

    const chapter = synthChapterFromKey(key);
    const preset = SYNTH_PRESETS[chapter] || SYNTH_PRESETS['1'];
    const rootGain = ctx.createGain();
    const padGain = ctx.createGain();
    const bellGain = ctx.createGain();
    const delay = ctx.createDelay();
    const feedback = ctx.createGain();

    rootGain.gain.value = 0.0001;
    padGain.gain.value = 0.8;
    bellGain.gain.value = preset.color === 'river' ? 0.08 : 0.18;
    delay.delayTime.value = 0.32;
    feedback.gain.value = 0.22;

    padGain.connect(rootGain);
    bellGain.connect(delay);
    bellGain.connect(rootGain);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(rootGain);
    rootGain.connect(synthMaster);

    let step = 0;
    let stopped = false;
    const intervals = [];

    function schedulePad() {
      if (stopped) return;
      const now = ctx.currentTime + 0.05;
      const progression = [
        [0, 2, 3],
        [1, 2, 3],
        [0, 1, 3],
        [0, 2, 4],
      ];
      const chord = progression[step % progression.length];
      chord.forEach((scaleIndex, i) => {
        const semi = preset.scale[scaleIndex % preset.scale.length] || 0;
        scheduleTone(ctx, padGain, note(preset.root, semi, i === 0 ? -1 : 0), now, 7.8, {
          wave: preset.wave,
          gain: i === 0 ? 0.045 : 0.032,
          attack: 1.8,
          release: 3.4,
          cutoff: preset.color === 'river' ? 520 : 820,
          detune: i === 2 ? 5 : -4,
        });
      });
      scheduleTone(ctx, padGain, note(preset.root, 0, -2), now, 7.8, {
        wave: 'sine',
        gain: 0.026,
        attack: 2.4,
        release: 3.8,
        cutoff: 360,
      });
      step++;
    }

    function scheduleBell() {
      if (stopped) return;
      const now = ctx.currentTime + 0.05;
      const semi = preset.scale[(step + 1) % preset.scale.length] || 0;
      scheduleTone(ctx, bellGain, note(preset.root, semi, 1), now, 2.8, {
        wave: 'sine',
        gain: preset.color === 'hope' ? 0.075 : 0.05,
        attack: 0.02,
        release: 2.2,
        cutoff: 2400,
      });
    }

    schedulePad();
    scheduleBell();
    intervals.push(setInterval(schedulePad, 5200));
    intervals.push(setInterval(scheduleBell, 3900));

    return {
      gain: rootGain,
      stop: function () {
        stopped = true;
        intervals.forEach(clearInterval);
      },
    };
  }

  function stopSynthAmbient(layer) {
    if (!layer) return;
    try { layer.stop(); } catch (e) { /* ignore */ }
  }

  function playSynthAmbient(key) {
    if (!unlocked) { pendingAmbientKey = key; return; }
    if (key === currentSynthKey && currentSynth) return;
    const next = createSynthAmbient(key);
    if (!next) return;
    const previous = currentSynth;
    currentSynth = next;
    currentSynthKey = key;
    currentAmbientKey = key;
    fadeGainTo(next.gain, muted ? 0.0001 : 1, CROSSFADE_MS);
    if (previous) {
      fadeGainTo(previous.gain, 0.0001, CROSSFADE_MS, () => stopSynthAmbient(previous));
    }
    if (currentAmbient) {
      const old = currentAmbient;
      currentAmbient = null;
      fadeTo(old, 0, CROSSFADE_MS, () => stopAudio(old));
    }
  }

  function fadeTo(audio, target, duration, onDone) {
    if (!audio) { if (onDone) onDone(); return; }
    const start = audio.volume;
    const delta = target - start;
    const startTime = performance.now();
    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      try { audio.volume = Math.max(0, Math.min(1, start + delta * t)); }
      catch (e) { /* ignore */ }
      if (t < 1) requestAnimationFrame(step);
      else if (onDone) onDone();
    }
    requestAnimationFrame(step);
  }

  function fadeGainTo(gainNode, target, duration, onDone) {
    if (!gainNode || !gainNode.gain) { if (onDone) onDone(); return; }
    const param = gainNode.gain;
    const start = param.value;
    const delta = target - start;
    const startTime = performance.now();
    function step(now) {
      const t = Math.min(1, (now - startTime) / duration);
      try { param.value = Math.max(0.0001, start + delta * t); }
      catch (e) { /* ignore */ }
      if (t < 1) requestAnimationFrame(step);
      else if (onDone) onDone();
    }
    requestAnimationFrame(step);
  }

  function stopAudio(audio) {
    if (!audio) return;
    try { audio.pause(); audio.currentTime = 0; } catch (e) { /* ignore */ }
  }

  // ---- Global background music ----------------------------------------------
  function loadGlobalSrc() {
    // Priority: storyData.globalAudio (set externally) > localStorage user upload.
    const story = window.Comic.PanelLoader && window.Comic.PanelLoader.getStory && window.Comic.PanelLoader.getStory();
    if (story && story.globalAudio) return story.globalAudio;
    try { return localStorage.getItem(GLOBAL_AUDIO_KEY); } catch (e) { return null; }
  }

  function loadGlobalVolume() {
    try {
      const v = parseFloat(localStorage.getItem(GLOBAL_VOL_KEY));
      if (!isNaN(v)) return Math.max(0, Math.min(1, v));
    } catch (e) {}
    return GLOBAL_DEFAULT_VOLUME;
  }

  function ensureGlobalPlaying() {
    if (!unlocked || muted) return;
    if (!globalShouldPlay) return;
    const src = loadGlobalSrc();
    if (!src) return;
    if (globalAudio && globalSrc === src) {
      if (globalAudio.paused) {
        const p = globalAudio.play();
        if (p && p.catch) p.catch(() => {});
      }
      return;
    }
    // Stop previous if src changed.
    if (globalAudio) {
      try { globalAudio.pause(); } catch (_) {}
      globalAudio = null;
    }
    globalSrc = src;
    globalAudio = createAudio(src, { loop: true, volume: 0 });
    applyAudioBoost(globalAudio, GLOBAL_AUDIO_GAIN);
    const p = globalAudio.play();
    if (p && p.catch) p.catch(() => {});
    fadeTo(globalAudio, muted ? 0 : globalVolume, CROSSFADE_MS);
  }

  function setGlobalAudio(dataURL) {
    if (dataURL) {
      try { localStorage.setItem(GLOBAL_AUDIO_KEY, dataURL); } catch (_) {}
    } else {
      try { localStorage.removeItem(GLOBAL_AUDIO_KEY); } catch (_) {}
    }
    // Force a reload.
    if (globalAudio) {
      try { globalAudio.pause(); } catch (_) {}
      globalAudio = null;
      globalSrc = null;
    }
    if (dataURL) {
      globalShouldPlay = true;
      ensureGlobalPlaying();
    }
  }

  function setGlobalVolume(v) {
    globalVolume = Math.max(0, Math.min(1, v));
    if (globalAudio && !muted) {
      try { globalAudio.volume = globalVolume; } catch (_) {}
    }
  }

  function toggleGlobalAudio() {
    if (globalAudio && !globalAudio.paused) {
      globalShouldPlay = false;
      try { globalAudio.pause(); } catch (_) {}
    } else {
      globalShouldPlay = true;
      ensureGlobalPlaying();
    }
  }

  // ---- Panel-specific SFX overrides -----------------------------------------
  function getPanelAudioOverride(panelId) {
    try {
      const map = JSON.parse(localStorage.getItem(PANEL_AUDIO_KEY) || '{}');
      return map[panelId] || null;
    } catch (e) { return null; }
  }

  function setPanelAudio(panelId, dataURL) {
    try {
      const map = JSON.parse(localStorage.getItem(PANEL_AUDIO_KEY) || '{}');
      if (dataURL) map[panelId] = dataURL;
      else delete map[panelId];
      localStorage.setItem(PANEL_AUDIO_KEY, JSON.stringify(map));
    } catch (_) {}
  }

  // ---- Ambient (per chapter) -------------------------------------------------
  function playAmbient(key) {
    if (!key) return;
    if (key === currentAmbientKey && currentSynth) return;
    if (key === currentAmbientKey && currentAmbient && !currentAmbient.paused) return;
    if (!unlocked) { pendingAmbientKey = key; return; }
    if (isSynthAmbientKey(key)) {
      playSynthAmbient(key);
      return;
    }
    const url = buildAmbientUrl(key);
    if (!url) return;
    const next = createAudio(url, { loop: true, volume: 0 });
    applyAudioBoost(next, AMBIENT_AUDIO_GAIN);
    const targetVol = muted ? 0 : AMBIENT_VOLUME;
    const playPromise = next.play();
    if (playPromise && playPromise.catch) playPromise.catch(() => {});
    const previous = currentAmbient;
    currentAmbient = next;
    currentAmbientKey = key;
    if (currentSynth) {
      const oldSynth = currentSynth;
      currentSynth = null;
      currentSynthKey = null;
      fadeGainTo(oldSynth.gain, 0.0001, CROSSFADE_MS, () => stopSynthAmbient(oldSynth));
    }
    next.addEventListener('error', () => {
      if (currentAmbient !== next) return;
      currentAmbient = null;
      stopAudio(next);
      playSynthAmbient('synth:cap' + synthChapterFromKey(key));
    }, { once: true });
    fadeTo(next, targetVol, CROSSFADE_MS);
    if (previous) fadeTo(previous, 0, CROSSFADE_MS, () => stopAudio(previous));
  }

  // ---- One-shot bubble audio -------------------------------------------------
  // Plays a per-bubble audio clip when the bubble starts its typewriter pass.
  // Preload-friendly: call `preloadBubbleAudio(src)` ahead of time (e.g. on
  // panel:enter) so that `playBubbleAudio` actually fires the sound on the
  // same frame the bubble becomes visible.
  const bubbleAudioInstances = new Map();
  const bubblePreloadCache = new Map(); // url -> HTMLAudioElement (template)

  function resolveBubbleAudioUrl(src) {
    if (!src) return null;
    if (src.indexOf('data:') === 0 || src.indexOf('/') !== -1) return src;
    return EFFECTS_PATH + src + (src.indexOf('.') === -1 ? '.mp3' : '');
  }

  function preloadBubbleAudio(src) {
    const url = resolveBubbleAudioUrl(src);
    if (!url || brokenAudio.has(url)) return null;
    let tpl = bubblePreloadCache.get(url);
    if (tpl) return tpl;
    tpl = new Audio();
    tpl.preload = 'auto';
    tpl.src = url;
    tpl.addEventListener('error', () => {
      brokenAudio.add(url);
      bubblePreloadCache.delete(url);
    }, { once: true });
    // Forzar fetch inmediato.
    try { tpl.load(); } catch (_) {}
    bubblePreloadCache.set(url, tpl);
    return tpl;
  }

  function playBubbleAudio(src, opts) {
    if (!src || muted || !unlocked) return null;
    const url = resolveBubbleAudioUrl(src);
    if (!url || brokenAudio.has(url)) return null;
    const bubbleKey = opts && opts.bubbleId;
    if (bubbleKey && bubbleAudioInstances.has(bubbleKey)) {
      const prev = bubbleAudioInstances.get(bubbleKey);
      try { prev.pause(); prev.currentTime = 0; } catch (_) {}
    }
    // Asegura preload (idempotente). Si ya estaba precargado, no hay fetch.
    const template = preloadBubbleAudio(src);
    try {
      // Clonar de la plantilla: el browser reutiliza el recurso cacheado y
      // .play() arranca en el mismo frame sin esperar red.
      const a = template ? template.cloneNode(true) : new Audio(url);
      a.volume = (opts && typeof opts.volume === 'number') ? opts.volume : SFX_VOLUME;
      a.currentTime = 0;
      applyAudioBoost(a, SFX_AUDIO_GAIN);
      a.addEventListener('error', () => { brokenAudio.add(url); }, { once: true });
      const p = a.play();
      if (p && p.catch) p.catch(() => { brokenAudio.add(url); });
      if (bubbleKey) bubbleAudioInstances.set(bubbleKey, a);
      return a;
    } catch (e) {
      brokenAudio.add(url);
      return null;
    }
  }

  function stopBubbleAudio(bubbleId) {
    if (!bubbleId) return;
    const a = bubbleAudioInstances.get(bubbleId);
    if (!a) return;
    try { a.pause(); a.currentTime = 0; } catch (_) {}
    bubbleAudioInstances.delete(bubbleId);
  }

  function stopAllBubbleAudio() {
    bubbleAudioInstances.forEach((a) => {
      try { a.pause(); a.currentTime = 0; } catch (_) {}
    });
    bubbleAudioInstances.clear();
  }

  // ---- One-shot SFX ----------------------------------------------------------
  function playSfx(key) {
    if (!key || muted || !unlocked) return;
    const url = buildSfxUrl(key);
    if (!url || brokenAudio.has(url)) return;
    let template = sfxCache[url];
    if (!template) {
      template = createAudio(url, { volume: SFX_VOLUME });
      template.addEventListener('error', () => { brokenAudio.add(url); delete sfxCache[url]; }, { once: true });
      sfxCache[url] = template;
    }
    try {
      const instance = template.cloneNode(true);
      instance.volume = SFX_VOLUME;
      applyAudioBoost(instance, SFX_AUDIO_GAIN);
      instance.addEventListener('error', () => { brokenAudio.add(url); }, { once: true });
      const p = instance.play();
      if (p && p.catch) p.catch(() => { brokenAudio.add(url); });
    } catch (e) { brokenAudio.add(url); }
  }

  function applyMuteState() {
    if (currentAmbient) {
      try { currentAmbient.volume = muted ? 0 : AMBIENT_VOLUME; } catch (e) {}
      applyAudioBoost(currentAmbient, AMBIENT_AUDIO_GAIN);
    }
    if (globalAudio) {
      try { globalAudio.volume = muted ? 0 : globalVolume; } catch (e) {}
      applyAudioBoost(globalAudio, GLOBAL_AUDIO_GAIN);
    }
    if (currentSynth && currentSynth.gain) {
      try { currentSynth.gain.gain.value = muted ? 0 : 1; } catch (e) {}
    }
    if (synthMaster) {
      try { synthMaster.gain.value = muted ? 0 : SYNTH_AMBIENT_VOLUME; } catch (e) {}
    }
    if (muteBtn) {
      muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      muteBtn.classList.toggle('is-muted', muted);
    }
    document.documentElement.classList.toggle('is-muted', muted);
  }

  function toggleMute() {
    muted = !muted;
    saveMuted(muted);
    applyMuteState();
    if (!muted) ensureGlobalPlaying();
  }

  function unlock() {
    if (unlocked) return;
    unlocked = true;
    hideOverlay();
    ensureGlobalPlaying();
    if (pendingAmbientKey) {
      const k = pendingAmbientKey;
      pendingAmbientKey = null;
      playAmbient(k);
    }
    document.dispatchEvent(new CustomEvent('audio:unlocked'));
  }

  function showOverlay() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.id = 'audio-unlock-overlay';
    overlay.className = 'audio-unlock-overlay';
    overlay.setAttribute('role', 'button');
    overlay.setAttribute('tabindex', '0');
    overlay.setAttribute('aria-label', 'Toca para empezar');
    overlay.innerHTML =
      '<div class="audio-unlock-overlay__inner">' +
      '<h1 class="audio-unlock-overlay__title">Los Hilos del Agua y el Plato de las Preguntas</h1>' +
      '<p class="audio-unlock-overlay__cta">Toca para empezar</p>' +
      '</div>';
    document.body.appendChild(overlay);

    const handler = (e) => {
      if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      unlock();
    };
    overlay.addEventListener('click', handler);
    overlay.addEventListener('touchstart', handler, { passive: false });
    overlay.addEventListener('keydown', handler);
  }

  function hideOverlay() {
    if (!overlay) return;
    overlay.classList.add('hidden');
    const el = overlay;
    overlay = null;
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
  }

  function onPanelEnter(e) {
    const detail = e.detail || {};
    if (detail.ambient && detail.ambient !== currentAmbientKey) {
      playAmbient(detail.ambient);
    }
    // SFX: user override first, fall back to panel's data-sfx.
    const panelId = detail.id;
    const override = panelId ? getPanelAudioOverride(panelId) : null;
    if (override) {
      playSfx(override);
    } else if (detail.sfx) {
      playSfx(detail.sfx);
    }
    // Preload bubble audios in this panel so they fire on the SAME frame the
    // bubble starts its entrance animation (no network wait → in sync).
    if (detail.element && detail.element.querySelectorAll) {
      detail.element.querySelectorAll('.bubble[data-audio]').forEach((b) => {
        preloadBubbleAudio(b.dataset.audio);
      });
    }
  }

  function bindMuteButton() {
    muteBtn = document.getElementById('mute-toggle');
    if (!muteBtn) return;
    muteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleMute();
    });
  }

  function bindUnlockFallback() {
    const opts = { once: true, passive: true };
    const handler = () => unlock();
    window.addEventListener('pointerdown', handler, opts);
    window.addEventListener('touchstart', handler, opts);
    window.addEventListener('keydown', handler, opts);
  }

  function onStorageChange(e) {
    if (!e.key) return;
    if (e.key === GLOBAL_AUDIO_KEY) {
      setGlobalAudio(e.newValue);
    } else if (e.key === GLOBAL_VOL_KEY) {
      const v = parseFloat(e.newValue);
      if (!isNaN(v)) setGlobalVolume(v);
    }
  }

  function init() {
    muted = loadMuted();
    globalVolume = loadGlobalVolume();
    bindMuteButton();
    applyMuteState();
    showOverlay();
    bindUnlockFallback();
    document.addEventListener('panel:enter', onPanelEnter);
    window.addEventListener('storage', onStorageChange);
    // Precarga global de audios por burbuja en cuanto el DOM tenga los paneles
    // (bubbleEditor aplica los data-audio en restoreAll tras panels:loaded).
    document.addEventListener('panels:loaded', () => {
      // Pequeño retardo para que bubbleEditor.applyStoredBubbleAudio haya corrido.
      setTimeout(() => {
        document.querySelectorAll('.bubble[data-audio]').forEach((b) => {
          preloadBubbleAudio(b.dataset.audio);
        });
      }, 50);
    });
  }

  window.Comic.AudioManager = {
    init: init,
    toggleMute: toggleMute,
    isMuted: function () { return muted; },
    isUnlocked: function () { return unlocked; },
    playSfx: playSfx,
    playBubbleAudio: playBubbleAudio,
    preloadBubbleAudio: preloadBubbleAudio,
    stopBubbleAudio: stopBubbleAudio,
    stopAllBubbleAudio: stopAllBubbleAudio,
    playAmbient: playAmbient,
    setGlobalAudio: setGlobalAudio,
    setGlobalVolume: setGlobalVolume,
    toggleGlobalAudio: toggleGlobalAudio,
    setPanelAudio: setPanelAudio,
    getPanelAudioOverride: getPanelAudioOverride,
  };
})();
