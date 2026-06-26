// Корень сайта вычисляем по фактическому адресу этого файла — так компоненты
// и их внутренние ссылки работают и в подпапке (GitHub Pages /Adervis-website/),
// и на домене целиком, без ручной подгонки путей под способ хостинга
const appScript = document.currentScript;
const rootPath = appScript
  ? new URL(appScript.getAttribute("src"), document.baseURI).pathname.replace(/js\/app\.js$/, "")
  : "/";

// iOS Safari блокирует window.open() как popup даже из submit-событий.
// Метод с программным кликом по <a> надёжнее — работает как прямой user-action.
function openTgLink(url) {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function showToast(msg, duration = 4000) {
  const existing = document.getElementById('adervis-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'adervis-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = msg;
  document.body.appendChild(toast);

  requestAnimationFrame(() => { toast.classList.add('is-visible'); });
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

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
    initThemeToggle(headerRoot);

    // «Главная» на главной странице → прокрутка в начало без перезагрузки
    headerRoot.querySelectorAll(".pill-nav__link").forEach(link => {
      const normalHref = (link.getAttribute("href") || "")
        .replace(rootPath, "/").replace(/\/$/, "") || "/";
      if (normalHref !== "/") return;
      link.addEventListener("click", e => {
        const normalPath = window.location.pathname
          .replace(rootPath, "/").replace(/\/$/, "") || "/";
        if (normalPath !== "/") return; // другая страница — пусть браузер переходит
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        // закрыть мобильное меню если открыто
        const nav = headerRoot.querySelector("#siteNav");
        const backdrop = document.getElementById("navBackdrop");
        const toggle   = headerRoot.querySelector("#navToggle");
        if (nav)      nav.classList.remove("is-open");
        if (backdrop) backdrop.classList.remove("is-visible");
        if (toggle)   toggle.setAttribute("aria-expanded", "false");
      });
    });
  });
  loadComponent("footer-placeholder", `${rootPath}components/footer.html`).then(el => {
    initBackToTop(el);
    initTickerDrag(el);
  });

  initServicesGrid();
  initHeroQuiz();
  initFloatingCta();
  initQuiz();
  initModal();
  initCtaDirChips();
  initVideoPoster();
  initScrollReveal();
  initStatCounters();
  initVideoCalculator();
  initSimpleCalculator("designCalc", "Заявка на дизайн с сайта ADERVIS");
  initSimpleCalculator("photoCalc", "Заявка на фотосъёмку с сайта ADERVIS");
  initSimpleCalculator("aiCalc", "Заявка на ИИ-контент с сайта ADERVIS");
  initLeadForm();
  initScrollProgress();
  initCardSpotlight();
  initCustomCursor();
  initMagneticButtons();
  initVkVideoApi();
  initVideoGallery();
  initReviewsSlider();
  initVideoThumbnails();
  initVideoReviewThumbnails(); // применяет data-thumb если задан вручную
  initVideoReviewsPlayer();
  initVimeoModal();
});

function initQuiz() {
  const card = document.getElementById('quizCard');
  if (!card) return;

  const bar      = document.getElementById('quizBar');
  const summary  = document.getElementById('quizSummary');
  const stepNum  = document.getElementById('quizStepNum');
  const answers  = {};
  let current    = 1;
  const TOTAL    = 3;

  function goTo(n) {
    card.querySelectorAll('.quiz-step').forEach(s => s.classList.remove('is-active'));
    const next = card.querySelector(`[data-step="${n}"]`);
    if (next) next.classList.add('is-active');
    current = n;

    const displayStep = Math.min(n, TOTAL);
    const pct = Math.round(((displayStep - 1) / TOTAL) * 100);
    if (bar) bar.style.width = pct + '%';
    if (stepNum) stepNum.textContent = String(displayStep).padStart(2, '0');

    if (n === 4) renderSummary();
    if (n === 5 && bar) bar.style.width = '100%';
  }

  function renderSummary() {
    if (!summary) return;
    summary.innerHTML = Object.values(answers)
      .map(v => `<span>${v}</span>`).join('');
  }

  // Кнопка «Назад»
  card.querySelectorAll('.quiz-back').forEach(btn => {
    btn.addEventListener('click', () => goTo(current - 1));
  });

  // Карточки направлений и выборы бюджета/срока
  card.querySelectorAll('.quiz-dc, .quiz-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const val = btn.dataset.val;
      card.querySelectorAll(`[data-key="${key}"]`)
          .forEach(b => b.classList.remove('is-selected'));
      btn.classList.add('is-selected');
      answers[key] = val;
      setTimeout(() => goTo(current + 1), 300);
    });
  });

  const submitBtn = document.getElementById('quizSubmit');
  if (submitBtn) {
    submitBtn.addEventListener('click', () => {
      const name    = (document.getElementById('quizName')?.value || '').trim();
      const contact = (document.getElementById('quizContact')?.value || '').trim();
      if (!name && !contact) {
        document.getElementById('quizContact')?.focus();
        return;
      }
      const lines = [
        '📋 КП-запрос с сайта ADERVIS',
        '',
        answers.dir      ? `Направление: ${answers.dir}`   : null,
        answers.budget   ? `Бюджет: ${answers.budget}`     : null,
        answers.deadline ? `Срок: ${answers.deadline}`     : null,
        '',
        name    ? `Имя: ${name}`        : null,
        contact ? `Контакт: ${contact}` : null,
      ].filter(l => l !== null).join('\n');

      openTgLink(`https://t.me/Adervis_digital?text=${encodeURIComponent(lines)}`);
      goTo(5);
    });
  }
}

function initServicesGrid() {
  document.querySelectorAll('.s4-grid, .sv3-grid').forEach(grid => {
    const center = grid.querySelector('.s4-center');
    if (!center) return;
    grid.querySelectorAll('.s4-cell, .sv3-card').forEach(card => {
      const dir = [...card.classList]
        .find(c => c.startsWith('s4-cell--') || c.startsWith('sv3-card--'))
        ?.replace(/^(s4-cell--|sv3-card--)/, '');
      if (!dir) return;
      card.addEventListener('mouseenter', () => { center.dataset.hover = dir; });
      card.addEventListener('mouseleave', () => { delete center.dataset.hover; });
    });
  });
}

