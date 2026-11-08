// Project galleries only: category thumbnails and single-image projects stay unchanged.
(() => {
  const images = [...document.querySelectorAll('.project-wrapper .project3 img')];
  if (images.length < 2) return;

  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('aria-label', 'Project image gallery');
  dialog.innerHTML = `
    <button class="lightbox-close" type="button" aria-label="Close gallery"><svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
					<path d="M23 20.168l-8.185-8.187 8.185-8.174-2.832-2.807-8.182 8.179-8.176-8.179-2.81 2.81 8.186 8.196-8.186 8.184 2.81 2.81 8.203-8.192 8.18 8.192z"/>
				</svg></button>
    <button class="lightbox-prev" type="button" aria-label="Previous image"><svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
						<path d="M7.33 24l-2.83-2.829 9.339-9.175-9.339-9.167 2.83-2.829 12.17 11.996z" fill="#DAD5CB"/>
					</svg></button>
    <figure class="lightbox-figure">
      <img class="lightbox-image" alt="" decoding="async" draggable="false">
      <figcaption class="lightbox-caption" aria-live="polite" aria-atomic="true"></figcaption>
    </figure>
    <button class="lightbox-next" type="button" aria-label="Next image"><svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
						<path d="M7.33 24l-2.83-2.829 9.339-9.175-9.339-9.167 2.83-2.829 12.17 11.996z" fill="#DAD5CB"/>
					</svg></button>`;
  document.body.append(dialog);

  const display = dialog.querySelector('.lightbox-image');
  const caption = dialog.querySelector('.lightbox-caption');
  const closeButton = dialog.querySelector('.lightbox-close');
  const loadedNeighbors = new Map();
  let current = 0;
  let opener;
  let touchStart;
  const wrap = index => (index + images.length) % images.length;
  const sizes = '(max-width: 865px) calc(100vw - 56px), calc(100vw - 228px)';

  function setSource(target, source) {
    target.sizes = sizes;
    target.srcset = source.srcset;
    target.src = source.src;
  }

  function show(index) {
    current = wrap(index);
    const source = images[current];
    display.alt = source.alt;
    setSource(display, source);
    caption.textContent = `${source.alt} - ${current + 1}/${images.length}`;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      display.getAnimations().forEach(animation => animation.cancel());
      display.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 180 });
    }
    // Warm only the neighboring slides, after the gallery has been opened.
    for (const index of [wrap(current - 1), wrap(current + 1)]) {
      if (!loadedNeighbors.has(index)) {
        const preview = new Image();
        setSource(preview, images[index]);
        loadedNeighbors.set(index, preview);
      }
    }
  }

  images.forEach((image, index) => {
    image.classList.add('lightbox-trigger');
    image.tabIndex = 0;
    image.setAttribute('role', 'button');
    image.setAttribute('aria-haspopup', 'dialog');
    image.setAttribute('aria-label', `Open image ${index + 1} of ${images.length}: ${image.alt}`);
    function open() {
      opener = image;
      dialog.showModal();
      document.documentElement.classList.add('lightbox-open');
      show(index);
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

  closeButton.addEventListener('click', () => dialog.close());
  dialog.querySelector('.lightbox-prev').addEventListener('click', () => show(current - 1));
  dialog.querySelector('.lightbox-next').addEventListener('click', () => show(current + 1));
  dialog.addEventListener('click', event => {
    if (event.target === dialog || event.target === dialog.querySelector('.lightbox-figure')) dialog.close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('lightbox-open');
    touchStart = null;
    opener?.focus({ preventScroll: true });
  });
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
})();
