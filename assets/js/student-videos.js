// Load and play only visible previews. Keep posters for reduced-motion visitors.
(() => {
  const videos = [...document.querySelectorAll('.student-work-video')];
  if (!videos.length) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visible = new Set();
  function sync(video) {
    if (!visible.has(video) || document.hidden || reducedMotion.matches) {
      video.pause();
      return;
    }
    const source = video.querySelector('source[data-src]');
    if (source && !source.src) {
      source.src = source.dataset.src;
      video.load();
    }
    video.muted = true;
    video.play().catch(() => {});
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target);
      sync(entry.target);
    }
  }, { threshold: 0.15 });
  videos.forEach(video => observer.observe(video));
  document.addEventListener('visibilitychange', () => videos.forEach(sync));
  reducedMotion.addEventListener('change', () => videos.forEach(sync));
})();
