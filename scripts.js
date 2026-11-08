//Custom Cursor
const cursor = document.querySelector('.cursor__ball');

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function restoreCursorPosition() {
  const storedPosition = JSON.parse(localStorage.getItem('cursorPosition'));
  if (storedPosition) {
    const { x, y } = storedPosition;
    gsap.set(cursor, { x: x - 20, y: y - 20 }); 
  }
  cursor.style.display = 'block';
}

function saveCursorPosition(x, y) {
  localStorage.setItem('cursorPosition', JSON.stringify({ x, y }));
  //console.log(`Cursor position saved: x=${x}, y=${y}`);
}

document.body.addEventListener('mousemove', (e) => {
  const x = clamp(e.clientX, 0, window.innerWidth);
  const y = clamp(e.clientY, 0, window.innerHeight);

  gsap.to(cursor, { x: x - 20, y: y - 20, duration: 0.3 });
  saveCursorPosition(x, y);
});

document.body.addEventListener('mouseleave', () => {
  gsap.to(cursor, { opacity: 0, duration: 0.15 });
});

document.body.addEventListener('mouseenter', (e) => {
  const x = clamp(e.clientX, 0, window.innerWidth);
  const y = clamp(e.clientY, 0, window.innerHeight);

  gsap.to(cursor, { opacity: 1, x: x - 20, y: y - 20, duration: 0.15 });
});

document.querySelectorAll("a").forEach((el) => {
  el.addEventListener("mouseenter", () => {
      gsap.to(cursor, { scale: 0.6, duration: 0.2 });
  });
  el.addEventListener("mouseleave", () => {
      gsap.to(cursor, { scale: 1, duration: 0.2 });
  });
});

cursor.style.display = 'none';

document.addEventListener('DOMContentLoaded', restoreCursorPosition);

// Index Page Typewriter Effect
document.addEventListener('DOMContentLoaded', () => {
  const title = document.querySelector('.typewriter');
  if (!title) return;
  const roles = [
    { text: 'production designer', link: 'pd/' },
    { text: 'graphic designer', link: 'gd/' },
    { text: 'UX/UI designer', link: 'ux/' }
  ];
  const stateKey = 'typewriterTitlesState';
  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  try {
    const saved = JSON.parse(localStorage.getItem(stateKey));
    if (saved && performance.getEntriesByType('navigation')[0]?.type !== 'reload') {
      roleIndex = Number.isInteger(saved.roleIndex) ? ((saved.roleIndex % roles.length) + roles.length) % roles.length : 0;
      charIndex = Math.max(0, Math.min(Number(saved.charIndex) || 0, roles[roleIndex].text.length));
      isDeleting = Boolean(saved.isDeleting);
    }
  } catch { /* Start fresh if saved animation state is unavailable. */ }

  function type() {
    const role = roles[roleIndex];
    title.href = role.link;
    title.setAttribute('aria-label', role.text);
    charIndex += isDeleting ? -1 : 1;
    charIndex = Math.max(0, Math.min(charIndex, role.text.length));
    title.textContent = role.text.slice(0, charIndex);
    let delay = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === role.text.length) {
      isDeleting = true;
      delay = 1500;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      delay = 150;
    }
    try {
      localStorage.setItem(stateKey, JSON.stringify({ roleIndex, charIndex, isDeleting }));
    } catch { /* The animation also works when storage is disabled. */ }
    setTimeout(type, delay);
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  type();
});

//mobile menu
document.addEventListener('DOMContentLoaded', () => {
    const menuIcon = document.querySelector('.menu-icon');
    const overlayMenu = document.querySelector('.overlay-menu');
    const closeButton = document.querySelector('.close-button');

    menuIcon.addEventListener('click', () => {
        overlayMenu.classList.add('open');
    });

    closeButton.addEventListener('click', () => {
        overlayMenu.classList.remove('open');
    });
});