function initHeroQuiz() {
  const chips   = document.querySelectorAll('.hero-quiz__chip');
  const sendBtn = document.getElementById('heroQuizSend');

  // Десктоп: чипы + кнопка «Начать»
  if (chips.length) {
    if (sendBtn) sendBtn.disabled = true;

    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        const wasActive = chip.classList.contains('is-active');
        chips.forEach(c => c.classList.remove('is-active'));
        if (!wasActive) chip.classList.add('is-active');
        if (sendBtn) sendBtn.disabled = wasActive;
      });
    });

    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const active = document.querySelector('.hero-quiz__chip.is-active');
        openModal(active?.dataset.val || null);
      });
    }
  }

  // Мобайл: вертикальный список, один клик = попап
  document.querySelectorAll('.hero-quiz__list-item').forEach(item => {
    item.addEventListener('click', () => openModal(item.dataset.val || null));
  });
}

function initFloatingCta() {
  const bar = document.createElement('div');
  bar.className = 'floating-cta';
  bar.id = 'floatingCta';
  bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = `
    <a href="tel:+79223018880" class="floating-cta__call" aria-label="Позвонить: +7 922 301-88-80">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.36 12 19.79 19.79 0 0 1 1.29 3.33 2 2 0 0 1 3.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
    </a>
    <button type="button" class="floating-cta__btn" id="floatingCtaBtn">
      Обсудить проект
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </button>`;
  document.body.appendChild(bar);

  const btn = bar.querySelector('#floatingCtaBtn');
  const contacts = document.getElementById('contacts');
  let ticking = false;

  const update = () => {
    const scrollY = window.scrollY;
    const heroEl = document.querySelector('.hero-section, .vp-hero, .cases-hero');
    const heroBottom = heroEl ? heroEl.offsetTop + heroEl.offsetHeight * 0.55 : 320;
    const contactsTop = contacts
      ? contacts.getBoundingClientRect().top + scrollY - 80
      : Infinity;
    const shouldShow = scrollY > heroBottom && scrollY < contactsTop;
    bar.classList.toggle('is-visible', shouldShow);
    bar.setAttribute('aria-hidden', String(!shouldShow));
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });

  update();

  if (btn) {
    btn.addEventListener('click', () => {
      const modal = document.getElementById('requestModal');
      const active = document.querySelector('.hero-quiz__chip.is-active');
      const dir = active?.dataset.val || null;
      if (modal) {
        openModal(dir);
      } else if (contacts) {
        if (dir) syncCtaDirChips(dir);
        contacts.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => document.getElementById('lh-name')?.focus(), 600);
      }
    });
  }
}

function syncCtaDirChips(val) {
  document.querySelectorAll('.cta-dir-chip').forEach(c => {
    c.classList.toggle('is-active', c.dataset.val === val);
  });
  const dirField = document.getElementById('lh-direction');
  if (dirField) dirField.value = val || '';
}

// ── Модальное окно быстрой заявки ──────────────────────────────────────────
function openModal(direction) {
  const modal = document.getElementById('requestModal');
  if (!modal) return;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  // Синхронизируем направление если выбрано
  if (direction) {
    document.querySelectorAll('.modal-dir-chip').forEach(c => {
      c.classList.toggle('is-active', c.dataset.val === direction);
    });
    const field = document.getElementById('modal-direction');
    if (field) field.value = direction;
  }

  // Фокус на первый инпут после анимации
  setTimeout(() => {
    const first = modal.querySelector('input[type="text"], textarea');
    if (first) first.focus();
  }, 300);
}

function closeModal() {
  const modal = document.getElementById('requestModal');
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = '';
}

function initModal() {
  const modal    = document.getElementById('requestModal');
  const closeBtn = document.getElementById('modalClose');
  const form     = document.getElementById('modalForm');
  if (!modal) return;

  // Закрытие
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

  // Чипы направления в модале
  const chips = modal.querySelectorAll('.modal-dir-chip');
  const modalTextarea = modal.querySelector('textarea[name="message"]');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const wasActive = chip.classList.contains('is-active');
      chips.forEach(c => c.classList.remove('is-active'));
      const newVal = wasActive ? null : chip.dataset.val;
      if (!wasActive) chip.classList.add('is-active');
      const field = document.getElementById('modal-direction');
      if (field) field.value = newVal || '';
      setTextareaHint(modalTextarea, newVal);
      // Синхронизируем с hero-чипами
      document.querySelectorAll('.hero-quiz__chip').forEach(c => {
        c.classList.toggle('is-active', c.dataset.val === newVal);
      });
    });
  });

  // Сброс ошибок при вводе в модале
  modal.querySelectorAll('.lead-input').forEach(inp => {
    inp.addEventListener('input', () => clearFieldError(inp));
  });
  const modalConsent = modal.querySelector('#modalConsent');
  if (modalConsent) {
    modalConsent.addEventListener('change', () => {
      modalConsent.closest('.modal-consent-label').style.outline = '';
    });
  }

  // Отправка формы через mailto (152-ФЗ согласие обязательно)
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const honeypot = form.querySelector('[name="website"]');
      if (honeypot && honeypot.value) return;
      const consent = form.querySelector('#modalConsent');
      if (!consent || !consent.checked) {
        if (consent) consent.closest('.modal-consent-label').style.outline = '2px solid var(--c-video)';
        return;
      }
      const nameInput    = form.querySelector('[name="name"]');
      const contactInput = form.querySelector('[name="contact"]');
      const name      = (nameInput?.value || '').trim();
      const contact   = (contactInput?.value || '').trim();
      let hasError = false;
      if (!name && nameInput)    { showFieldError(nameInput,    'Пожалуйста, укажите имя'); hasError = true; }
      if (!contact && contactInput) { showFieldError(contactInput, 'Укажите телефон, email или Telegram'); hasError = true; }
      if (hasError) return;
      const message   = (form.querySelector('[name="message"]')?.value || '').trim();
      const direction = (form.querySelector('[name="direction"]')?.value || '').trim();

      const dirLabels = { video: 'Видео', design: 'Дизайн', photo: 'Фото', ai: 'ИИ-контент' };
      const dirName   = dirLabels[direction] || '';
      const lines = [
        `Имя: ${name}`,
        `Контакт: ${contact}`,
        dirName  ? `Направление: ${dirName}` : null,
        message  ? `Задача: ${message}` : 'Задача: уточнит при созвоне',
      ].filter(Boolean).join("\n");

      const subjectDir = dirName ? ` — ${dirName}` : '';
      const tgText = encodeURIComponent(`Заявка с сайта ADERVIS${subjectDir}:\n\n${lines}`);
      const tgUrl = `https://t.me/Adervis_digital?text=${tgText}`;
      openTgLink(tgUrl);
      closeModal();
      showToast('✓ Заявка отправлена — ответим за 2 часа в рабочее время');
    });
  }
}

