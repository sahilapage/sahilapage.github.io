// Clock, fade-ins, lazy videos, full-screen viewer, and the evening scene up top.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

  // time in mumbai
  const clock = $('#clock');
  const tick = () => { clock.textContent = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' }).format(new Date()).toLowerCase(); };
  tick(); setInterval(tick, 30000);

  // fade-ins start when they come into view
  const fio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('go'); fio.unobserve(e.target); } }));
  $$('.up').forEach(el => fio.observe(el));

  // page links follow the section in view
  const links = $$('.pages a'), secs = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const nio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
  secs.forEach(s => nio.observe(s));

  // videos load near the screen and play only while visible
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; if (!reduce) v.play().catch(() => {}); } else v.pause();
  }), { rootMargin: '250px 0px', threshold: 0.1 });
  $$('video[data-src]').forEach(v => vio.observe(v));

  // full-screen viewer for the strips
  const lb = $('#lb'), lbm = $('#lb-media'), lbc = $('#lb-cap');
  let group = [], idx = 0;
  const show = i => {
    idx = (i + group.length) % group.length; const b = group[idx];
    lbm.innerHTML = '';
    if (b.dataset.video) { const v = document.createElement('video'); Object.assign(v, { src: b.dataset.video, muted: true, loop: true, playsInline: true, autoplay: true, controls: true }); lbm.append(v); }
    else { const im = new Image(); im.src = b.dataset.full; im.alt = b.dataset.cap; lbm.append(im); }
    lbc.textContent = b.dataset.cap;
  };
  $$('.strip').forEach(st => { const bs = [...st.querySelectorAll('.shot')]; bs.forEach((b, i) => b.addEventListener('click', () => { group = bs; show(i); lb.showModal(); })); });
  lb.querySelector('.prev').onclick = () => show(idx - 1);
  lb.querySelector('.next').onclick = () => show(idx + 1);
  lb.querySelector('.x').onclick = () => lb.close();
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });
  lb.addEventListener('close', () => { lbm.innerHTML = ''; });
  addEventListener('keydown', e => { if (!lb.open) return; if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });

  const BG = [237, 231, 220];

  // ---------- an evening, drawn fresh on every visit: tiles move away from the cursor, a click scatters them ----------
  (() => {
    const cv = $('#scene'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const SEED = +new URLSearchParams(location.search).get('scene') || (Math.random() * 2 ** 32) >>> 0;   // one scene per visit (?scene=n to pin one)
    const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
    const PAL = [
      { sky: ['#26284f', '#6b4a7a', '#d9776a', '#f6c48a'], sun: '#fff1c9', cloud: '#f2a48c', far: '#8a5c7a', mid: '#4e3a5c', near: '#2a2238', water: ['#5b4a78', '#211d38'] },
      { sky: ['#1d2a48', '#3f5277', '#c97b78', '#f2b27c'], sun: '#ffe2a8', cloud: '#e59a8a', far: '#6f6584', mid: '#433f5e', near: '#1f2036', water: ['#4c5a80', '#18203a'] },
      { sky: ['#2e2347', '#8c4a6e', '#ec8a5f', '#fbd38b'], sun: '#fff4d6', cloud: '#f7a77a', far: '#a0587a', mid: '#5c2f55', near: '#2b1a33', water: ['#6e3d62', '#24162e'] },
      { sky: ['#33405e', '#7d7591', '#e0a08a', '#f3d3a3'], sun: '#fff6e0', cloud: '#f0b9a0', far: '#9a8798', mid: '#5d5470', near: '#2c2a3e', water: ['#77738f', '#2c2c44'] },
      { sky: ['#1b1f3b', '#4b3b6b', '#b8607a', '#f08f6a'], sun: '#ffd9a0', cloud: '#d77a86', far: '#6b4670', mid: '#3c2a52', near: '#1a1428', water: ['#4a3460', '#140f22'] },
    ].map(p => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Array.isArray(v) ? v.map(hex) : hex(v)])));
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const dither = (c, i, j, step = 9) => { const t = (BAYER[(j & 3) * 4 + (i & 3)] + .5) / 16; return c.map(v => Math.max(0, Math.min(255, Math.floor(v / step + t) * step))); };

    function paint(cols, rows) {
      const r = mulberry(SEED), rnd = (a, b) => a + r() * (b - a);
      const P = PAL[Math.floor(r() * PAL.length)], sea = r() < 0.55;
      const hz = Math.round(rows * (sea ? rnd(0.6, 0.7) : rnd(0.7, 0.8)));
      const px = new Array(cols * rows);
      const set = (i, j, c) => { i = Math.round(i); j = Math.round(j); if (i >= 0 && i < cols && j >= 0 && j < rows) px[j * cols + i] = c; };
      const skyAt = j => { const t = Math.min(1, Math.max(0, j / hz)) * 3, k = Math.min(2, Math.floor(t)); return mix(P.sky[k], P.sky[k + 1], t - k); };
      const left = r() < 0.5, w0 = rnd(0.3, 0.45) * cols;   // the city's side and width (sea scenes)
      const sx = sea ? (left ? rnd(w0 + 0.08 * cols, 0.9 * cols) : rnd(0.1 * cols, cols - w0 - 0.08 * cols)) : rnd(0.12, 0.88) * cols, sr = Math.max(4, rows * rnd(0.14, 0.2)), sy = sea ? hz - sr * rnd(0.1, 0.7) : hz - rows * rnd(0.3, 0.42);
      // sky with a glow around the sun
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const d = Math.hypot((i - sx) * 0.45, j - sy);
        set(i, j, dither(mix(skyAt(j), P.sun, 0.42 * Math.exp(-d / (sr * 2.2))), i, j));
      }
      // stars in the dark part of the sky
      const nStars = Math.round(cols * rows * 0.0016);
      for (let k = 0; k < nStars; k++) { const i = r() * cols, j = r() * hz * 0.45; set(i, j, mix(skyAt(j), [255, 250, 235], rnd(0.4, 0.85))); }
      // long thin clouds, lit from below
      const nClouds = 2 + Math.floor(r() * 4);
      for (let k = 0; k < nClouds; k++) {
        const cx = r() * cols, cy = rnd(0.15, 0.7) * hz, w = rnd(0.06, 0.2) * cols, h = Math.max(2, rnd(0.03, 0.07) * rows);
        for (let j = Math.floor(cy - h); j <= cy + h; j++) for (let i = Math.floor(cx - w); i <= cx + w; i++) {
          const e = ((i - cx) / w) ** 2 + ((j - cy) / h) ** 2 + 0.25 * Math.sin(i * 0.35 + k);
          if (e < 1) set(i, j, dither(mix(skyAt(j), P.cloud, 0.35 + 0.45 * Math.max(0, (j - cy) / h)), i, j));
        }
      }
      // the sun, cut by a few bands near the horizon
      for (let j = Math.floor(sy - sr); j <= sy + sr; j++) for (let i = Math.floor(sx - sr); i <= sx + sr; i++) {
        const u = (j - sy) / sr; if ((i - sx) ** 2 + (j - sy) ** 2 > sr * sr || j >= hz) continue;
        if (u > 0.15 && Math.floor((j - sy) / Math.max(1.5, sr * 0.14)) % 2 === 1 && u * 0.9 > r() * 0.6) continue;
        set(i, j, mix(P.sun, P.cloud, Math.max(0, u) * 0.35));
      }
      const ridge = (base, amp, f) => { const ph = [r(), r(), r()], fr = [f, f * 2.3, f * 5.1]; return i => base - amp * (0.55 + 0.5 * (0.6 * Math.sin(6.283 * (fr[0] * i / cols + ph[0])) + 0.3 * Math.sin(6.283 * (fr[1] * i / cols + ph[1])) + 0.1 * Math.sin(6.283 * (fr[2] * i / cols + ph[2])))); };
      const fillBelow = (top, c, haze) => { for (let i = 0; i < cols; i++) for (let j = Math.max(0, Math.floor(top(i))); j < rows; j++) set(i, j, dither(mix(c, skyAt(hz), haze), i, j)); };
      if (!sea) {
        // three ridges, hazier the farther they are
        fillBelow(ridge(hz, rows * 0.22, rnd(1, 2.2)), P.far, 0.3);
        fillBelow(ridge(hz + rows * 0.1, rows * 0.16, rnd(1.5, 3)), P.mid, 0.12);
        fillBelow(ridge(rows * 1.02, rows * 0.16, rnd(2, 4)), P.near, 0);
      } else {
        // the sea, the sun's path on it, and a city on one side with a curve of lights along the shore
        const x0 = left ? 0 : cols - w0, x1 = left ? w0 : cols;
        fillBelow(ridge(hz - rows * 0.03, rows * 0.1, rnd(0.5, 1.5)), P.far, 0.35);   // far headland, cut back to the sea below
        for (let j = hz; j < rows; j++) { const t = (j - hz) / Math.max(1, rows - hz); for (let i = 0; i < cols; i++) set(i, j, dither(mix(mix(P.water[0], skyAt(hz), 0.25), P.water[1], t), i, j)); }
        for (let j = hz + 1; j < rows; j += 2) {
          const t = (j - hz) / Math.max(1, rows - hz), w = sr * (1.1 - 0.4 * t) * rnd(0.5, 1.1), o = rnd(-2, 2);
          for (let i = Math.floor(sx - w + o); i < sx + w + o; i++) if (r() < 0.75) set(i, j, mix(P.sun, P.water[0], 0.25 + 0.55 * t));
        }
        let i = x0;
        while (i < x1) {
          const bw = Math.max(2, Math.round(rnd(0.008, 0.028) * cols)), bh = Math.round(rnd(0.08, 0.5) * rows * (0.4 + 0.6 * Math.abs((i - (left ? x1 : x0)) / w0)));
          const c = mix(P.mid, P.near, rnd(0.2, 0.9));
          for (let x = i; x < i + bw && x < x1; x++) for (let y = hz - bh; y < hz + 1; y++) {
            const lit = (x - i) % 2 === 1 && (y - (hz - bh)) % 3 === 1 && y < hz - 1 && r() < 0.22;
            set(x, y, lit ? [255, 214, 140] : c);
          }
          if (r() < 0.15) for (let y = hz - bh - Math.round(rnd(2, 5)); y < hz - bh; y++) set(i + Math.floor(bw / 2), y, c);
          i += bw + (r() < 0.25 ? 1 : 0);
        }
        // the shore: a promenade curving from the city toward us, street lights along the water's edge
        const span = Math.max(1, x1 - x0);
        for (let x = x0; x < x1; x++) {
          const t = left ? 1 - (x - x0) / span : (x - x0) / span, y = hz + 1 + t * t * (rows - hz) * 1.1;
          for (let yy = hz + 1; yy < y; yy++) set(x, yy, mix(P.near, P.mid, 0.25));
          if (Math.round(x) % 3 === 0) set(x, y, [255, 222, 150]);
        }
      }
      // a few birds heading home
      const nBirds = 2 + Math.floor(r() * 4), bx0 = rnd(0.1, 0.9) * cols, by0 = rnd(0.2, 0.5) * hz;
      for (let k = 0; k < nBirds; k++) {
        const bx = bx0 + rnd(-0.06, 0.06) * cols, by = by0 + rnd(-0.12, 0.12) * hz;
        for (const [dx, dy] of [[-2, 0], [-1, -1], [0, 0], [1, -1], [2, 0]]) set(bx + dx, by + dy, P.near);
      }
      return px;
    }

    let W = 0, H = 0, cell = 5, tiles = [], running = false, px = -1e4, py = -1e4, inside = false;
    const rnd = (a, b) => a + Math.random() * (b - a);
    function build(intro) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = W > 760 ? 5 : 4;
      const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell), pix = paint(cols, rows);
      tiles = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const c = pix[j * cols + i]; if (!c) continue;
        const t = { x: i * cell, y: j * cell, ox: 0, oy: 0, vx: 0, vy: 0, c: `rgb(${c.map(Math.round)})` };
        if (intro) { t.oy = -rnd(0.3, 1) * H * (1 - j / rows) * 0.6; }
        tiles.push(t);
      }
      draw(); if (intro && !reduce) start();
    }
    function draw() {
      ctx.fillStyle = `rgb(${BG})`; ctx.fillRect(0, 0, W, H);
      for (const t of tiles) { ctx.fillStyle = t.c; ctx.fillRect(t.x + t.ox, t.y + t.oy, cell, cell); }
    }
    function step(dt) {
      let motion = 0; const R = 80, R2 = R * R;
      for (const t of tiles) {
        let ax = -60 * t.ox - 9 * t.vx, ay = -60 * t.oy - 9 * t.vy;
        if (inside) {
          const dx = t.x + cell / 2 + t.ox - px, dy = t.y + cell / 2 + t.oy - py, d2 = dx * dx + dy * dy;
          if (d2 < R2) { const dd = Math.sqrt(d2) || 1, f = (1 - dd / R) * 2400; ax += dx / dd * f; ay += dy / dd * f; }
        }
        t.vx += ax * dt; t.vy += ay * dt; t.ox += t.vx * dt; t.oy += t.vy * dt;
        motion = Math.max(motion, Math.abs(t.vx) + Math.abs(t.vy) + Math.abs(t.ox) + Math.abs(t.oy));
      }
      return motion;
    }
    let last = 0;
    function loop(now) {
      const dt = Math.min(0.033, (now - last) / 1000 || 0.016); last = now;
      const m = step(dt); draw();
      if (m < 0.08 && !inside) { running = false; for (const t of tiles) { t.ox = t.oy = t.vx = t.vy = 0; } draw(); return; }
      requestAnimationFrame(loop);
    }
    function start() { if (!running && !reduce) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
    const at = e => { const b = cv.getBoundingClientRect(); px = e.clientX - b.left; py = e.clientY - b.top; };
    cv.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; at(e); inside = true; start(); });
    cv.addEventListener('pointerleave', () => { inside = false; px = py = -1e4; });
    cv.addEventListener('click', e => { at(e); for (const t of tiles) { const dx = t.x - px, dy = t.y - py, d = Math.hypot(dx, dy) || 1, f = rnd(250, 900) * Math.exp(-d / 320); t.vx += dx / d * f + rnd(-60, 60); t.vy += dy / d * f + rnd(-60, 60); } start(); });
    build(true);
    let rt, lastW = cv.clientWidth; new ResizeObserver(() => { if (cv.clientWidth === lastW) return; lastW = cv.clientWidth; clearTimeout(rt); rt = setTimeout(() => build(false), 120); }).observe(cv);
  })();
})();
