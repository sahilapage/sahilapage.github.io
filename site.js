// Clock, fade-ins, lazy videos, full-screen viewer, the hand mosaic, and the road.
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

  // ---------- mosaic of the hand: tiles move away from the cursor, a click scatters them ----------
  (() => {
    const cv = $('#mosaic'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const img = new Image(); img.src = 'media/hand-mosaic.png';
    let W = 0, H = 0, cell = 8, tiles = [], running = false, px = -1e4, py = -1e4, inside = false;
    const rnd = (a, b) => a + Math.random() * (b - a);

    function build(intro) {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = Math.max(4, Math.min(6, Math.round(W / 240)));
      const cols = Math.ceil(W / cell), rows = Math.ceil(H / cell);
      // the cut-out hand: fingers to forearm fill the band, the stand below is cropped off
      const off = document.createElement('canvas'); off.width = cols; off.height = rows;
      const o = off.getContext('2d');
      const s = (rows * 0.96) / (0.64 * img.height), iw = img.width * s, ih = img.height * s;
      const cx = (W > 760 ? 0.76 : 0.62) * cols;
      o.drawImage(img, cx - iw / 2, rows * 0.04 - 0.02 * ih, iw, ih);
      const d = o.getImageData(0, 0, cols, rows).data;
      tiles = [];
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const k = (j * cols + i) * 4;
        if (d[k + 3] < 110) continue;                       // paper shows through
        // a little more colour and contrast, so the red survives being this small
        const r = d[k], g = d[k + 1], b = d[k + 2], m = (r + g + b) / 3;
        const c = [r, g, b].map(v => Math.max(0, Math.min(255, (m + (v - m) * 1.45 - 128) * 1.12 + 122)));
        const t = { x: i * cell, y: j * cell, ox: 0, oy: 0, vx: 0, vy: 0, c: `rgb(${c.map(Math.round)})` };
        if (intro) { t.ox = rnd(-1, 1) * W * 0.08; t.oy = rnd(-1, 1) * H * 0.5; }
        tiles.push(t);
      }
      draw(); if (intro && !reduce) start();
    }
    function draw() {
      ctx.fillStyle = `rgb(${BG})`; ctx.fillRect(0, 0, W, H);
      const g = cell > 7 ? 1 : 0.6;
      for (const t of tiles) { ctx.fillStyle = t.c; ctx.fillRect(t.x + t.ox, t.y + t.oy, cell - g, cell - g); }
    }
    function step(dt) {
      let motion = 0; const R = 90, R2 = R * R;
      for (const t of tiles) {
        let ax = -60 * t.ox - 9 * t.vx, ay = -60 * t.oy - 9 * t.vy;
        if (inside) {
          const dx = t.x + cell / 2 + t.ox - px, dy = t.y + cell / 2 + t.oy - py, d2 = dx * dx + dy * dy;
          if (d2 < R2) { const dd = Math.sqrt(d2) || 1, f = (1 - dd / R) * 2600; ax += dx / dd * f; ay += dy / dd * f; }
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
      if (m < 0.08 && !inside) { running = false; return; }
      requestAnimationFrame(loop);
    }
    function start() { if (!running && !reduce) { running = true; last = performance.now(); requestAnimationFrame(loop); } }
    const at = e => { const r = cv.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; };
    cv.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; at(e); inside = true; start(); });
    cv.addEventListener('pointerleave', () => { inside = false; px = py = -1e4; });
    cv.addEventListener('click', e => { at(e); for (const t of tiles) { const dx = t.x - px, dy = t.y - py, d = Math.hypot(dx, dy) || 1, f = rnd(250, 900) * Math.exp(-d / 380); t.vx += dx / d * f + rnd(-60, 60); t.vy += dy / d * f + rnd(-60, 60); } start(); });
    img.onload = () => build(true);
    let rt; new ResizeObserver(() => { if (!img.complete || !img.naturalWidth) return; clearTimeout(rt); rt = setTimeout(() => build(false), 120); }).observe(cv);
  })();

  // ---------- the road: you set the speed, the car at the red light stays put ----------
  (() => {
    const cv = $('#road'); if (!cv) return;
    const ctx = cv.getContext('2d');
    const C = { road: '#e2dbcd', line: '#cbc2b2', ink: '#26231f', red: '#d63d2a', muted: '#847c70', other: '#bdb4a5', bg: `rgb(${BG})` };
    let W = 0, H = 0;
    const size = () => { const dpr = Math.min(devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const L = () => Math.max(38, Math.min(56, W * 0.045)), stopX = () => W * 0.74;
    const S = { ego: 0, v: 0, lead: 0, lv: 0, light: 'red', t: 0, crash: 0, wait: 0, pointer: null, lastMove: -1e9 };
    const others = [{ x: 0.3, v: 70 }, { x: 0.85, v: 95 }];
    const reset = () => Object.assign(S, { lead: -L() * 1.6, lv: 150, ego: -L() * 4.2, v: 150, light: 'red', t: 0, crash: 0, wait: 0 });
    const setP = e => { const r = cv.getBoundingClientRect(); S.pointer = (e.clientX - r.left) / r.width; S.lastMove = performance.now(); };
    cv.addEventListener('pointermove', setP); cv.addEventListener('pointerdown', setP);
    cv.addEventListener('pointerleave', () => { S.lastMove = -1e9; });

    function step(dt, now) {
      const len = L(), sx = stopX();
      if (S.light === 'red') {
        const gap = sx - S.lead, vt = gap > 1 ? Math.min(150, Math.sqrt(2 * 260 * Math.max(gap - 1, 0))) : 0;
        S.lv += Math.max(-420 * dt, Math.min(220 * dt, vt - S.lv)); if (gap <= 1) { S.lv = 0; S.lead = sx; }
      } else S.lv = Math.min(S.lv + 200 * dt, 220);
      S.lead += S.lv * dt;
      const user = now - S.lastMove < 2500 && S.pointer != null;
      let vt;
      if (S.crash > 0) vt = 0;
      else if (user) vt = Math.max(0, Math.min(1, S.pointer)) * 300;
      else { const room = (S.lead - len) - 12 - S.ego; vt = room > 0 ? Math.min(160, Math.sqrt(2 * 300 * room)) + S.lv * 0.3 : 0; }
      S.v = Math.max(0, S.v + Math.max(-520 * dt, Math.min(260 * dt, vt - S.v))); S.ego += S.v * dt;
      const rear = S.lead - len;
      if (S.ego >= rear) { if (S.v - S.lv > 25 && S.crash <= 0) S.crash = 1.6; S.ego = rear; S.v = Math.min(S.v, S.lv); }
      if (S.crash > 0) { S.crash -= dt; if (S.crash <= 0) reset(); }
      S.t += dt;
      if (S.light === 'red' && S.lv === 0 && S.v < 3 && S.crash <= 0) { S.wait += dt; if (S.wait > 1.4) S.light = 'green'; }
      else if (S.light === 'red' && S.lv === 0 && user && S.t > 9 && S.crash <= 0) S.light = 'green';
      if (S.light === 'green' && S.ego > W + len && S.lead > W + len) reset();
      others.forEach(o => { o.x -= o.v * dt / Math.max(W, 1); if (o.x < -0.1) o.x = 1.1; });
    }
    function car(x, y, len, col, label, labelCol, above) {
      const w = Math.max(16, len * 0.44);
      ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x - len, y - w / 2, len, w, 4); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - len * 0.42, y - w / 2 + 3, len * 0.16, w - 6);
      if (label) { ctx.fillStyle = labelCol; ctx.font = 'italic 15px "Cormorant Garamond", serif'; ctx.textAlign = 'center'; ctx.fillText(label, x - len / 2, above ? y - w / 2 - 6 : y + w / 2 + 16); }
    }
    function draw() {
      const len = L(), sx = stopX(), ly = H * 0.66, oy = H * 0.34;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = C.road; ctx.fillRect(0, H * 0.12, W, H * 0.76);
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.setLineDash([18, 16]); ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.ink; ctx.fillRect(sx + 3, H / 2 + 4, 3, H * 0.34);
      const lx = sx + 22, lyy = H * 0.88 - 4;
      ctx.beginPath(); ctx.roundRect(lx - 7, lyy - 26, 14, 26, 3); ctx.fill();
      ctx.fillStyle = S.light === 'red' ? C.red : '#5a554d'; ctx.beginPath(); ctx.arc(lx, lyy - 19, 4, 0, 7); ctx.fill();
      ctx.fillStyle = S.light === 'green' ? '#58b07a' : '#5a554d'; ctx.beginPath(); ctx.arc(lx, lyy - 8, 4, 0, 7); ctx.fill();
      others.forEach(o => { ctx.save(); ctx.translate(o.x * W, oy); ctx.scale(-1, 1); car(0, 0, len, C.other); ctx.restore(); });
      const sh = S.crash > 1.2 ? (Math.random() - 0.5) * 4 : 0;
      car(S.lead + sh, ly, len, C.ink, 'car ahead', C.muted, true);
      car(S.ego, ly, len, C.red, 'you', C.red);
      if (S.crash > 0) { ctx.fillStyle = C.red; ctx.font = 'italic 17px "Cormorant Garamond", serif'; ctx.textAlign = 'left'; ctx.fillText('crash. the car ahead did not move out of your way.', 10, 12); }
    }
    size(); reset(); draw();
    new ResizeObserver(() => { size(); draw(); }).observe(cv);
    if (reduce) { S.lead = stopX(); S.ego = stopX() - L() * 2.4; draw(); return; }
    let last = performance.now(), visible = false;
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cv);
    const loop = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (visible) { step(dt, now); draw(); } requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  })();
})();