const DIR_HINTS = {
  video:  'Например: рекламный ролик 30 сек для производственной компании, бюджет около 150 000 ₽, срок — сентябрь',
  design: 'Например: логотип и брендбук для IT-компании, нужна айдентика с нуля, примерный бюджет 80 000 ₽',
  photo:  'Например: предметная съёмка 20 позиций для каталога, продукт — косметика, нужна белая студия',
  ai:     'Например: серия из 10 AI-визуалов для рекламной кампании в заданном стиле бренда',
};

function setTextareaHint(textarea, val) {
  if (!textarea) return;
  textarea.placeholder = DIR_HINTS[val] || 'Например: нужен ролик о компании к выставке в сентябре, бюджет около 150 000 ₽';
}

function initCtaDirChips() {
  const chips = document.querySelectorAll('.cta-dir-chip');
  if (!chips.length) return;
  const textarea = document.getElementById('lh-message');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const wasActive = chip.classList.contains('is-active');
      chips.forEach(c => c.classList.remove('is-active'));
      const newVal = wasActive ? null : chip.dataset.val;
      if (!wasActive) chip.classList.add('is-active');
      // Sync hero quiz chips
      document.querySelectorAll('.hero-quiz__chip').forEach(c => {
        c.classList.toggle('is-active', c.dataset.val === newVal);
      });
      // Update hero hint
      const hintEl = document.getElementById('heroQuizHint');
      if (hintEl) {
        const heroChip = newVal && document.querySelector(`.hero-quiz__chip[data-val="${newVal}"]`);
        hintEl.textContent = heroChip ? (heroChip.dataset.hint || '') : '';
      }
      const dirField = document.getElementById('lh-direction');
      if (dirField) dirField.value = newVal || '';
      setTextareaHint(textarea, newVal);
    });
  });
}

// Переключатель тёмной/светлой темы — синхронизирует data-theme на <html> и кнопку в шапке
function initThemeToggle(headerRoot) {
  const btn = headerRoot && headerRoot.querySelector("#themeToggle");
  if (!btn) return;

  const html = document.documentElement;

  const applyTheme = (theme) => {
    html.setAttribute("data-theme", theme);
    localStorage.setItem("adervis-theme", theme);
    btn.setAttribute("aria-label", theme === "dark" ? "Светлая тема" : "Тёмная тема");
    // Swap logo for light/dark theme
    const logo = document.getElementById("siteLogo");
    if (logo) {
      const src = theme === "light" ? logo.dataset.light : logo.dataset.dark;
      if (src) logo.src = src.startsWith("/") ? rootPath + src.slice(1) : src;
    }
  };

  // Применяем сохранённую или системную тему (может быть уже выставлена anti-flash скриптом)
  const stored = localStorage.getItem("adervis-theme");
  const sys = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  applyTheme(stored || sys);

  btn.addEventListener("click", () => {
    const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    // Плавная анимация кнопки
    btn.style.transform = "scale(0.88)";
    setTimeout(() => { btn.style.transform = ""; }, 120);
  });
}

// Шапка получает более плотный фон и тень при прокрутке — «всплывает» поверх контента (DESIGN.md §9)
function initFloatingHeader(headerRoot) {
  const header = headerRoot && headerRoot.querySelector(".site-header");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 48);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// Мобильный бургер + dropdown-кнопки в pill-nav
