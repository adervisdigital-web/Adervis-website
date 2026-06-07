document.addEventListener("DOMContentLoaded", () => {
  // Функция для подгрузки HTML компонентов — возвращает промис с готовым элементом
  const loadComponent = (id, url) => {
    const el = document.getElementById(id);
    if (!el) return Promise.resolve(null);

    return fetch(url)
      .then(response => response.text())
      .then(html => { el.innerHTML = html; return el; })
      .catch(error => { console.warn("Ошибка загрузки компонента:", error); return null; });
  };

  // Загружаем шапку и подвал, затем включаем их интерактивность
  loadComponent("header-placeholder", "/components/header.html").then(initFloatingHeader);
  loadComponent("footer-placeholder", "/components/footer.html").then(initBackToTop);

  initScrollReveal();
});

// Шапка получает более плотный фон и тень при прокрутке — «всплывает» поверх контента (DESIGN.md §9)
function initFloatingHeader(headerRoot) {
  const topbar = headerRoot && headerRoot.querySelector(".topbar");
  if (!topbar) return;

  const onScroll = () => {
    topbar.classList.toggle("is-scrolled", window.scrollY > 24);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// Кнопка «наверх» — появляется после прокрутки и плавно возвращает к началу страницы
function initBackToTop(footerRoot) {
  const button = footerRoot && footerRoot.querySelector("#toTop");
  if (!button) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onScroll = () => {
    button.classList.toggle("is-visible", window.scrollY > 480);
  };

  button.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  });

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// Плавное появление секций и карточек при попадании во вьюпорт (DESIGN.md §7)
function initScrollReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    targets.forEach(el => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });

  targets.forEach(el => observer.observe(el));
}