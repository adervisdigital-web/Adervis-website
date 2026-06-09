// Корень сайта вычисляем по фактическому адресу этого файла — так компоненты
// и их внутренние ссылки работают и в подпапке (GitHub Pages /Adervis-website/),
// и на домене целиком, без ручной подгонки путей под способ хостинга
const appScript = document.currentScript;
const rootPath = appScript
  ? new URL(appScript.getAttribute("src"), document.baseURI).pathname.replace(/js\/app\.js$/, "")
  : "/";

document.addEventListener("DOMContentLoaded", () => {
  // Функция для подгрузки HTML компонентов — возвращает промис с готовым элементом
  const loadComponent = (id, url) => {
    const el = document.getElementById(id);
    if (!el) return Promise.resolve(null);

    return fetch(url)
      .then(response => response.text())
      .then(html => {
        // header.html/footer.html написаны с путями от корня сайта («/logo.svg», «/video»):
        // подставляем вычисленный rootPath, чтобы они указывали верно из любой подпапки
        el.innerHTML = rootPath === "/" ? html : html.replace(/((?:href|src)=")\//g, `$1${rootPath}`);
        return el;
      })
      .catch(error => { console.warn("Ошибка загрузки компонента:", error); return null; });
  };

  // Загружаем шапку и подвал, затем включаем их интерактивность
  loadComponent("header-placeholder", `${rootPath}components/header.html`).then(headerRoot => {
    initFloatingHeader(headerRoot);
    initMobileNav(headerRoot);
    markActiveNavLink(headerRoot);
  });
  loadComponent("footer-placeholder", `${rootPath}components/footer.html`).then(initBackToTop);

  initScrollReveal();
  initStatCounters();
  initVideoCalculator();
  initLeadForm();
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

// Бургер-меню для мобильных экранов — выезжающая панель навигации поверх контента
function initMobileNav(headerRoot) {
  if (!headerRoot) return;

  const toggle = headerRoot.querySelector("#navToggle");
  const nav = headerRoot.querySelector("#siteNav");
  const backdrop = document.getElementById("navBackdrop");
  if (!toggle || !nav || !backdrop) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    nav.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-visible", open);
    document.body.classList.toggle("nav-open", open);
  };

  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  backdrop.addEventListener("click", () => setOpen(false));
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setOpen(false)));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 860) setOpen(false);
  });
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

// Калькулятор стоимости видео (страница /video) — три шага вместо одной формы:
// параметры → опции → контакты. Так пользователь не просто видит цифру и уходит,
// а оставляет заявку «по пути» — письмо собирает все данные расчёта, без бэкенда
function initVideoCalculator() {
  const form = document.getElementById("videoCalc");
  if (!form) return;

  const formatSelect = form.querySelector('[data-role="format"]');
  const lengthSelect = form.querySelector('[data-role="length"]');
  const checkboxes = form.querySelectorAll('.calc-options input[type="checkbox"]');
  const resultEl = form.querySelector('[data-role="result"]');
  const formatPrice = new Intl.NumberFormat("ru-RU");

  const steps = Array.from(form.querySelectorAll(".calc-step"));
  const dots = Array.from(form.querySelectorAll(".calc-progress-step"));
  const backBtn = form.querySelector('[data-calc-action="back"]');
  const nextBtn = form.querySelector('[data-calc-action="next"]');
  const submitBtn = form.querySelector('[data-calc-action="submit"]');
  const lastStep = steps.length;
  let current = 1;

  // Вилка вокруг расчётного центра — честно показываем «от» и «до», а не точную цифру
  const calculate = () => {
    const base = Number(formatSelect.selectedOptions[0].dataset.base);
    const mult = Number(lengthSelect.selectedOptions[0].dataset.mult);
    let addOns = 0;
    checkboxes.forEach(box => { if (box.checked) addOns += Number(box.dataset.add); });

    const center = base * mult + addOns;
    const low = Math.round((center * 0.85) / 1000) * 1000;
    const high = Math.round((center * 1.2) / 1000) * 1000;

    resultEl.textContent = `от ${formatPrice.format(low)} до ${formatPrice.format(high)} ₽`;
    return { low, high };
  };

  const showStep = (n) => {
    current = n;
    steps.forEach(step => step.classList.toggle("is-active", Number(step.dataset.step) === n));
    dots.forEach((dot, i) => {
      dot.classList.toggle("is-active", i + 1 === n);
      dot.classList.toggle("is-done", i + 1 < n);
    });
    backBtn.hidden = n === 1;
    nextBtn.hidden = n === lastStep;
    submitBtn.hidden = n !== lastStep;
    if (n === lastStep) calculate();
  };

  form.addEventListener("change", calculate);
  calculate();
  showStep(1);

  backBtn.addEventListener("click", () => { if (current > 1) showStep(current - 1); });
  nextBtn.addEventListener("click", () => { if (current < lastStep) showStep(current + 1); });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const { low, high } = calculate();

    const name = form.querySelector('[name="leadName"]').value.trim();
    const contact = form.querySelector('[name="leadContact"]').value.trim();
    const deadline = form.querySelector('[name="leadDeadline"]').value.trim();
    if (!name || !contact) return;

    const extras = Array.from(checkboxes)
      .filter(box => box.checked)
      .map(box => box.parentElement.querySelector("span").textContent.trim());

    const lines = [
      `Имя: ${name}`,
      `Контакт: ${contact}`,
      deadline ? `Срок: ${deadline}` : null,
      `Формат: ${formatSelect.selectedOptions[0].textContent.trim()}`,
      `Хронометраж: ${lengthSelect.selectedOptions[0].textContent.trim()}`,
      extras.length ? `Дополнительно: ${extras.join(", ")}` : null,
      `Ориентировочный бюджет (по калькулятору): от ${formatPrice.format(low)} до ${formatPrice.format(high)} ₽`,
    ].filter(Boolean).join("\n");

    const subject = encodeURIComponent("Заявка на видео — расчёт с сайта");
    const body = encodeURIComponent(`Здравствуйте! Прошу подготовить расчёт и КП по проекту:\n\n${lines}`);
    window.location.href = `mailto:adervis.digital@gmail.com?subject=${subject}&body=${body}`;
  });
}

