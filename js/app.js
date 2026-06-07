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
});