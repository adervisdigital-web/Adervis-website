(function () {
  function initGallery() {
    var gallery = document.querySelector('.case-gallery');
    if (!gallery) return;

    var items = Array.from(gallery.querySelectorAll('.case-gallery__item'));
    var imgs  = items.map(function (el) { return el.querySelector('img'); });
    var current = 0;

    /* Build lightbox */
    var lb = document.createElement('div');
    lb.className = 'gallery-lightbox';
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

    function show(index) {
      current = (index + imgs.length) % imgs.length;
      var img = imgs[current];
      /* Prefer data-src (full-size) else fall back to displayed src */
      lbImg.src = img.dataset.full || img.src;
      lbImg.alt = img.alt;
      lbCounter.textContent = (current + 1) + ' / ' + imgs.length;
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    items.forEach(function (item, i) {
      item.addEventListener('click', function () { show(i); });
    });

    lb.querySelector('.gallery-lightbox__close').addEventListener('click', close);
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
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
  } else {
    initGallery();
  }
})();
