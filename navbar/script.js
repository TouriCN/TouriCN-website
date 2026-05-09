fetch("/navbar/navbar.json")
  .then(res => res.json())
  .then(renderNavbar)
  .catch(console.error);

function renderNavbar(data) {
  document.getElementById("logo-img").src = data.logo.src;
  document.getElementById("logo-text").innerText = data.logo.text;

  const menu = document.getElementById("menu");
  menu.innerHTML = "";
  data.menu.forEach(item => {
    menu.appendChild(createMenuItem(item));
  });

  initBehavior();
}

function createMenuItem(item) {
  // 如果是链接（无论是否有子菜单）
  if (item.link) {
    const el = document.createElement("a");
    el.className = "menu-item";
    el.href = item.link;
    el.textContent = item.label;

    // 处理子菜单（如果有）
    if (item.children) {
      const arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.innerHTML = "▾";
      el.appendChild(arrow);

      const dropdown = document.createElement("div");
      dropdown.className = "dropdown";
      item.children.forEach(child => {
        dropdown.appendChild(createMenuItem(child));
      });
      el.appendChild(dropdown);
    }

    return el;
  } else {
    // 无link的纯容器项
    const el = document.createElement("div");
    el.className = "menu-item";
    el.innerHTML = item.label;

    if (item.children) {
      const arrow = document.createElement("span");
      arrow.className = "arrow";
      arrow.innerHTML = "▾";
      el.appendChild(arrow);

      const dropdown = document.createElement("div");
      dropdown.className = "dropdown";
      item.children.forEach(child => {
        dropdown.appendChild(createMenuItem(child));
      });
      el.appendChild(dropdown);
    }

    return el;
  }
}

function initBehavior() {
  const hamburger = document.getElementById("hamburger");
  const menu = document.getElementById("menu");

  // 汉堡菜单
  hamburger.addEventListener("click", e => {
    e.stopPropagation();
    menu.classList.toggle("open");
  });

  // 移动端逻辑
  if (window.innerWidth <= 768) {
    setupMobileMenu();
  }

  // 窗口大小改变时重新初始化
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 768) {
      setupMobileMenu();
    } else {
      cleanupMobileMenu();
    }
  });

  // 点击页面其他地方关闭菜单
  document.addEventListener("click", e => {
    if (window.innerWidth <= 768 && !menu.contains(e.target)) {
      menu.classList.remove("open");
      closeAllDropdowns();
    }
  });
}

let mobileListenersAttached = false;

function setupMobileMenu() {
  if (mobileListenersAttached) return;
  mobileListenersAttached = true;

  document.querySelectorAll(".menu-item").forEach(item => {
    item.addEventListener("click", handleMobileClick);
  });
}

function handleMobileClick(e) {
  // 普通链接直接跳转
  if (this.tagName === "A") return;

  e.stopPropagation();

  const dropdown = this.querySelector(":scope > .dropdown");
  if (!dropdown) return;

  // 关闭同级的其他菜单
  const siblings = Array.from(this.parentElement.children);
  siblings.forEach(sibling => {
    if (sibling !== this) {
      sibling.classList.remove("active");
      const siblingDropdown = sibling.querySelector(":scope > .dropdown");
      if (siblingDropdown) {
        siblingDropdown.style.display = "none";
      }
    }
  });

  // 切换当前菜单
  this.classList.toggle("active");
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
}

function cleanupMobileMenu() {
  document.querySelectorAll(".menu-item").forEach(item => {
    item.removeEventListener("click", handleMobileClick);
  });
  mobileListenersAttached = false;
  closeAllDropdowns();
  document.getElementById("menu").classList.remove("open");
}

function closeAllDropdowns() {
  document.querySelectorAll(".menu-item").forEach(item => {
    item.classList.remove("active");
    item.querySelectorAll(".dropdown").forEach(d => {
      d.style.display = "none";
    });
  });
}