// Подсвечиваем активную ссылку в навигации по текущему пути
function markActiveNavLink(headerRoot) {
  if (!headerRoot) return;
  const links = headerRoot.querySelectorAll(".nav a");
  const path = window.location.pathname.replace(rootPath, "/").replace(/\/$/, "") || "/";
  links.forEach(link => {
    const href = link.getAttribute("href").replace(rootPath, "/").replace(/\/$/, "") || "/";
    if (href === path || (href !== "/" && path.startsWith(href))) {
      link.style.color = "var(--gold-soft)";
    }
  });
}

// Анимация счётчиков статистики — числа «отсчитываются» вверх при появлении во вьюпорте
function initStatCounters() {
  const numbers = document.querySelectorAll(".stat-number");
  if (!numbers.length) return;

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) return;

  const easeOut = t => 1 - Math.pow(1 - t, 3);

  const animateNumber = (el) => {
    const raw = el.textContent.trim();
    const match = raw.match(/^(\d+)(\+?)$/);
    if (!match) return;
    const target = parseInt(match[1], 10);
    const suffix = match[2] || "";
    const duration = 1200;
    const start = performance.now();

    el.classList.add("is-counting");

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.round(easeOut(progress) * target);
      el.textContent = value + (progress === 1 ? suffix : "+");
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateNumber(entry.target);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  numbers.forEach(el => observer.observe(el));
}

// Заявка на КП (главная, #contacts) — единственная форма захвата на сайте:
// «гейтит» расчёт за минимальным действием (имя + контакт) и оформляет
// заявку письмом, без бэкенда — та же схема, что у калькулятора /video
function initLeadForm() {
  const form = document.getElementById("leadForm");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = form.querySelector('[name="name"]').value.trim();
    const contact = form.querySelector('[name="contact"]').value.trim();
    const message = form.querySelector('[name="message"]').value.trim();
    if (!name || !contact) return;

    const lines = [
      `Имя: ${name}`,
      `Контакт: ${contact}`,
      message ? `Задача: ${message}` : "Задача: уточнит при созвоне",
    ].join("\n");

    const subject = encodeURIComponent("Заявка на КП — с сайта ADERVIS");
    const body = encodeURIComponent(`Здравствуйте! Прошу подготовить КП по задаче:\n\n${lines}`);
    window.location.href = `mailto:adervis.digital@gmail.com?subject=${subject}&body=${body}`;
  });
}