function initMobileNav(headerRoot) {
  if (!headerRoot) return;

  const toggle   = headerRoot.querySelector("#navToggle");
  const nav      = headerRoot.querySelector("#siteNav");
  const backdrop = document.getElementById("navBackdrop");
  if (!toggle || !nav || !backdrop) return;

  const isMobile = () => window.innerWidth <= 860;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    nav.classList.toggle("is-open", open);
    backdrop.classList.toggle("is-visible", open);
    document.body.classList.toggle("nav-open", open);
    if (!open) {
      // Закрываем все аккордеоны при закрытии меню
      headerRoot.querySelectorAll(".pill-nav__dropdown.is-open").forEach(d => {
        d.classList.remove("is-open");
        const b = d.querySelector("[aria-expanded]");
        if (b) b.setAttribute("aria-expanded", "false");
      });
    }
  };

  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  backdrop.addEventListener("click", () => setOpen(false));
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  window.addEventListener("resize", () => { if (!isMobile()) setOpen(false); });

  // Закрываем при клике на обычную ссылку (не дропдаун-триггер)
  nav.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (link && !link.classList.contains("pill-nav__link--drop") && isMobile()) {
      setOpen(false);
    }
  });

  // Аккордеон: dropdown-кнопки на мобильном
  headerRoot.querySelectorAll(".pill-nav__dropdown").forEach(dropdown => {
    const btn = dropdown.querySelector(".pill-nav__link--drop");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      if (isMobile()) {
        e.preventDefault();
        const isOpen = dropdown.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", String(isOpen));
        // Закрываем другие открытые аккордеоны
        headerRoot.querySelectorAll(".pill-nav__dropdown.is-open").forEach(d => {
          if (d !== dropdown) {
            d.classList.remove("is-open");
            const b = d.querySelector("[aria-expanded]");
            if (b) b.setAttribute("aria-expanded", "false");
          }
        });
      }
    });
  });

  // Закрыть дропдауны при клике вне (десктоп)
  document.addEventListener("click", (e) => {
    if (!isMobile() && !e.target.closest(".pill-nav__dropdown")) {
      headerRoot.querySelectorAll(".pill-nav__dropdown.is-open").forEach(d => {
        d.classList.remove("is-open");
        const b = d.querySelector("[aria-expanded]");
        if (b) b.setAttribute("aria-expanded", "false");
      });
    }
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

    const tgText = encodeURIComponent(`Заявка на видео с сайта ADERVIS:\n\n${lines}`);
    const tgUrl = `https://t.me/Adervis_digital?text=${tgText}`;
    openTgLink(tgUrl);

    const sb = form.querySelector('[type="submit"]');
    if (sb) {
      const origHTML = sb.innerHTML;
      sb.disabled = true;
      sb.innerHTML = `Заявка отправлена — ответим в течение дня&nbsp;&nbsp;<a href="${tgUrl}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;font-weight:500">открыть Telegram</a>`;
      setTimeout(() => { sb.innerHTML = origHTML; sb.disabled = false; }, 8000);
    }
  });
}

// Универсальный калькулятор для страниц дизайна, фото и ИИ
// Логика идентична видео-калькулятору, отличается только formId и заголовок Telegram
function initSimpleCalculator(formId, tgPrefix) {
  const form = document.getElementById(formId);
  if (!form) return;

  const formatSelect = form.querySelector('[data-role="format"]');
  const lengthSelect = form.querySelector('[data-role="length"]');
  const checkboxes = form.querySelectorAll('.calc-options input[type="checkbox"]');
  const resultEl = form.querySelector('[data-role="result"]');
  const fmt = new Intl.NumberFormat("ru-RU");

  const steps = Array.from(form.querySelectorAll(".calc-step"));
  const dots = Array.from(form.querySelectorAll(".calc-progress-step"));
  const backBtn = form.querySelector('[data-calc-action="back"]');
  const nextBtn = form.querySelector('[data-calc-action="next"]');
  const submitBtn = form.querySelector('[data-calc-action="submit"]');
  const lastStep = steps.length;
  let current = 1;

  const calculate = () => {
    const base = Number(formatSelect.selectedOptions[0].dataset.base);
    const mult = Number(lengthSelect.selectedOptions[0].dataset.mult);
    let addOns = 0;
    checkboxes.forEach(box => { if (box.checked) addOns += Number(box.dataset.add); });
    const center = base * mult + addOns;
    const low = Math.round((center * 0.85) / 1000) * 1000;
    const high = Math.round((center * 1.2) / 1000) * 1000;
    resultEl.textContent = `от ${fmt.format(low)} до ${fmt.format(high)} ₽`;
    return { low, high };
  };

  const showStep = (n) => {
    current = n;
    steps.forEach(s => s.classList.toggle("is-active", Number(s.dataset.step) === n));
    dots.forEach((d, i) => {
      d.classList.toggle("is-active", i + 1 === n);
      d.classList.toggle("is-done", i + 1 < n);
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
      `Услуга: ${formatSelect.selectedOptions[0].textContent.trim()}`,
      `Параметр: ${lengthSelect.selectedOptions[0].textContent.trim()}`,
      extras.length ? `Дополнительно: ${extras.join(", ")}` : null,
      `Ориентировочный бюджет: от ${fmt.format(low)} до ${fmt.format(high)} ₽`,
    ].filter(Boolean).join("\n");
    const tgText = encodeURIComponent(`${tgPrefix}:\n\n${lines}`);
    const tgUrl = `https://t.me/Adervis_digital?text=${tgText}`;
    openTgLink(tgUrl);
    const sb = form.querySelector('[type="submit"]');
    if (sb) {
      const orig = sb.innerHTML;
      sb.disabled = true;
      sb.innerHTML = `Заявка отправлена — ответим в течение дня&nbsp;&nbsp;<a href="${tgUrl}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;font-weight:500">открыть Telegram</a>`;
      setTimeout(() => { sb.innerHTML = orig; sb.disabled = false; }, 8000);
    }
  });
}

