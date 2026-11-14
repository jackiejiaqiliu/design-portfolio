// Project galleries only: category thumbnails and single-image projects stay unchanged.
(() => {
  const images = [...document.querySelectorAll('.project-wrapper .project3 img')];
  if (images.length < 2) return;

  const phoneScreen = matchMedia('(max-width: 767px)');
  const triggerAttributes = ['tabindex','role','aria-haspopup','aria-label'];
  const originalAttributes = new Map(images.map(image => [image, Object.fromEntries(triggerAttributes.map(name => [name,image.getAttribute(name)]))]));

  const iconRoot = new URL('../icons/', document.currentScript.src);
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Project image gallery');
  dialog.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close gallery"><svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
					<path d="M23 20.168l-8.185-8.187 8.185-8.174-2.832-2.807-8.182 8.179-8.176-8.179-2.81 2.81 8.186 8.196-8.186 8.184 2.81 2.81 8.203-8.192 8.18 8.192z"/>
				</svg></button>
    <button class="lightbox-prev" type="button" aria-label="Previous image"><img src="${new URL('chevron-left.svg', iconRoot).href}" alt="" width="24" height="24" aria-hidden="true"></button>
    <figure class="lightbox-figure">
      <img class="lightbox-image" alt="" decoding="async" draggable="false">
      <figcaption class="lightbox-caption" aria-live="polite" aria-atomic="true"></figcaption>
    </figure>
    <button class="lightbox-next" type="button" aria-label="Next image"><img src="${new URL('chevron-right.svg', iconRoot).href}" alt="" width="24" height="24" aria-hidden="true"></button>`;
  document.body.append(dialog);

  const figure = dialog.querySelector('.lightbox-figure');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const display = dialog.querySelector('.lightbox-image');
  const caption = dialog.querySelector('.lightbox-caption');
  const closeButton = dialog.querySelector('.lightbox-close');
  const loadedNeighbors = new Map();
  const outgoingFrames = new Set();
  function clearOutgoing() { outgoingFrames.forEach(frame => frame.remove()); outgoingFrames.clear(); }
  let current = 0;
  let revision = 0;
  let closing = false;
  let opener;
  let touchStart;
  const customCursor = document.querySelector('.cursor');
  let cursorParent, cursorSibling;
  const cursorBall = customCursor?.querySelector('.cursor__ball');
  function sizeCursor(scale) {
    if (cursorBall && window.gsap) gsap.to(cursorBall, {scale, duration:.2, overwrite:'auto'});
  }
  function restoreCursor() {
    sizeCursor(1);
    if (customCursor && cursorParent?.isConnected) {
      cursorParent.insertBefore(customCursor, cursorSibling?.parentNode === cursorParent ? cursorSibling : null);
    }
  }
  const wrap = index => (index + images.length) % images.length;
  const sizes = '(max-width: 767px) calc(100vw - 120px), (max-width: 865px) calc(100vw - 56px), calc(100vw - 228px)';

  function setSource(target, source) {
    target.sizes = sizes;
    target.srcset = source.srcset;
    target.src = source.src;
  }

  const easing = 'cubic-bezier(.22, 1, .36, 1)';
  const finish = animation => animation.finished.catch(() => {});

  async function show(index, opening = false) {
    if (closing) return;
    const request = ++revision;
    const direction = index < current ? -1 : 1;
    current = wrap(index);
    const selected = current;
    const source = images[selected];
    let preview = loadedNeighbors.get(selected);
    if (!preview) {
      preview = new Image();
      setSource(preview, source);
      loadedNeighbors.set(selected, preview);
    }
    figure.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    if (opening) figure.style.opacity = '0';
    // Keep the outgoing frame until the next image is decoded; never fade in
    // an empty screen or let a slow request overwrite newer arrow input.
    await preview.decode().catch(() => {});
    if (request !== revision || !dialog.open || closing) return;
    clearOutgoing();
    let outgoing;
    if (!opening && !reducedMotion.matches && display.currentSrc) {
      const bounds = figure.getBoundingClientRect();
      const imageBounds = display.getBoundingClientRect();
      outgoing = figure.cloneNode(true);
      outgoing.classList.add('lightbox-outgoing');
      outgoing.setAttribute('aria-hidden','true');
      outgoing.querySelector('figcaption').removeAttribute('aria-live');
      outgoing.querySelector('figcaption').style.visibility = 'hidden';
      outgoing.style.cssText = `position:fixed;left:${bounds.left}px;top:${bounds.top}px;width:${bounds.width}px;height:${bounds.height}px;margin:0;pointer-events:none;`;
      const oldImage = outgoing.querySelector('img');
      oldImage.style.width = `${imageBounds.width}px`;
      oldImage.style.height = `${imageBounds.height}px`;
      dialog.append(outgoing);
      outgoingFrames.add(outgoing);
      display.style.opacity = '0';
    }
    display.alt = source.alt;
    setSource(display, source);
    await display.decode().catch(() => {});
    if (request !== revision || !dialog.open || closing) { outgoing?.remove(); outgoingFrames.delete(outgoing); return; }
    caption.textContent = `${source.alt} - ${selected + 1}/${images.length}`;
    figure.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    figure.style.opacity = '';
    display.style.opacity = '';
    if (!reducedMotion.matches) {
      if (outgoing) {
        finish(outgoing.querySelector('img').animate([
          {opacity:1,transform:'perspective(900px) translateX(0) rotateY(0) scale(1)'},
          {opacity:0,transform:`perspective(900px) translateX(${-direction*60}px) rotateY(${-direction*5}deg) scale(.96)`}
        ], {duration:540,easing,fill:'forwards'})).then(() => { outgoing.remove(); outgoingFrames.delete(outgoing); });
      }
      display.animate([
        {opacity:0,transform:opening
          ? 'perspective(900px) translateY(48px) rotateX(6deg) scale(.88)'
          : `perspective(900px) translateX(${direction*72}px) rotateY(${direction*6}deg) scale(.94)`},
        {opacity:1,transform:'perspective(900px) translate(0,0) rotateX(0) rotateY(0) scale(1)'}
      ], {duration:opening ? 740 : 540,easing});
      if (opening) display.animate([
        {clipPath:'inset(12% 0 12% 0)'}, {clipPath:'inset(0% 0 0% 0)'}
      ], {duration:740,easing});

    }
    for (const neighbor of [wrap(selected - 1), wrap(selected + 1)]) {
      if (!loadedNeighbors.has(neighbor)) {
        const image = new Image();
        setSource(image, images[neighbor]);
        loadedNeighbors.set(neighbor, image);
      }
    }
  }

  async function close() {
    if (!dialog.open || closing) return;
    closing = true;
    ++revision;
    clearOutgoing();
    if (!reducedMotion.matches) {
      figure.getAnimations({subtree:true}).forEach(animation => animation.cancel());
      figure.animate([{transform:'perspective(900px) scale(1)'},{transform:'perspective(900px) translateY(32px) rotateX(4deg) scale(.86)'}], {duration:330,easing:'cubic-bezier(.55,0,1,.45)',fill:'forwards'});
      await finish(dialog.animate([{opacity:1},{opacity:0}], {duration:330,easing:'ease-in',fill:'forwards'}));
    }
    dialog.close();
  }

  images.forEach((image, index) => {
    function open() {
      if (phoneScreen.matches || dialog.open) return;
      opener = image;
      closing = false;
      dialog.getAnimations().forEach(animation => animation.cancel());
      if (customCursor) {
        cursorParent = customCursor.parentNode;
        cursorSibling = customCursor.nextSibling;
        dialog.append(customCursor);
      }
      dialog.showModal();
      if (!reducedMotion.matches) dialog.animate([{opacity:0},{opacity:1}], {duration:440,easing:'ease-out'});
      document.documentElement.classList.add('lightbox-open');
      show(index, true);
      closeButton.focus({ preventScroll: true });
    }
    image.addEventListener('click', open);
    image.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  });

  closeButton.addEventListener('click', close);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.querySelector('.lightbox-prev').addEventListener('click', () => show(current - 1));
  dialog.querySelector('.lightbox-next').addEventListener('click', () => show(current + 1));
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target === figure) close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('close', () => {
    clearOutgoing();
    ++revision;
    closing = false;
    dialog.getAnimations().forEach(animation => animation.cancel());
    figure.getAnimations({subtree:true}).forEach(animation => animation.cancel());
    figure.style.opacity = '';
    display.style.opacity = '';
    restoreCursor();
    document.documentElement.classList.remove('lightbox-open');
    touchStart = null;
    opener?.focus({ preventScroll: true });
  });
  document.addEventListener('portfolio:leave-page', () => {
    phoneScreen.removeEventListener('change', updateTriggers);
    restoreCursor();
  }, {once:true});
  display.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') return;
    touchStart = { x: event.clientX, y: event.clientY };
    display.setPointerCapture(event.pointerId);
  });
  display.addEventListener('pointerup', event => {
    if (!touchStart) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(current + (dx < 0 ? 1 : -1));
  });
  display.addEventListener('pointercancel', () => { touchStart = null; });
  function updateTriggers() {
    const enabled = !phoneScreen.matches;
    images.forEach((image,index) => {
      image.classList.toggle('lightbox-trigger',enabled);
      const attributes = enabled ? {
        tabindex:'0', role:'button', 'aria-haspopup':'dialog',
        'aria-label':`Open image ${index + 1} of ${images.length}: ${image.alt}`
      } : originalAttributes.get(image);
      for (const [name,value] of Object.entries(attributes)) {
        if (value === null) image.removeAttribute(name);
        else image.setAttribute(name,value);
      }
    });
    if (!enabled && dialog.open) {
      ++revision;
      clearOutgoing();
      dialog.getAnimations().forEach(animation => animation.cancel());
      dialog.close();
    }
  }
  phoneScreen.addEventListener('change', updateTriggers);
  updateTriggers();

})();
