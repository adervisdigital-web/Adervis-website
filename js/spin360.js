/* ═══════════════════════════════════════════════════════════════
   Вращение продукта по кадрам (360°)

   Почему не three.js: он в проекте есть, но весит 662 КБ и на главной
   даёт задачу в 1,2 с на главном потоке. Тащить его на страницу кейса
   ради одной банки — плохой размен. Здесь вместо этого 24 заранее
   отрендеренных кадра: ни WebGL, ни парсинга модели, ни рендер-лупа,
   переключение кадра — это смена src уже закэшированной картинки.

   Прогрессивное улучшение: в разметке лежит обычный <picture> с постером.
   Без JS это просто картинка, вёрстка не ломается. Кадры подгружаются
   только когда блок подъезжает к экрану, по одному, чтобы не занимать
   канал у остального контента.

   Разметка:
     <div class="media-frame has-img js-spin"
          data-spin-src="path/to/spin/{i}.webp"
          data-spin-frames="24">
       <picture>…постер…</picture>
     </div>
   ═══════════════════════════════════════════════════════════════ */
(function () {
  function initSpin() {
    var nodes = document.querySelectorAll('.js-spin[data-spin-src]');
    if (!nodes.length) return;

    Array.prototype.forEach.call(nodes, function (el) {
      var tpl    = el.getAttribute('data-spin-src');
      var total  = parseInt(el.getAttribute('data-spin-frames'), 10) || 0;
      var poster = el.querySelector('img');
      if (!tpl || total < 2 || !poster) return;

      var srcOf = function (i) { return tpl.replace('{i}', String(i).padStart(2, '0')); };

      var frame = document.createElement('img');
      frame.className = 'media-frame__img spin__frame';
      frame.alt = '';
      frame.setAttribute('aria-hidden', 'true');
      frame.decoding = 'async';
      frame.draggable = false;

      var hint = document.createElement('span');
      hint.className = 'spin__hint';
      hint.textContent = 'Потяните, чтобы повернуть';

      var current = 0, ready = false, loaded = 0;

      // ── Предзагрузка: по одному кадру, чтобы не забивать канал ──
      function preload(next) {
        if (next >= total) {
          ready = true;
          el.classList.add('is-spinnable');
          return;
        }
        var img = new Image();
        img.onload = img.onerror = function () { loaded++; preload(next + 1); };
        img.src = srcOf(next);
      }

      function show(i) {
        current = ((i % total) + total) % total;
        frame.src = srcOf(current);
      }

      function activate() {
        if (frame.parentNode) return;
        frame.src = srcOf(0);
        el.appendChild(frame);
        el.appendChild(hint);
        el.setAttribute('role', 'img');
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-label', (poster.alt || 'Модель продукта') +
          '. Потяните мышью или стрелками влево-вправо, чтобы повернуть');
        preload(0);
      }

      // Активируем, когда блок подъезжает к экрану
      if ('IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { if (e.isIntersecting) { activate(); io.disconnect(); } });
        }, { rootMargin: '300px 0px' });
        io.observe(el);
      } else {
        activate();
      }

      // ── Перетаскивание ──
      var dragging = false, startX = 0, startFrame = 0;

      function onDown(e) {
        if (!ready || e.button > 0) return;
        dragging = true;
        startX = e.clientX;
        startFrame = current;
        el.classList.add('is-dragging');
        el.classList.add('has-spun');
        if (el.setPointerCapture && e.pointerId !== undefined) el.setPointerCapture(e.pointerId);
      }

      function onMove(e) {
        if (!dragging) return;
        // полный оборот примерно за полторы ширины блока — привычная чувствительность
        var perFrame = (el.clientWidth * 1.5) / total;
        show(startFrame - Math.round((e.clientX - startX) / perFrame));
      }

      function onUp() {
        dragging = false;
        el.classList.remove('is-dragging');
      }

      if (window.PointerEvent) {
        el.addEventListener('pointerdown', onDown);
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
      } else {
        el.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        el.addEventListener('touchstart', function (e) { onDown(e.touches[0]); }, { passive: true });
        el.addEventListener('touchmove',  function (e) { onMove(e.touches[0]); }, { passive: true });
        el.addEventListener('touchend', onUp);
      }

      // ── Клавиатура ──
      el.addEventListener('keydown', function (e) {
        if (!ready) return;
        if (e.key === 'ArrowLeft')       { show(current - 1); }
        else if (e.key === 'ArrowRight') { show(current + 1); }
        else return;
        e.preventDefault();
        el.classList.add('has-spun');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSpin);
  } else {
    initSpin();
  }
}());
