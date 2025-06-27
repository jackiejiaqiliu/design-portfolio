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
document.addEventListener("DOMContentLoaded", () => {
  const roles = [
      { text: "production designer for indie films", link: "pd.html", target: "_self" },
      { text: "graphic designer for arts and cultures", link: "gd.html", target: "_self" },
      { text: "UX/UI designer for startups and research labs", link: "ux.html", target: "_self" },
      { text: "photographer for events and people", link: "https://drive.google.com/file/d/1-hBxq0ABxUDRAuJxHOcifXYpuPHL2gQs/view?usp=sharing", target: "_blank" },
      { text: "artist for well... her own pleasure", link: "https://www.jiaqiliu.com/", target: "_blank" }
  ];
  const typewriterElement = document.querySelector(".typewriter");
  const arrowContainer = document.getElementById("arrow-container");
  const dynamicArrow = document.getElementById("dynamic-arrow");

  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let isReturning = false;

  const navigationType = performance.getEntriesByType("navigation")[0].type;
  if (navigationType === "reload") {
      localStorage.removeItem("typewriterState");
  } else {
      const savedState = JSON.parse(localStorage.getItem("typewriterState"));
      if (savedState) {
          roleIndex = savedState.roleIndex || 0;
          charIndex = savedState.charIndex || 0;
          isDeleting = savedState.isDeleting || false;

          if (charIndex === roles[roleIndex].text.length && !isDeleting) {
              isReturning = true;
              dynamicArrow.href = roles[roleIndex].link;
              dynamicArrow.target = roles[roleIndex].target;
              arrowContainer.style.display = "flex";
              arrowContainer.style.opacity = "1";
          }
      }
  }

  function saveState() {
      const state = {
          roleIndex,
          charIndex,
          isDeleting
      };
      localStorage.setItem("typewriterState", JSON.stringify(state));
  }

  function type() {
      const currentRole = roles[roleIndex];

      if (!isDeleting) {
          typewriterElement.textContent = currentRole.text.substring(0, charIndex + 1);
          charIndex++;
          if (charIndex === currentRole.text.length) {
              isDeleting = true;

              if (!isReturning) {
                  dynamicArrow.href = currentRole.link;
                  dynamicArrow.target = currentRole.target;
                  arrowContainer.style.display = "flex";
                  setTimeout(() => (arrowContainer.style.opacity = "1"), 50);
              }
              isReturning = false;

              setTimeout(() => {
                  arrowContainer.style.opacity = "0";
                  setTimeout(() => (arrowContainer.style.display = "none"), 1500);
                  type();
              }, 5000);
              return;
          }
      } else {
          typewriterElement.textContent = currentRole.text.substring(0, charIndex - 1);
          charIndex--;
          if (charIndex === 0) {
              isDeleting = false;
              roleIndex = (roleIndex + 1) % roles.length;
          }
      }
      saveState();
      setTimeout(type, isDeleting ? 50 : 100);
  }
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

