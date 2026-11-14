/* Prepared, same-document crossfades for every internal portfolio link. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const prepared = new Map();
  const assetRoot = new URL('../',document.currentScript.src);
  let leaving = false;
  history.replaceState({...history.state,portfolio:true},'',location.href);

  function preparePage(url) {
    if (prepared.has(url.href)) return prepared.get(url.href);
    const promise = (async () => {
      const response = await fetch(url.href);
      if (!response.ok) throw new Error('Page unavailable');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      if (!doc.querySelector('.category-page,.project-wrapper,.home-carousels')) throw new Error('Not a portfolio page');
      const styles = [...doc.querySelectorAll('link[rel="stylesheet"]')].map(link => {
        const href = new URL(link.getAttribute('href'),url).href;
        if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(existing => existing.href === href)) return Promise.resolve();
        return new Promise((resolve,reject) => {
          const style = document.createElement('link');
          style.rel = 'stylesheet'; style.href = href;
          if (link.media) style.media = link.media;
          style.onload = resolve; style.onerror = reject;
          document.head.append(style);
        });
      });
      const images = [...doc.querySelectorAll('.project-card img,.project3 img,.carousel-scene:first-child img')].slice(0,2).map(async source => {
        const image = new Image();
        image.sizes = source.sizes;
        if (source.srcset) image.srcset = source.srcset.split(',').map(candidate => {
          const [path,...descriptor] = candidate.trim().split(/\s+/);
          return [new URL(path,url).href,...descriptor].join(' ');
        }).join(',');
        image.src = new URL(source.getAttribute('src'),url).href;
        await image.decode();
      });
      const posters = [...doc.querySelectorAll('video[poster]')].slice(0,2).map(async video => {
        const image = new Image(); image.src = new URL(video.getAttribute('poster'),url).href; await image.decode();
      });
      const scripts = [...doc.querySelectorAll('script[src]')].map(script => new URL(script.getAttribute('src'),url)).filter(src => src.origin === location.origin && !src.pathname.endsWith('/page-transitions.js'));
      await Promise.all([...styles,...images,...posters,document.fonts.ready,...scripts.map(src => fetch(src.href))]);
      return doc;
    })();
    prepared.set(url.href,promise);
    promise.catch(() => prepared.delete(url.href));
    return promise;
  }

  function capturePage() {
    const snapshot = document.createElement('div');
      snapshot.className = 'page-transition-snapshot';
      snapshot.setAttribute('aria-hidden','true');
      snapshot.inert = true;
      const wrapper = document.querySelector('.home-wrapper,.project-wrapper,.home-carousels');
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const copy = wrapper.cloneNode(true);
        copy.querySelectorAll('.site-header,.overlay-menu,dialog,script').forEach(element => element.remove());
        const originals = [...wrapper.querySelectorAll('img')];
        copy.querySelectorAll('img').forEach((image,index) => {
          image.removeAttribute('srcset'); image.removeAttribute('loading');
          const original = originals[index];
          const rect = original.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > innerHeight || !original.complete || !original.naturalWidth) {
            image.removeAttribute('src');
            image.style.visibility = 'hidden';
          } else {
            image.src = original.currentSrc || original.src;
          }
        });
        const videos = [...wrapper.querySelectorAll('video')];
        copy.querySelectorAll('video').forEach((video,index) => {
          const original = videos[index];
          const canvas = document.createElement('canvas');
          canvas.width = original.videoWidth || original.clientWidth;
          canvas.height = original.videoHeight || original.clientHeight;
          if (original.readyState >= 2) {
            canvas.getContext('2d').drawImage(original,0,0,canvas.width,canvas.height);
            canvas.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover';
            video.replaceWith(canvas);
          } else {
            video.autoplay = false;
            if (original.poster) video.poster = original.poster;
            video.removeAttribute('src'); video.querySelectorAll('source').forEach(source => source.remove());
          }
        });
        copy.style.cssText = `position:absolute;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;margin:0;`;
        snapshot.append(copy);
      }
    return snapshot;
  }

  function enterPage(doc,url,{push = true,scroll = 0} = {}) {
    const snapshot = capturePage();
    document.dispatchEvent(new Event('portfolio:leave-page'));
    document.dispatchEvent(new Event('portfolio:leave-home'));
    // Preserve asset URLs when the address changes without a document reload.
    for (const element of document.head.querySelectorAll('[href],[src]')) {
      if (element.hasAttribute('href')) element.setAttribute('href',element.href);
      if (element.hasAttribute('src')) element.setAttribute('src',element.src);
    }
    if (push) {
      history.replaceState({...history.state,scroll:scrollY},'',location.href);
      history.pushState({portfolio:true,scroll:0},'',url.href);
    }
    document.title = doc.title;
    const body = document.importNode(doc.body,true);
    body.querySelectorAll('script').forEach(script => script.remove());
    document.body.replaceWith(body);
    body.append(snapshot);
    scrollTo({top:scroll,behavior:'instant'});
    for (const source of doc.querySelectorAll('script[src]')) {
      const src = new URL(source.getAttribute('src'),url);
      if (src.origin !== location.origin || src.pathname.endsWith('/page-transitions.js') || (src.pathname.endsWith('/gsap.min.js') && window.gsap)) continue;
      const script = document.createElement('script'); script.src = src.href; script.async = false;
      body.append(script);
    }
    snapshot.animate([{opacity:1},{opacity:0}],{
      duration:reduced?120:1100,easing:'cubic-bezier(.25,.1,.25,1)',fill:'forwards'
    }).finished.then(() => { snapshot.remove(); leaving = false; });
  }

  async function navigateFromCarousel(url,scene) {
    leaving = true;
    try {
      const doc = await preparePage(url);
      if (reduced || !window.gsap) { enterPage(doc,url); return; }
      root.classList.add('page-leaving');
      if (innerWidth >= 768 && innerWidth <= 1199) {
        gsap.to(scene.querySelectorAll('.carousel-cell'), {opacity:1,duration:.35});
      }
      const ring = scene.querySelector('.carousel-ring');
      const initial = ring.style.transform;
      const value = name => parseFloat(initial.split(name+'(')[1]) || 0;
      gsap.set(ring,{z:value('translateZ'),rotationX:value('rotateX'),rotationY:value('rotateY'),rotationZ:value('rotateZ'),force3D:true});
      scene.style.perspective = '900px';
      const scroll = {top:scrollY};
      const targetY = Math.max(0,scrollY+scene.getBoundingClientRect().top+scene.offsetHeight/2-innerHeight/2);
      const title = scene.querySelector('.carousel-title a');
      const titleText = title.querySelector('.nav-roll-text')?.textContent || title.textContent;
      title.setAttribute('aria-label',titleText);
      title.replaceChildren(...Array.from(titleText,character => {
        const span = document.createElement('span'); span.textContent = character;
        span.style.cssText = 'display:inline-block;white-space:pre'; span.setAttribute('aria-hidden','true'); return span;
      }));
      const timeline = gsap.timeline({defaults:{duration:1.5,ease:'power2.inOut'}})
        .to(scroll,{top:targetY,onUpdate:() => scrollTo({top:scroll.top,behavior:'instant'})},0)
        .to('.site-header,.home-section-nav',{autoAlpha:0,duration:.6,ease:'power1.inOut'},0)
        .to(title.children,{autoAlpha:0,duration:.02,ease:'none',stagger:{each:.04,from:'end'}},0)
        .to(ring,{rotationX:90,rotationY:-360,z:-2000},0)
        .to(ring,{duration:2.5,ease:'power3.inOut',z:1500,rotationZ:270},.7)
        .to(scene.querySelectorAll('.carousel-card'),{rotationZ:0},0);
      timeline.call(() => {
        timeline.kill();
        root.classList.remove('page-leaving');
        enterPage(doc,url);
      },[],2.35);
    } catch (_) { root.classList.remove('page-leaving'); leaving = false; location.assign(url.href); }
  }

  async function navigate(url,options) {
    leaving = true;
    try { enterPage(await preparePage(url),url,options); }
    catch (_) { leaving = false; location.assign(url.href); }
  }

  window.addEventListener('popstate',event => {
    if (event.state?.portfolio) navigate(new URL(location.href),{push:false,scroll:event.state.scroll||0});
  });
  for (const type of ['wheel','touchmove']) document.addEventListener(type,event => {
    if (leaving) event.preventDefault();
  },{passive:false});
  document.addEventListener('DOMContentLoaded',() => {
    if (document.body.classList.contains('carousel-home')) setTimeout(() => {
      for (const link of document.querySelectorAll('.carousel-title a')) preparePage(new URL(link.href)).catch(() => {});
    },350);
    document.addEventListener('click',event => {
      const link = event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.download || (link.target && link.target !== '_self')) return;
      const url = new URL(link.href,location.href);
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol) || (url.pathname === location.pathname && url.search === location.search)) return;
      event.preventDefault();
      if (leaving) return;
      const scene = link.closest('.carousel-scene');
      if (document.body.classList.contains('carousel-home') && scene) navigateFromCarousel(url,scene);
      else navigate(url);
    });
  });
})();
