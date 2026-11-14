(() => {
  const ready = callback => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', callback, {once:true}) : callback();
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

// Delegate hover feedback so dynamically created lightbox controls and
// gallery triggers use the same interaction as links throughout the site.
const clickable = 'a[href],button,[role="button"],summary,input[type="submit"],input[type="button"],input[type="reset"],.menu-icon,.close-button';
let cursorSmall = false;
function updateCursorTarget(target) {
  const control = target instanceof Element ? target.closest(clickable) : null;
  const small = !!control && !control.matches(':disabled,[aria-disabled="true"]') && !control.closest('[inert]');
  if (small === cursorSmall) return;
  cursorSmall = small;
  gsap.to(cursor, {scale:small ? .6 : 1,duration:.2,overwrite:'auto'});
}
document.body.addEventListener('pointerover', event => updateCursorTarget(event.target));
document.body.addEventListener('pointerout', event => updateCursorTarget(event.relatedTarget));
document.body.addEventListener('mousemove', event => updateCursorTarget(event.target));

cursor.style.display = 'none';

ready( restoreCursorPosition);

// Index Page Typewriter Effect
ready( () => {
  const title = document.querySelector('.typewriter');
  if (!title) return;
  const roles = [
    { text: 'production designer', link: 'pd/' },
    { text: 'graphic designer', link: 'gd/' },
    { text: 'Web & Interactive Designer', link: 'ux/' }
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

// The carousel homepage manages its own accessible mobile menu.
//mobile menu
ready( () => {
    if (document.body.classList.contains('carousel-home')) return;
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


})();
