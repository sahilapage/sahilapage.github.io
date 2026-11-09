// Header line, section highlight, reveals, videos that play only while on screen, and the little road.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // header gets a rule once the page scrolls
  const top = document.querySelector('.top');
  const onScroll = () => top.classList.toggle('stuck', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // highlight the section in view
  const links = [...document.querySelectorAll('.nav a')];
  const secs = links.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const nio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => nio.observe(s));

  // reveal on scroll
  const rv = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rv.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => reduce ? el.classList.add('in') : rv.observe(el));

  // videos: load when near, play while visible, pause when not
  const vids = document.querySelectorAll('video[data-src]');
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting) {
      if (!v.src) { v.src = v.dataset.src; v.preload = 'auto'; }
      if (!reduce) v.play().catch(() => {});
    } else v.pause();
  }), { rootMargin: '200px 0px', threshold: 0.15 });
  vids.forEach(v => vio.observe(v));
  if (reduce) vids.forEach(v => { v.controls = true; });

  // ---------- the road: you drive, the car at the red light stays put ----------
  const cv = document.getElementById('road');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const C = { road: '#eceae3', line: '#cfc9bd', ink: css('--ink') || '#1d1b18', red: css('--accent') || '#c4321f',
              muted: css('--muted') || '#8a857c', other: '#b9b3a7', green: '#3d8a5a', bg: css('--bg') || '#fbfaf7' };
  let W = 0, H = 0, dpr = 1;
  const size = () => {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  size(); new ResizeObserver(() => { size(); draw(); }).observe(cv);

  const L = () => Math.max(38, Math.min(56, W * 0.045));        // car length
  const stopX = () => W * 0.74;                                   // stop line
  const laneY = () => H * 0.66, oppY = () => H * 0.34;
  const S = { ego: -200, v: 0, lead: 0, lv: 0, light: 'red', t: 0, crash: 0, pointer: null, lastMove: -1e9, phase: 'arrive' };
  const others = [{ x: 0.3, v: 70 }, { x: 0.85, v: 95 }];
  const reset = () => { S.lead = -L() * 1.6; S.lv = 150; S.ego = -L() * 4.2; S.v = 150; S.light = 'red'; S.t = 0; S.crash = 0; S.phase = 'arrive'; };
  reset();

  const setPointer = e => { const r = cv.getBoundingClientRect(); S.pointer = (e.clientX - r.left) / r.width; S.lastMove = performance.now(); };
  cv.addEventListener('pointermove', setPointer);
  cv.addEventListener('pointerdown', setPointer);
  cv.addEventListener('pointerleave', () => { S.lastMove = -1e9; });

  function step(dt, now) {
    const len = L(), sx = stopX();
    // lead car: drives in, waits at the light, leaves on green
    if (S.light === 'red') {
      const gap = sx - S.lead;                                       // distance from its front to the stop line
      const vt = gap > 1 ? Math.min(150, Math.sqrt(2 * 260 * Math.max(gap - 1, 0))) : 0;
      S.lv += Math.max(-420 * dt, Math.min(220 * dt, vt - S.lv));
      if (gap <= 1) { S.lv = 0; S.lead = sx; }
    } else S.lv = Math.min(S.lv + 200 * dt, 220);
    S.lead += S.lv * dt;

    // ego: your cursor sets the target speed; idle, it drives itself and stops behind
    const user = now - S.lastMove < 2500 && S.pointer != null;
    let vt;
    if (S.crash > 0) vt = 0;
    else if (user) vt = Math.max(0, Math.min(1, S.pointer)) * 300;
    else { const room = (S.lead - len) - 12 - S.ego; vt = room > 0 ? Math.min(160, Math.sqrt(2 * 300 * room)) + S.lv * 0.3 : 0; }
    S.v += Math.max(-520 * dt, Math.min(260 * dt, vt - S.v));
    S.v = Math.max(0, S.v);
    S.ego += S.v * dt;

    // contact with the car ahead: it does not move out of your way
    const rear = S.lead - len;
    if (S.ego >= rear) {
      if (S.v - S.lv > 25 && S.crash <= 0) { S.crash = 1.6; }
      S.ego = rear; S.v = Math.min(S.v, S.lv);
    }
    if (S.crash > 0) { S.crash -= dt; if (S.crash <= 0) reset(); }

    // light: turns green a little after everyone has stopped
    S.t += dt;
    if (S.light === 'red' && S.lv === 0 && S.v < 3 && S.crash <= 0) { S.wait = (S.wait || 0) + dt; if (S.wait > 1.4) { S.light = 'green'; S.wait = 0; } }
    else if (S.light === 'red' && S.lv === 0 && user && S.t > 9 && S.crash <= 0) S.light = 'green';
    if (S.light === 'green' && S.ego > W + len && S.lead > W + len) reset();

    others.forEach(o => { o.x -= (o.v * dt) / Math.max(W, 1); if (o.x < -0.1) o.x = 1.1; });
  }

  function car(x, y, len, col, label, labelCol, above) {
    const w = Math.max(16, len * 0.44);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect(x - len, y - w / 2, len, w, 4); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(x - len * 0.42, y - w / 2 + 3, len * 0.16, w - 6);           // windshield
    if (label) { ctx.fillStyle = labelCol; ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(label, x - len / 2, above ? y - w / 2 - 6 : y + w / 2 + 15); }
  }

  function draw() {
    const len = L(), sx = stopX(), ly = laneY(), oy = oppY();
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.road; ctx.fillRect(0, H * 0.14, W, H * 0.72);
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.setLineDash([18, 16]);
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke(); ctx.setLineDash([]);
    // stop line and light
    ctx.fillStyle = C.ink; ctx.fillRect(sx + 3, H / 2 + 4, 3, H * 0.34);
    const lx = sx + 22, lyy = H * 0.86 - 4;
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.roundRect(lx - 7, lyy - 26, 14, 26, 3); ctx.fill();
    ctx.fillStyle = S.light === 'red' ? C.red : '#5a554d'; ctx.beginPath(); ctx.arc(lx, lyy - 19, 4, 0, 7); ctx.fill();
    ctx.fillStyle = S.light === 'green' ? '#58b07a' : '#5a554d'; ctx.beginPath(); ctx.arc(lx, lyy - 8, 4, 0, 7); ctx.fill();
    // oncoming traffic
    others.forEach(o => { ctx.save(); ctx.translate(o.x * W, oy); ctx.scale(-1, 1); car(0, 0, len, C.other); ctx.restore(); });
    // the car ahead and you
    const shake = S.crash > 1.2 ? (Math.random() - 0.5) * 4 : 0;
    car(S.lead + shake, ly, len, C.ink, 'car ahead', C.muted, true);
    car(S.ego, ly, len, C.red, 'you', C.red);
    if (S.crash > 0) {
      ctx.fillStyle = C.red; ctx.font = '600 13px "IBM Plex Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText('crash. the car ahead did not move out of your way.', 12, 15);
    }
  }

  if (reduce) { S.lead = stopX(); S.ego = stopX() - L() * 2.4; draw(); return; }
  let last = performance.now(), visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(cv);
  const loop = now => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (visible) { step(dt, now); draw(); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
})();
