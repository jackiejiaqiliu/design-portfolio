/* Native-scroll 3D cover rings inspired by Codrops/3DCarousel (MIT).
   License: ../licenses/codrops-3d-carousel.txt. */
(() => {
  'use strict';
  const scenes = [...document.querySelectorAll('.carousel-scene')];
  if (!scenes.length) return;
  const sectionNav = document.querySelector('.home-section-nav');
  const sectionDots = [...document.querySelectorAll('.section-dot')];
  let activeSection = -1;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const states = scenes.map(element => ({
    element,
    ring: element.querySelector('.carousel-ring'),
    title: element.querySelector('.carousel-title'),
    cells: [...element.querySelectorAll('.carousel-cell')],
    top: 0, height: 0, radius: 0, entry: 0,
    spin: 0, targetSpin: 0, momentum: 0, spread: 0
  }));
  let disposed = false;
  document.addEventListener('portfolio:leave-home', () => { disposed = true; cancelAnimationFrame(frame); window.visualViewport?.removeEventListener('resize',measure); }, {once:true});
  let frame = 0, lastTime = 0, previousScroll = scrollY;
  let drag = null, ignoreClickUntil = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, amount) => a + (b - a) * amount;

  function measure() {
    if (disposed) return;
    const phone = innerWidth < 768;
    const tablet = innerWidth >= 768 && innerWidth <= 1199;
    for (const state of states) {
      state.top = state.element.offsetTop;
      state.tablet = tablet;
      state.phone = phone;
      state.ellipse = innerWidth < 1200;
      state.radius = tablet ? clamp(innerWidth * .55, 420, 600)
        : phone ? clamp(innerWidth * .6,185,430) : clamp(innerWidth * .43, 460, 720);
      const coverHeight = Math.max(...state.cells.map(cell => cell.offsetHeight));
      state.element.style.setProperty('--carousel-cover-height', `${coverHeight}px`);
      state.ring.style.top = phone ? `calc(50% - ${clamp(coverHeight * .18,18,32)}px)` : '';
      state.height = state.element.offsetHeight;
      state.entry = Math.max(0, state.top + state.height / 2 - innerHeight - coverHeight / 2);
      const step = 360 / state.cells.length;
      state.cells.forEach((cell, index) => {
        const angle = (index - .5) * step + 90;
        cell.dataset.angle = angle;
        cell.style.transform = `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${state.radius}px)`;
      });
    }
    wake();
  }

  function render(time) {
    frame = 0;
    if (disposed || document.hidden || document.documentElement.classList.contains('page-leaving')) return;
    const dt = clamp((time - lastTime) / 16.667 || 1, .2, 2);
    lastTime = time;
    const position = scrollY;
    const active = nearestScene(position);
    if (active !== activeSection) {
      activeSection = active;
      sectionDots.forEach((dot,index) => {
        if (index === active) dot.setAttribute('aria-current','location');
        else dot.removeAttribute('aria-current');
      });
    }
    const speed = (position - previousScroll) / dt;
    previousScroll = position;
    let moving = false;
    for (const state of states) {
      const offset = state.top - position;
      if (offset > innerHeight + 100 || offset + state.height < -100) continue;
      const progress = clamp((position - state.top + innerHeight) / (innerHeight + state.height), 0, 1);
      // Start with covers 1 and 2 as the ring enters, then rotate on every scroll pixel.
      const turn = reducedMotion ? -90 : -90 - (position - state.entry) / innerHeight * 90;
      const tilt = reducedMotion ? 0 : (1 - progress * 2) * 4;
      if (drag?.state !== state) {
        if (!reducedMotion && Math.abs(state.momentum) > .002) {
          state.targetSpin += state.momentum * dt;
          state.momentum *= Math.pow(.88, dt);
        } else state.momentum = 0;
      }
      state.spin = reducedMotion ? state.targetSpin : lerp(state.spin, state.targetSpin, 1 - Math.pow(.82, dt));
      const nextSpread = reducedMotion ? 0 : Math.min(55, Math.abs(speed) * 1.1 + Math.abs(state.momentum) * 8);
      state.spread = lerp(state.spread, nextSpread, 1 - Math.pow(.86, dt));
      const rootTurn = turn + state.spin;
      const orbitDepth = state.phone ? clamp(state.radius * .8,150,320) : clamp(state.radius * .8,320,480);
      const orbitHeight = state.phone ? clamp(innerWidth * .28,100,150) : clamp(innerWidth * .2,150,200);
      const orbitTilt = Math.atan2(orbitHeight,orbitDepth) * 180 / Math.PI;
      state.ring.style.transform = state.ellipse
        ? `translateZ(${-orbitDepth-55}px) rotateX(0deg) rotateY(0deg) rotateZ(-5deg)`
        : `translateZ(${-state.radius - 55}px) rotateX(${tilt * .6}deg) rotateY(${rootTurn.toFixed(3)}deg) rotateZ(${tilt.toFixed(3)}deg)`;
      state.ring.dataset.rotation = rootTurn.toFixed(3);
      for (const cell of state.cells) {
        const angle = Number(cell.dataset.angle);
        const card = cell.firstElementChild;
        card.style.transform = `rotateZ(${tilt * 1.8}deg) rotateY(${clamp(-speed * .2 - state.momentum * 1.5, -10, 10)}deg)`;
        const radians = (angle + rootTurn) * Math.PI / 180;
        if (state.ellipse) {
          const horizontal = Math.sin(radians);
          const depth = Math.cos(radians);
          // Orient each cover along the tilted orbit, as on the desktop ring.
          // Real depth and edge-on side cards create the gaps rather than a flat fan.
          cell.style.transform = `translate(-50%, -50%) translate3d(${horizontal * (state.radius+state.spread)}px,${depth * orbitHeight}px,${depth * orbitDepth}px) rotateX(${-orbitTilt}deg) rotateY(${angle+rootTurn}deg)`;
          cell.style.opacity = '1';
        } else {
          cell.style.transform = `translate(-50%, -50%) rotateY(${angle}deg) translateZ(${(state.radius + state.spread).toFixed(2)}px)`;
          cell.style.opacity = '';
        }
      }
      const titleShift = reducedMotion || state.phone ? 0 : (progress - .5) * 60;
      state.title.style.transform = `translateY(${titleShift.toFixed(2)}px)`;
      moving ||= Math.abs(state.spin - state.targetSpin) > .01 || Math.abs(state.momentum) > .002 || Math.abs(state.spread - nextSpread) > .02;
    }
    if (moving || drag) frame = requestAnimationFrame(render);
  }

  function wake() {
    if (!disposed && !frame && !document.hidden) { lastTime = performance.now(); frame = requestAnimationFrame(render); }
  }

  function nearestScene(position) {
    return states.reduce((nearest,state,i) => Math.abs(state.top-position) < Math.abs(states[nearest].top-position) ? i : nearest,0);
  }

  sectionDots.forEach((dot,index) => dot.addEventListener('click',event => {
    event.preventDefault();
    if (disposed || document.documentElement.classList.contains('page-leaving')) return;
    const target = states[index].top;
    history.replaceState({...history.state,scroll:target},'',dot.getAttribute('href'));
    scrollTo({top:target,behavior:reducedMotion ? 'instant' : 'smooth'});
  }));


  for (const state of states) {
    const element = state.element;
    element.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('a,button') || !event.isPrimary) return;
      state.momentum = 0;
      drag = { state, id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastTime: performance.now(), moved: false };
      element.setPointerCapture(event.pointerId);
      wake();
    });
    element.addEventListener('pointermove', event => {
      if (!drag || drag.state !== state || drag.id !== event.pointerId) return;
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.moved) {
        if (Math.abs(dx) < 7 || Math.abs(dx) <= Math.abs(dy)) return;
        drag.moved = true;
        element.classList.add('is-dragging');
      }
      const delta = event.clientX - drag.lastX;
      const elapsed = Math.max(8, performance.now() - drag.lastTime);
      state.targetSpin += delta * .24;
      state.momentum = reducedMotion ? 0 : clamp(delta * .24 * 16.667 / elapsed, -2.5, 2.5);
      drag.lastX = event.clientX;
      drag.lastTime = performance.now();
      wake();
    });
    const release = event => {
      if (!drag || drag.state !== state || drag.id !== event.pointerId) return;
      if (drag.moved) ignoreClickUntil = performance.now() + 350;
      if (event.type === 'pointercancel' || performance.now() - drag.lastTime > 100) state.momentum = 0;
      drag = null;
      element.classList.remove('is-dragging');
      wake();
    };
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) element.addEventListener(event, release);
    element.addEventListener('dragstart', event => event.preventDefault());
    element.addEventListener('click', event => {
      if (performance.now() < ignoreClickUntil) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    element.addEventListener('keydown', event => {
      if (event.target.closest('a') || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      state.targetSpin += event.key === 'ArrowRight' ? -360 / state.cells.length : 360 / state.cells.length;
      state.momentum = 0;
      wake();
    });
  }

  window.addEventListener('scroll', wake, { passive: true });
  window.addEventListener('resize', measure);
  window.visualViewport?.addEventListener('resize', measure);
  window.addEventListener('blur', () => {
    if (drag) { drag.state.momentum = 0; drag.state.element.classList.remove('is-dragging'); drag = null; }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else { previousScroll = scrollY; wake(); }
  });

  const menu = document.querySelector('.overlay-menu');
  const openButton = document.querySelector('.menu-icon');
  const closeButton = document.querySelector('.close-button');
  for (const [button, label] of [[openButton, 'Open navigation'], [closeButton, 'Close navigation']]) {
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', label);
  }
  openButton.setAttribute('aria-expanded', 'false');
  menu.inert = true;
  let menuScroll = 0;
  const toggleMenu = open => {
    if (open) menuScroll = scrollY;
    menu.inert = !open;
    if (sectionNav) sectionNav.inert = open;
    menu.classList.toggle('open', open);
    openButton.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('carousel-menu-open', open);
    (open ? closeButton : openButton).focus({ preventScroll: true });
    scrollTo({top:menuScroll,behavior:'instant'});
    requestAnimationFrame(() => {
      if (!disposed) scrollTo({top:menuScroll,behavior:'instant'});
    });
  };
  for (const [button, open] of [[openButton, true], [closeButton, false]]) {
    button.addEventListener('click', () => toggleMenu(open));
    button.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleMenu(open); }
    });
  }
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape') toggleMenu(false);
    if (event.key === 'Tab') {
      const items = [closeButton, ...menu.querySelectorAll('a')];
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    }
  });
  document.fonts.ready.then(measure);
  measure();
})();