// Подсвечиваем активную ссылку в навигации по текущему пути
function markActiveNavLink(headerRoot) {
  if (!headerRoot) return;
  const links = headerRoot.querySelectorAll(".pill-nav a, .pill-nav__link");
  const path = window.location.pathname.replace(rootPath, "/").replace(/\/$/, "") || "/";
  links.forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;
    const normalHref = href.replace(rootPath, "/").replace(/\/$/, "") || "/";
    if (normalHref === path || (normalHref !== "/" && path.startsWith(normalHref))) {
      link.classList.add("nav-active");
      link.setAttribute("aria-current", "page");
    }
  });

  // Scroll-spy: только на главной, где есть якорные секции
  if (path !== "/" && path !== "") return;
  const sections = [
    { id: "hero",      href: "/" },
    { id: "services",  href: "/#services" },
    { id: "portfolio", href: "/#portfolio" },
    { id: "contacts",  href: "/#contacts" },
  ];

  const onScroll = () => {
    const scrollY = window.scrollY + window.innerHeight * 0.35;
    let active = sections[0];
    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el && el.offsetTop <= scrollY) active = s;
    });
    links.forEach(link => {
      const href = (link.getAttribute("href") || "").replace(rootPath, "/");
      const isActive = href === active.href;
      link.classList.toggle("nav-spy-active", isActive);
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
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
    const match = raw.match(/^(\d+)(\D*)$/);
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
      el.textContent = value + suffix;
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

// Кастомный курсор — кольцо следует за мышью с лёгким отставанием (lerp)
function initCustomCursor() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const dot  = document.createElement("div");
  const ring = document.createElement("div");
  dot.className  = "cursor-dot";
  ring.className = "cursor-ring";
  document.body.append(dot, ring);
  document.body.classList.add("has-custom-cursor");

  let mx = -200, my = -200, rx = -200, ry = -200;
  let rafId = null;

  const lerp = (a, b, t) => a + (b - a) * t;
  const tick = () => {
    rx = lerp(rx, mx, 0.13);
    ry = lerp(ry, my, 0.13);
    ring.style.left = `${rx}px`;
    ring.style.top  = `${ry}px`;
    rafId = requestAnimationFrame(tick);
  };

  document.addEventListener("mousemove", e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = `${mx}px`;
    dot.style.top  = `${my}px`;
    if (!rafId) rafId = requestAnimationFrame(tick);
  });

  const HOVER = "a, button, [role='button'], .btn, .service-card, .stat-card, .who-card, .app-card, label, .nav-product";
  document.addEventListener("mouseover", e => {
    if (e.target.closest(HOVER)) { dot.classList.add("is-hover"); ring.classList.add("is-hover"); }
  });
  document.addEventListener("mouseout", e => {
    if (e.target.closest(HOVER)) { dot.classList.remove("is-hover"); ring.classList.remove("is-hover"); }
  });

  document.addEventListener("mousemove", () => {
    dot.style.opacity = "1";
    ring.style.opacity = "1";
  }, { once: true });

  document.addEventListener("mouseleave", () => {
    dot.style.opacity = "0";
    ring.style.opacity = "0";
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  });
  document.addEventListener("mouseenter", () => {
    dot.style.opacity = "1";
    ring.style.opacity = "1";
    if (!rafId) rafId = requestAnimationFrame(tick);
  });
}

// Magnetic-эффект на CTA-кнопках — кнопка плавно тянется к курсору
function initMagneticButtons() {
  if (window.matchMedia("(pointer: coarse)").matches) return;

  document.querySelectorAll(".btn.primary, .btn.crm").forEach(btn => {
    const STRENGTH = 0.28;
    const RADIUS   = 68;

    btn.addEventListener("mousemove", e => {
      const r  = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width  / 2);
      const dy = e.clientY - (r.top  + r.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < RADIUS) {
        const pull = (1 - dist / RADIUS) * STRENGTH;
        btn.style.transform  = `translate(${dx * pull}px, ${dy * pull}px)`;
        btn.style.transition = "transform 0.12s ease";
      }
    });

    btn.addEventListener("mouseleave", () => {
      btn.style.transform  = "";
      btn.style.transition = "transform 0.45s cubic-bezier(0.2, 0, 0.2, 1)";
    });
  });
}

// Прогресс-бар прокрутки — тонкая золотая линия в верхней части экрана
function initScrollProgress() {
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.prepend(bar);

  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : "0%";
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

// Spotlight на карточках — пятно мягкого света следует за курсором по карточке
function initCardSpotlight() {
  if (window.matchMedia("(pointer: coarse)").matches) return;

  const cards = document.querySelectorAll(".stat-card, .service-card, .who-card, .app-card, .step-card");
  cards.forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
    card.addEventListener("mouseleave", () => {
      card.style.setProperty("--mx", "-400px");
      card.style.setProperty("--my", "-400px");
    });
  });
}

// Drag-to-scroll тикера логотипов — мышь и тач с инерцией после отпускания
function initTickerDrag(footerRoot) {
  const root = footerRoot || document;
  const ticker = root.querySelector(".clients-ticker");
  const track = root.querySelector(".clients-ticker-track");
  if (!ticker || !track) return;

  const DURATION = 80; // секунд — должно совпадать с CSS animation-duration

  let isDragging = false;
  let isHovered = false;
  let startX = 0, startPos = 0, currentPos = 0;
  let velocity = 0, lastX = 0, lastTime = 0;
  let rafId = null;

  const getComputedPos = () =>
    new DOMMatrix(getComputedStyle(track).transform).m41;

  const halfW = () => track.scrollWidth / 2;

  const wrap = (x) => {
    const h = halfW();
    let p = x % h;
    if (p > 0) p -= h;
    return p;
  };

  const freeze = () => {
    const p = getComputedPos();
    track.style.animation = "none";
    track.style.transform = `translateX(${p}px)`;
    currentPos = p;
    return p;
  };

  const resume = () => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    const p = wrap(currentPos);
    const delay = -(Math.abs(p) / halfW()) * DURATION;
    track.style.transform = "";
    track.style.animation = `ticker-scroll ${DURATION}s linear ${delay}s infinite`;
    if (isHovered) track.style.animationPlayState = "paused";
  };

  const glide = () => {
    velocity *= 0.93;
    if (Math.abs(velocity) < 0.08) { resume(); return; }
    currentPos = wrap(currentPos + velocity);
    track.style.transform = `translateX(${currentPos}px)`;
    rafId = requestAnimationFrame(glide);
  };

  // --- mouse ---
  ticker.addEventListener("mousedown", (e) => {
    e.preventDefault();
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    freeze();
    isDragging = true;
    startX = lastX = e.clientX;
    startPos = currentPos;
    lastTime = performance.now();
    velocity = 0;
    ticker.classList.add("is-dragging");
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const now = performance.now();
    const dt = now - lastTime || 16;
    velocity = ((e.clientX - lastX) / dt) * 16;
    lastX = e.clientX;
    lastTime = now;
    currentPos = wrap(startPos + e.clientX - startX);
    track.style.transform = `translateX(${currentPos}px)`;
  });

  window.addEventListener("mouseup", () => {
    if (!isDragging) return;
    isDragging = false;
    ticker.classList.remove("is-dragging");
    if (!isHovered) { rafId = requestAnimationFrame(glide); }
  });

  ticker.addEventListener("mouseenter", () => {
    isHovered = true;
    if (!isDragging && track.style.animation !== "none") {
      track.style.animationPlayState = "paused";
    }
  });

  ticker.addEventListener("mouseleave", () => {
    isHovered = false;
    if (!isDragging) {
      if (track.style.animation === "none") {
        rafId = requestAnimationFrame(glide);
      } else {
        track.style.animationPlayState = "running";
      }
    }
  });

  // --- touch ---
  ticker.addEventListener("touchstart", (e) => {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    freeze();
    isDragging = true;
    startX = lastX = e.touches[0].clientX;
    startPos = currentPos;
    lastTime = performance.now();
    velocity = 0;
  }, { passive: true });

  ticker.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const now = performance.now();
    const dt = now - lastTime || 16;
    velocity = ((e.touches[0].clientX - lastX) / dt) * 16;
    lastX = e.touches[0].clientX;
    lastTime = now;
    currentPos = wrap(startPos + e.touches[0].clientX - startX);
    track.style.transform = `translateX(${currentPos}px)`;
  }, { passive: false });

  ticker.addEventListener("touchend", () => {
    if (!isDragging) return;
    isDragging = false;
    rafId = requestAnimationFrame(glide);
  });
}

