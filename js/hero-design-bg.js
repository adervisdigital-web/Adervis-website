// Flowing purple light field for Design page hero
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

  /* ── Flow field: multi-frequency sine noise → organic curves ── */
  function fieldAngle(x, y, t) {
    const nx = x * 0.0022, ny = y * 0.0022;
    return (
      Math.sin(nx * 1.1  + t * 0.22)  * Math.cos(ny * 0.78 - t * 0.14) +
      Math.sin(nx * 2.6  - ny * 1.7  + t * 0.27) * 0.55 +
      Math.cos(nx * 0.65 + ny * 2.1  - t * 0.11) * 0.40 +
      Math.sin(nx * 4.0  + ny * 0.5  + t * 0.35) * 0.18
    ) * Math.PI * 3.2;
  }

  /* ── Particles ── */
  const COUNT = 220;
  const TAIL  = 150;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  const particles = Array.from({ length: COUNT }, () => ({
    x:    rnd(0, window.innerWidth),
    y:    rnd(0, window.innerHeight),
    trail: [],
    spd:  rnd(1.1, 2.6),
    hue:  rnd(255, 295),   // deep purple → violet
    sat:  rnd(75, 100),
    lit:  rnd(52, 78),
  }));

  let t = 0, raf = null;

  function step() {
    t += 0.0032;
    const W = canvas.width, H = canvas.height;

    /* Slow fade → long trailing streaks */
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.038;
    ctx.fillStyle   = '#06030f';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;

    /* Additive blending — lights stack at crossings */
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    for (const p of particles) {
      const a = fieldAngle(p.x, p.y, t);
      p.x += Math.cos(a) * p.spd;
      p.y += Math.sin(a) * p.spd;

      p.trail.push([p.x, p.y]);
      if (p.trail.length > TAIL) p.trail.shift();

      /* Reset off-screen */
      const M = 90;
      if (p.x < -M || p.x > W + M || p.y < -M || p.y > H + M) {
        p.x = rnd(0, W);
        p.y = rnd(0, H);
        p.trail = [];
        continue;
      }

      const tr  = p.trail;
      const len = tr.length;
      if (len < 6) continue;

      const h = p.hue, s = p.sat, l = p.lit;

      /* Pass 1 — wide glow halo */
      ctx.beginPath();
      ctx.moveTo(tr[0][0], tr[0][1]);
      for (let i = 1; i < len; i++) ctx.lineTo(tr[i][0], tr[i][1]);
      ctx.strokeStyle = `hsla(${h},${s}%,${l}%,0.07)`;
      ctx.lineWidth   = 10;
      ctx.stroke();

      /* Pass 2 — mid glow */
      const s1 = Math.floor(len * 0.22);
      ctx.beginPath();
      ctx.moveTo(tr[s1][0], tr[s1][1]);
      for (let i = s1 + 1; i < len; i++) ctx.lineTo(tr[i][0], tr[i][1]);
      ctx.strokeStyle = `hsla(${h},${s}%,${l}%,0.20)`;
      ctx.lineWidth   = 2.8;
      ctx.stroke();

      /* Pass 3 — bright core */
      const s2 = Math.floor(len * 0.55);
      ctx.beginPath();
      ctx.moveTo(tr[s2][0], tr[s2][1]);
      for (let i = s2 + 1; i < len; i++) ctx.lineTo(tr[i][0], tr[i][1]);
      ctx.strokeStyle = `hsla(${h},${s}%,${Math.min(l + 28, 100)}%,0.88)`;
      ctx.lineWidth   = 0.85;
      ctx.stroke();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    raf = requestAnimationFrame(step);
  }

  /* Initial black fill */
  ctx.fillStyle = '#06030f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  step();

  /* Pause when hero scrolls off-screen */
  const heroEl = document.querySelector('.hero-section[data-dir="design"]');
  if (heroEl) {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { if (!raf) step(); }
      else { cancelAnimationFrame(raf); raf = null; }
    }).observe(heroEl);
  }
}());
