// Soft purple smoke streams — blurred brush-stroke approach
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

  /* ── Stream definitions: slow horizontal waves ──
     yBase  — vertical center (0..1 of height)
     a1/a2  — amplitude of two sine components (0..1 of height)
     f1/f2  — frequency of each component
     p1/p2  — phase offset
     s1/s2  — animation speed
     hue    — purple range 262-288
     w      — stroke width px                              */
  const STREAMS = [
    { yBase:0.36, a1:0.07, a2:0.04, f1:0.7, f2:1.4, p1:0.0, p2:0.6, s1:0.07, s2:0.11, hue:272, w:28 },
    { yBase:0.44, a1:0.10, a2:0.05, f1:0.5, f2:1.1, p1:2.0, p2:1.5, s1:0.05, s2:0.09, hue:278, w:40 },
    { yBase:0.51, a1:0.13, a2:0.06, f1:0.6, f2:1.8, p1:1.0, p2:2.7, s1:0.06, s2:0.10, hue:268, w:50 },
    { yBase:0.59, a1:0.11, a2:0.05, f1:0.8, f2:1.3, p1:3.2, p2:0.9, s1:0.08, s2:0.07, hue:282, w:42 },
    { yBase:0.67, a1:0.08, a2:0.04, f1:0.4, f2:1.6, p1:1.5, p2:3.1, s1:0.06, s2:0.12, hue:274, w:30 },
    { yBase:0.73, a1:0.06, a2:0.03, f1:0.9, f2:1.0, p1:2.8, p2:0.4, s1:0.07, s2:0.08, hue:265, w:22 },
  ];

  /* Build smooth path for one stream */
  function buildPath(st, t, W, H) {
    const STEPS = 60;
    ctx.beginPath();
    for (let i = 0; i <= STEPS; i++) {
      const px = (i / STEPS);
      const x  = px * W;
      const y  = H * st.yBase
                + H * st.a1 * Math.sin(px * st.f1 * Math.PI * 2 + st.p1 + t * st.s1)
                + H * st.a2 * Math.sin(px * st.f2 * Math.PI * 2 + st.p2 + t * st.s2);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
  }

  let t = 0, raf = null;

  function step() {
    t += 0.0015;   // very slow drift
    const W = canvas.width, H = canvas.height;

    /* Soft fade — keeps faint ghost of previous frame */
    ctx.filter    = 'none';
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = '#050210';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    for (const st of STREAMS) {
      /* Wide outer glow */
      ctx.save();
      ctx.filter      = 'blur(28px)';
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = `hsl(${st.hue},88%,42%)`;
      ctx.lineWidth   = st.w;
      buildPath(st, t, W, H);
      ctx.stroke();
      ctx.restore();

      /* Inner brighter core — still purple, no white */
      ctx.save();
      ctx.filter      = 'blur(8px)';
      ctx.globalAlpha = 0.70;
      ctx.strokeStyle = `hsl(${st.hue},92%,58%)`;
      ctx.lineWidth   = st.w * 0.28;
      buildPath(st, t, W, H);
      ctx.stroke();
      ctx.restore();
    }

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