// Заявка на КП (главная, #contacts) — единственная форма захвата на сайте:
// «гейтит» расчёт за минимальным действием (имя + контакт) и оформляет
// заявку письмом, без бэкенда — та же схема, что у калькулятора /video
function showFieldError(input, msg) {
  input.classList.add('is-error');
  let err = input.parentElement.querySelector('.field-error');
  if (!err) {
    err = document.createElement('span');
    err.className = 'field-error';
    input.parentElement.appendChild(err);
  }
  err.textContent = msg;
}

function clearFieldError(input) {
  input.classList.remove('is-error');
  const err = input.parentElement.querySelector('.field-error');
  if (err) err.textContent = '';
}

function initLeadForm() {
  const form = document.getElementById("leadForm");
  if (!form) return;

  // Сброс ошибок при вводе
  form.querySelectorAll('.lead-input').forEach(inp => {
    inp.addEventListener('input', () => clearFieldError(inp));
  });

  const consent = form.querySelector('#leadConsent');
  if (consent) {
    consent.addEventListener('change', () => {
      consent.closest('.modal-consent-label').style.outline = '';
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const honeypot = form.querySelector('[name="website"]');
    if (honeypot && honeypot.value) return;

    const consentEl = form.querySelector('#leadConsent');
    if (consentEl && !consentEl.checked) {
      consentEl.closest('.modal-consent-label').style.outline = '2px solid var(--c-video)';
      consentEl.closest('.modal-consent-label').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    const nameInput    = form.querySelector('[name="name"]');
    const contactInput = form.querySelector('[name="contact"]');
    const name      = nameInput.value.trim();
    const contact   = contactInput.value.trim();
    let hasError = false;
    if (!name) { showFieldError(nameInput, 'Пожалуйста, укажите имя'); hasError = true; }
    if (!contact) { showFieldError(contactInput, 'Укажите телефон, email или Telegram'); hasError = true; }
    if (hasError) return;

    const message   = form.querySelector('[name="message"]')?.value.trim() || '';
    const direction = form.querySelector('[name="direction"]')?.value.trim() || '';

    const dirLabels = { video: 'Видео', design: 'Дизайн', photo: 'Фото', ai: 'ИИ-контент' };
    const dirName   = dirLabels[direction] || '';

    const lines = [
      `Имя: ${name}`,
      `Контакт: ${contact}`,
      dirName  ? `Направление: ${dirName}` : null,
      message  ? `Задача: ${message}` : 'Задача: уточнит при созвоне',
    ].filter(Boolean).join("\n");

    const subjectDir = dirName ? ` — ${dirName}` : '';
    const tgText = encodeURIComponent(`Заявка с сайта ADERVIS${subjectDir}:\n\n${lines}`);
    const tgUrl = `https://t.me/Adervis_digital?text=${tgText}`;
    openTgLink(tgUrl);

    const submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) {
      const origHTML = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `Заявка принята — ответим в течение дня&nbsp;&nbsp;<a href="${tgUrl}" target="_blank" rel="noopener noreferrer" style="color:inherit;text-decoration:underline;font-weight:500">открыть Telegram</a>`;
      showToast('✓ Заявка отправлена — ответим за 2 часа в рабочее время');
      setTimeout(() => { submitBtn.innerHTML = origHTML; submitBtn.disabled = false; form.reset(); }, 8000);
    }
  });
}

// Заглушки для VK-видео: загружают iframe только при клике на Play
function initVideoPoster() {
  document.querySelectorAll(".video-poster[data-vk]").forEach(poster => {
    const btn = poster.querySelector(".video-poster__play");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const src = poster.getAttribute("data-vk");
      poster.innerHTML = `<iframe src="${src}" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; screen-wake-lock;" frameborder="0" allowfullscreen title="Видео"></iframe>`;
    });
    poster.addEventListener("click", (e) => {
      if (e.target === poster) btn.click();
    });
  });
}

