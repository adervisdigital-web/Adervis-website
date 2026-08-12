(function () {
  function initGallery() {
    /* Собираем по всей странице, а не внутри одного .case-gallery: кадры с
       лайтбоксом бывают и вне галереи (напр. окна «кухни проекта» на кейсе
       SHABANI — скриншоты рабочих экранов, которые в вёрстке нечитаемы и
       нужны в полном размере). Метка для таких — .js-lightbox-item. */
    var items = Array.from(document.querySelectorAll('.case-gallery__item, .js-lightbox-item'));
    if (!items.length) return;

    var imgs  = items.map(function (el) { return el.querySelector('img'); });
    var current = 0;
    var lastTrigger = null;

    /* Build lightbox */
    var lb = document.createElement('div');
    lb.className = 'gallery-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Просмотр изображения');
    lb.innerHTML =
      '<div class="gallery-lightbox__overlay"></div>' +
      '<img class="gallery-lightbox__img" src="" alt="">' +
      '<button class="gallery-lightbox__close" aria-label="Закрыть">✕</button>' +
      '<button class="gallery-lightbox__prev"  aria-label="Предыдущее">&#8592;</button>' +
      '<button class="gallery-lightbox__next"  aria-label="Следующее">&#8594;</button>' +
      '<div class="gallery-lightbox__counter"></div>';
    document.body.appendChild(lb);

    var lbImg     = lb.querySelector('.gallery-lightbox__img');
    var lbCounter = lb.querySelector('.gallery-lightbox__counter');
    var lbClose   = lb.querySelector('.gallery-lightbox__close');

    function show(index, trigger) {
      if (trigger) lastTrigger = trigger;
      current = (index + imgs.length) % imgs.length;
      var img = imgs[current];
      /* Prefer data-src (full-size) else fall back to displayed src */
      lbImg.src = img.dataset.full || img.src;
      lbImg.alt = img.alt;
      lbCounter.textContent = (current + 1) + ' / ' + imgs.length;
      var wasOpen = lb.classList.contains('is-open');
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      if (!wasOpen) lbClose.focus();
    }

    function close() {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      if (lastTrigger) { lastTrigger.focus(); lastTrigger = null; }
    }

    items.forEach(function (item, i) {
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      if (!item.hasAttribute('aria-label')) {
        var img = item.querySelector('img');
        item.setAttribute('aria-label', (img && img.alt ? img.alt : 'Изображение ' + (i + 1)) + ' — открыть в полном размере');
      }
      item.addEventListener('click', function () { show(i, item); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i, item); }
      });
    });

    lbClose.addEventListener('click', close);
    lb.querySelector('.gallery-lightbox__prev').addEventListener('click', function () { show(current - 1); });
    lb.querySelector('.gallery-lightbox__next').addEventListener('click', function () { show(current + 1); });
    lb.querySelector('.gallery-lightbox__overlay').addEventListener('click', close);

    /* Swipe support */
    var touchStartX = 0;
    lb.addEventListener('touchstart', function (e) { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) { dx < 0 ? show(current + 1) : show(current - 1); }
    });

    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape')      close();
      if (e.key === 'ArrowLeft')   show(current - 1);
      if (e.key === 'ArrowRight')  show(current + 1);
      if (e.key === 'Tab') {
        var focusables = lb.querySelectorAll('button');
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ─── Листалка кадров внутри одной карточки (.js-slider) ──────────────────
     Несколько кадров под общей подписью, видно всегда один. Прогрессивное
     улучшение: сама прокрутка — нативный scroll-snap в CSS, поэтому без JS
     кадры листаются свайпом и вёрстка не меняется. JS добавляет только то,
     чего у скролла нет: стрелки, точки и счётчик.

     Слайды — обычные .media-frame, в том числе .js-lightbox-item: клик по
     кадру по-прежнему открывает лайтбокс, стрелки и точки клик не перехватят,
     они лежат рядом со слайдами, а не внутри. */
  function initSliders() {
    Array.prototype.forEach.call(document.querySelectorAll('.js-slider'), function (root) {
      var track  = root.querySelector('.case-slider__track');
      var slides = track ? Array.prototype.slice.call(track.children) : [];
      if (slides.length < 2) return;

      var nav = document.createElement('div');
      nav.className = 'case-slider__nav';
      nav.innerHTML =
        '<button type="button" class="case-slider__arrow" data-step="-1" aria-label="Предыдущий кадр">&#8592;</button>' +
        '<div class="case-slider__dots" role="tablist"></div>' +
        '<button type="button" class="case-slider__arrow" data-step="1" aria-label="Следующий кадр">&#8594;</button>';
      root.appendChild(nav);

      var dotsBox = nav.querySelector('.case-slider__dots');
      var dots = slides.map(function (_, i) {
        var d = document.createElement('button');
        d.type = 'button';
        d.className = 'case-slider__dot';
        d.setAttribute('role', 'tab');
        d.setAttribute('aria-label', 'Кадр ' + (i + 1) + ' из ' + slides.length);
        d.addEventListener('click', function () { go(i); });
        dotsBox.appendChild(d);
        return d;
      });

      var current = 0;
      function paint() {
        dots.forEach(function (d, i) {
          d.classList.toggle('is-active', i === current);
          d.setAttribute('aria-selected', i === current ? 'true' : 'false');
        });
        slides.forEach(function (s, i) { s.setAttribute('aria-hidden', i === current ? 'false' : 'true'); });
      }
      function go(i) {
        current = (i + slides.length) % slides.length;
        track.scrollTo({ left: current * track.clientWidth, behavior: 'smooth' });
        paint();
      }

      Array.prototype.forEach.call(nav.querySelectorAll('.case-slider__arrow'), function (btn) {
        btn.addEventListener('click', function () { go(current + (+btn.dataset.step)); });
      });

      /* Свайп и стрелки ведут к одному состоянию: индекс считаем по скроллу */
      var raf = null;
      track.addEventListener('scroll', function () {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var i = Math.round(track.scrollLeft / track.clientWidth);
          if (i !== current && i >= 0 && i < slides.length) { current = i; paint(); }
        });
      });

      root.classList.add('is-ready');
      paint();
    });
  }

  function init() { initGallery(); initSliders(); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
