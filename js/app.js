document.addEventListener("DOMContentLoaded", () => {
  // Функция для подгрузки HTML компонентов
  const loadComponent = (id, url) => {
    const el = document.getElementById(id);
    if (!el) return;

    fetch(url)
      .then(response => response.text())
      .then(html => { el.innerHTML = html; })
      .catch(error => console.warn("Ошибка загрузки компонента:", error));
  };

  // Загружаем шапку и подвал
  loadComponent("header-placeholder", "/components/header.html");
  loadComponent("footer-placeholder", "/components/footer.html");

  initScrollReveal();
});

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