// VK Video — скрываем «Смотрите также»: при событии ended — перематываем в начало.
// Запрашиваем iframes динамически (не на старте), чтобы работало и в лайтбоксе.
function initVkVideoApi() {
  window.addEventListener("message", (e) => {
    if (!e.data) return;
    let data;
    try { data = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
    if (data.name !== "ended") return;
    document.querySelectorAll('iframe[src*="vkvideo.ru"]').forEach((iframe) => {
      if (iframe.contentWindow === e.source) {
        iframe.contentWindow.postMessage(JSON.stringify({ method: "seek", value: 0 }), "https://vkvideo.ru");
      }
    });
  });
}

// Слайдер секции «Что говорят клиенты» — стрелки и точки-навигация
function initReviewsSlider() {
  const slider = document.querySelector(".reviews-slider");
  if (!slider) return;

  const outer = slider.querySelector(".reviews-track-outer");
  const track = slider.querySelector(".reviews-track");
  const prevBtn = slider.querySelector(".reviews-prev");
  const nextBtn = slider.querySelector(".reviews-next");
  const dotsContainer = slider.querySelector(".reviews-dots");
  const counterEl = slider.querySelector(".reviews-counter");
  const cards = Array.from(track.querySelectorAll(".review-card"));
  const total = cards.length;
  const GAP = 24;
  let current = 0;
  let autoTimer = null;
  let isHovered = false;

  const getVisible = () => {
    if (window.innerWidth >= 960) return Math.min(3, total);
    if (window.innerWidth >= 600) return Math.min(2, total);
    return 1;
  };

  const getMax = () => Math.max(0, total - getVisible());

  const update = (animate = true) => {
    const visible = getVisible();
    const max = getMax();
    if (current > max) current = 0;
    if (current < 0) current = max;

    const cardW = (outer.offsetWidth - GAP * (visible - 1)) / visible;
    cards.forEach(card => { card.style.flexBasis = cardW + "px"; card.style.minWidth = cardW + "px"; });

    if (!animate) {
      track.style.transition = "none";
      void track.offsetHeight;
    }
    track.style.transform = `translateX(-${current * (cardW + GAP)}px)`;
    if (!animate) {
      void track.offsetHeight;
      track.style.transition = "";
    }

    if (prevBtn) prevBtn.disabled = false;
    if (nextBtn) nextBtn.disabled = false;

    dotsContainer && dotsContainer.querySelectorAll(".reviews-dot").forEach((dot, i) => {
      dot.classList.toggle("is-active", i === current);
    });

    if (counterEl) counterEl.textContent = `${current + 1} / ${total}`;
  };

  const next = () => { current = current >= getMax() ? 0 : current + 1; update(); };
  const prev = () => { current = current <= 0 ? getMax() : current - 1; update(); };

  const startAuto = () => {
    stopAuto();
    autoTimer = setInterval(() => { if (!isHovered) next(); }, 5000);
  };
  const stopAuto = () => { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } };

  if (dotsContainer) {
    cards.forEach((_, i) => {
      const btn = document.createElement("button");
      btn.className = "reviews-dot";
      btn.setAttribute("aria-label", `Отзыв ${i + 1}`);
      btn.addEventListener("click", () => { current = i; update(); startAuto(); });
      dotsContainer.appendChild(btn);
    });
  }

  prevBtn && prevBtn.addEventListener("click", () => { prev(); startAuto(); });
  nextBtn && nextBtn.addEventListener("click", () => { next(); startAuto(); });

  slider.addEventListener("mouseenter", () => { isHovered = true; });
  slider.addEventListener("mouseleave", () => { isHovered = false; });

  // Touch-свайп для мобильных
  let touchStartX = 0;
  outer.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  outer.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); startAuto(); }
  });

  // Keyboard navigation: ←/→ при фокусе внутри слайдера
  slider.setAttribute('tabindex', '0');
  slider.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft')  { prev(); startAuto(); e.preventDefault(); }
    if (e.key === 'ArrowRight') { next(); startAuto(); e.preventDefault(); }
  });

  window.addEventListener("resize", () => update(false));
  update(false);
  startAuto();
}

// Превью видео в галерее /video — конвертируем background-image в <img> тег
function initVideoThumbnails() {
  document.querySelectorAll(".vg-thumb.has-thumb").forEach(thumb => {
    const bg = thumb.style.backgroundImage;
    const match = bg && bg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    if (!match) return;
    const src = match[1];
    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.loading = "lazy";
    img.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;display:block;";
    thumb.style.backgroundImage = "";
    thumb.insertBefore(img, thumb.firstChild);
  });
}

// Превью для видео-отзывов: применяет data-thumb если задан вручную на .video-poster
// (VK oEmbed блокирует CORS — загрузка через API невозможна в браузере)
function initVideoReviewThumbnails() {
  document.querySelectorAll(".video-poster[data-vk]").forEach(poster => {
    const thumbSrc = poster.dataset.thumb;
    if (!thumbSrc) return;
    const thumb = poster.querySelector(".video-poster__thumb");
    if (!thumb) return;
    thumb.style.backgroundImage    = `url("${thumbSrc}")`;
    thumb.style.backgroundSize     = "cover";
    thumb.style.backgroundPosition = "center";
    thumb.classList.remove("video-poster__thumb--empty");
  });
}

