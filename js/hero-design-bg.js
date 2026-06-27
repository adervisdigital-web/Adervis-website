// Flowing purple smoke streams — calm, wide, atmospheric
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.getElementById('designFlowBg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth  || window.innerWidth;
    canvas.height = canvas.offsetHeight || window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  /* ── Flow field: horizontal-biased, large sweeping curves ── */
  function fieldAngle(x, y, t) {
    const nx = x * 0.0009, ny = y * 0.0009;
    return (
      Math.sin(ny * 2.2  + t * 0.055) * 0.95 +
      Math.sin(nx * 1.1  - ny * 0.9  + t * 0.038) * 0.40 +
      Math.cos(nx * 0.55 + ny * 1.9  + t * 0.028) * 0.22
    ) * Math.PI * 1.5;
  }

  /* ── Smooth curve through trail points ── */
  function drawSmooth(pts) {
    if (pts.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) * 0.5;
      const my = (pts[i][1] + pts[i + 1][1]) * 0.5;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  }

  /* ── Particles: few, slow, long tails ── */
  const COUNT = 28;
  const TAIL  = 420;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  const particles = Array.from({ length: COUNT }, () => ({
    x:     rnd(0, window.innerWidth),
    y:     rnd(0, window.innerHeight),
    trail: [],
    spd:   rnd(0.35, 0.75),
    hue:   rnd(262, 290),
    sat:   rnd(80, 100),
    lit:   rnd(45, 65),
  }));

  let t = 0, raf = null;

  function step() {
    t += 0.0025;
    const W = canvas.width, H = canvas.height;

    /* Very slow fade → long visible smoke trails */
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.014;
    ctx.fillStyle   = '#050210';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    /* Additive blend — streams glow brighter where they cross */
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    for (const p of particles) {
      const a = fieldAngle(p.x, p.y, t);
      p.x += Math.cos(a) * p.spd;
      p.y += Math.sin(a) * p.spd;

      p.trail.push([p.x, p.y]);
      if (p.trail.length > TAIL) p.trail.shift();

      const M = 100;
      if (p.x < -M || p.x > W + M || p.y < -M || p.y > H + M) {
        p.x = rnd(0, W);
        p.y = rnd(0, H);
        p.trail = [];
        continue;
      }

      const tr  = p.trail;
      const len = tr.length;
      if (len < 8) continue;

      const h = p.hue, s = p.sat, l = p.lit;

      /* Pass 1 — wide soft halo (atmospheric smoke volume) */
      drawSmooth(tr);
      ctx.strokeStyle = `hsla(${h},${s}%,${l}%,0.030)`;
      ctx.lineWidth   = 42;
      ctx.stroke();

      /* Pass 2 — medium glow */
      const t2 = tr.slice(Math.floor(len * 0.15));
      drawSmooth(t2);
      ctx.strokeStyle = `hsla(${h},${s}%,${l + 8}%,0.090)`;
      ctx.lineWidth   = 14;
      ctx.stroke();

      /* Pass 3 — inner glow, still no white */
      const t3 = tr.slice(Math.floor(len * 0.45));
      drawSmooth(t3);
      ctx.strokeStyle = `hsla(${h},${s}%,${l + 14}%,0.22)`;
      ctx.lineWidth   = 4;
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(step);
  }

  ctx.fillStyle = '#050210';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  step();

  const heroEl = document.querySelector('.hero-section[data-dir="design"]');
  if (heroEl) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!raf) step(); }
      else { cancelAnimationFrame(raf); raf = null; }
    }).observe(heroEl);
  }
}());