// Плеер видео-отзывов на главной (секция #vrPlayer) — выбор отзыва из списка,
// кроссфейд фона, воспроизведение VK-iframe по клику на Play
function initVideoReviewsPlayer() {
  var VIDEOS = [
    { url: 'https://vk.com/video_ext.php?oid=-121259819&id=456239134&autoplay=1', thumb: 'assets/cases/review-lesnikova.jpg', name: 'Алина Лесникова',  company: 'MOLODOST · Клиника молодости' },
    { url: 'https://vk.com/video_ext.php?oid=-121259819&id=456239128&autoplay=1', thumb: 'assets/cases/review-pasport.jpg',  name: 'Паспорт Зубов',    company: 'Стоматология' },
    { url: 'https://vk.com/video_ext.php?oid=-121259819&id=456239107&autoplay=1', thumb: 'assets/cases/review-abs.jpg',      name: 'Екатерина',         company: 'АБС Авто · Пермь' },
    { url: 'https://vk.com/video_ext.php?oid=-121259819&id=456239074&autoplay=1', thumb: 'assets/cases/review-lishke.jpg',   name: 'Екатерина Лишке',  company: 'Феликс' },
    { url: 'https://vk.com/video_ext.php?oid=-121259819&id=456239055&autoplay=1', thumb: 'assets/cases/review-mohov.jpg',    name: 'Дмитрий Мохов',    company: 'MOBILOV' },
    { url: 'https://vk.com/video_ext.php?oid=-121259819&id=456239032&autoplay=1', thumb: 'assets/cases/review-bakilov.jpg',  name: 'Евгений Бакилов',  company: 'Express-Import' },
    { url: 'https://vk.com/video_ext.php?oid=-121259819&id=456239033&autoplay=1', thumb: 'assets/cases/review-suetin.jpg',   name: 'Никита Суетин',    company: 'Видео-отзыв' },
  ];

  var current = 0;
  var bg      = document.getElementById('vrBg');
  if (!bg) return;

  var poster  = document.getElementById('vrPoster');
  var frame   = document.getElementById('vrFrame');
  var nameEl  = document.getElementById('vrName');
  var compEl  = document.getElementById('vrCompany');
  var idxEl   = document.getElementById('vrIdx');
  var listEl  = document.getElementById('vrList');
  var playBtn = document.getElementById('vrPlayBtn');
  var prevBtn = document.getElementById('vrPrev');
  var nextBtn = document.getElementById('vrNext');

  VIDEOS.forEach(function (v, i) {
    var el = document.createElement('div');
    el.className = 'vrp__item';
    el.innerHTML =
      '<div class="vrp__item-thumb" style="background-image:url(\'' + v.thumb + '\')"></div>' +
      '<div class="vrp__item-info">' +
        '<span class="vrp__item-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<span class="vrp__item-name">' + v.name + '</span>' +
        '<span class="vrp__item-company">' + v.company + '</span>' +
      '</div>';
    el.addEventListener('click', function () { go(i); });
    listEl.appendChild(el);
  });

  function stopVideo() {
    frame.src = '';
    frame.style.display = 'none';
    poster.style.display = '';
  }

  function go(index) {
    current = (index + VIDEOS.length) % VIDEOS.length;
    var v = VIDEOS[current];

    bg.style.opacity = '0';
    setTimeout(function () {
      bg.style.backgroundImage = 'url(\'' + v.thumb + '\')';
      bg.style.opacity = '1';
    }, 220);

    if (nameEl) nameEl.textContent = v.name;
    if (compEl) compEl.textContent = v.company;
    if (idxEl)  idxEl.textContent  = String(current + 1).padStart(2, '0') + ' — ' + String(VIDEOS.length).padStart(2, '0');

    listEl.querySelectorAll('.vrp__item').forEach(function (el, i) {
      el.classList.toggle('is-active', i === current);
    });
    var active = listEl.querySelectorAll('.vrp__item')[current];
    if (active) active.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    stopVideo();
  }

  function play() {
    frame.src = VIDEOS[current].url;
    frame.style.display = 'block';
    poster.style.display = 'none';
  }

  var nextInlineBtn = document.getElementById('vrNextInline');

  playBtn.addEventListener('click', play);
  if (prevBtn) prevBtn.addEventListener('click', function () { go(current - 1); });
  if (nextBtn) nextBtn.addEventListener('click', function () { go(current + 1); });
  if (nextInlineBtn) nextInlineBtn.addEventListener('click', function () { go(current + 1); });

  var main = document.getElementById('vrMain');
  if (main) {
    var tx = 0;
    main.addEventListener('touchstart', function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
    main.addEventListener('touchend',   function (e) {
      var dx = e.changedTouches[0].clientX - tx;
      if (Math.abs(dx) > 50) { dx < 0 ? go(current + 1) : go(current - 1); }
    });
  }

  go(0);
}

// Vimeo-модал для фото команды в секции «Что такое ADERVIS»
function initVimeoModal() {
  var modal    = document.getElementById('vimeoModal');
  var frame    = document.getElementById('vimeoFrame');
  var btn      = document.getElementById('vimeoClose');
  var imgFrame = document.querySelector('.concept-img-frame');
  var VIMEO_URL = 'https://player.vimeo.com/video/498780681?autoplay=1&color=f6bd3a&title=0&byline=0&portrait=0';

  if (!imgFrame || !modal) return;

  imgFrame.addEventListener('click', openVimeo);
  imgFrame.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openVimeo(); }
  });

  function openVimeo() {
    frame.src = VIMEO_URL;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.style.display = 'none';
    frame.src = '';
    document.body.style.overflow = '';
  }

  btn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.style.display === 'flex') closeModal();
  });
}

// Видео-галерея: табы-фильтр по категориям + лайтбокс с VK-плеером
function initVideoGallery() {
  const tabs  = document.querySelectorAll(".vg-tab");
  const cards = document.querySelectorAll(".vg-card");
  const lb    = document.getElementById("videoLightbox");
  if (!tabs.length && !lb) return;

  // — Табы —
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const cat = tab.dataset.cat;
      tabs.forEach((t) => { t.classList.remove("is-active"); t.setAttribute("aria-selected", "false"); });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      cards.forEach((card) => {
        if (cat === "all" || card.dataset.cat === cat) {
          delete card.dataset.hidden;
        } else {
          card.dataset.hidden = "";
        }
      });
    });
  });

  // — Лайтбокс —
  if (!lb) return;
  const iframe  = lb.querySelector("#vlIframe");
  const closeBtn = lb.querySelector("#vlClose");

  const openLb = (src) => {
    iframe.src = src;
    lb.classList.add("is-open");
    document.body.style.overflow = "hidden";
    closeBtn.focus();
  };

  const closeLb = () => {
    lb.classList.remove("is-open");
    iframe.src = "";
    document.body.style.overflow = "";
  };

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const src = card.dataset.src;
      if (src) openLb(src);
    });
  });

  // Featured showreel block
  const featured = document.querySelector(".vp-featured");
  if (featured) {
    featured.addEventListener("click", () => {
      const src = featured.dataset.src;
      if (src) openLb(src);
    });
    featured.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openLb(featured.dataset.src); }
    });
  }

  closeBtn.addEventListener("click", closeLb);
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && lb.classList.contains("is-open")) closeLb(); });
}