#!/usr/bin/env node
// Firefox-only recorder. Requires Node 22+, ffmpeg, and a Firefox BiDi endpoint.
// Start an isolated Firefox profile from a normal terminal, then run this script.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
function option(name, fallback) { const index = args.indexOf(name); return index < 0 ? fallback : args[index + 1]; }
const endpoint = option('--endpoint', 'ws://127.0.0.1:9228/session');
const courseFilter = option('--course', 'all');
const idFilter = option('--id', 'all');
const skipID = option('--skip-id', '');
const duration = Number(option('--seconds', '8'));
const fps = 12;
const width = 1200;
const height = 800;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class BiDi {
  constructor(socket) {
    this.socket = socket; this.id = 0; this.pending = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id); clearTimeout(request.timer);
      message.type === 'error' ? request.reject(new Error(`${message.error}: ${message.message}`)) : request.resolve(message.result);
    });
    socket.addEventListener('close', () => {
      for (const request of this.pending.values()) { clearTimeout(request.timer); request.reject(new Error('Firefox connection closed')); }
      this.pending.clear();
    });
  }
  call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 40000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

function command(binary, parameters) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, parameters, { stdio: ['ignore', 'ignore', 'pipe'] });
    let error = ''; child.stderr.on('data', data => { error += data; });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve() : reject(new Error(error.slice(-2000))));
  });
}

async function connect() {
  if (typeof WebSocket === 'undefined') throw new Error('Please use Node 22 or newer.');
  const socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.close(); reject(new Error('Firefox is not listening on port 9228.')); }, 5000);
    socket.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Start Firefox with --remote-debugging-port 9228 first.')); }, { once: true });
  });
  return new BiDi(socket);
}

async function record(bidi, context, course, work) {
  const folder = path.join(root, course);
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-preview-'));
  const evaluate = async expression => {
    const response = await bidi.call('script.evaluate', { expression, target: { context }, awaitPromise: true, userActivation: true });
    if (response.type === 'exception') throw new Error(response.exceptionDetails?.text || 'Page evaluation failed');
    return response.result?.value;
  };
  try {
    console.log(`Opening ${course}: ${work.title} — ${work.student}`);
    await bidi.call('browsingContext.navigate', { context, url: work.url, wait: 'complete' });
    await bidi.call('input.performActions', { context, actions: [{ type: 'pointer', id: 'preview-mouse', parameters: { pointerType: 'mouse' }, actions: [{ type: 'pointerMove', x: 0, y: 0, duration: 0 }] }] });
    await evaluate(`Promise.race([document.fonts.ready.then(() => true), new Promise(r => setTimeout(() => r(false), 5000))])`);
    await evaluate(`Promise.race([Promise.all(Array.from(document.images).filter(i => i.getBoundingClientRect().top < innerHeight).map(i => i.decode().catch(() => {}))), new Promise(r => setTimeout(r, 10000))]).then(() => true)`);
    await sleep(Number(work.warmup_ms || 2200));
    if (['angelina-gonzalez', 'saleta-perez', 'nagisa-yoshikawa'].includes(work.id)) {
      // Firefox collapses percentage-sized SVG logos in auto-sized link wrappers.
      // Give only the original header logo an explicit recording width.
      await evaluate(`(() => { const logo = document.querySelector('header img[src*="logo"]');
        if (logo) { logo.style.width = '${work.id === 'saleta-perez' ? 120 : 150}px'; logo.style.height = 'auto'; logo.style.maxWidth = 'none'; }
        return true; })()`);
      await sleep(600);
    }

    // Accept the warning only inside the recording browser; the linked original keeps it.
    if (work.id === 'andy-nguyen-sense') {
      await evaluate(`(() => { document.querySelector('#enter-site-btn')?.click(); return true; })()`);
      await sleep(1200);
    }
    await evaluate(`(() => { document.querySelectorAll('video').forEach(v => { v.muted = true; v.play().catch(() => {}); }); window.scrollTo(0, 0); return true; })()`);
    await sleep(1000);
    if (work.id === 'andy-nguyen-portfolio') {
      // Firefox clips the final glyph inside the source site's inline-flex word wrapper.
      await evaluate(`(() => { document.querySelectorAll('#hero-text .word').forEach(w => w.style.overflow = 'visible'); return true; })()`);
    }
    const isSense = work.id === 'andy-nguyen-sense';
    // Render source videos on canvases while recording to exclude Firefox's PiP UI.
    if (isSense) {
      await evaluate(`(() => { document.querySelectorAll('video').forEach(v => {
        const c = document.createElement('canvas'); const style = getComputedStyle(v);
        c.style.cssText = Array.from(style).map(k => k + ':' + style.getPropertyValue(k)).join(';');
        const rect = v.getBoundingClientRect(); c.width = Math.round(rect.width); c.height = Math.round(rect.height);
        c.style.position = 'absolute'; c.style.top = '0'; c.style.left = '0'; c.style.pointerEvents = 'none'; v.after(c); v.style.visibility = 'hidden';
        const ctx = c.getContext('2d');
        const draw = () => { if (v.videoWidth) {
          const scale = Math.max(c.width / v.videoWidth, c.height / v.videoHeight);
          const w = v.videoWidth * scale, h = v.videoHeight * scale;
          ctx.drawImage(v, (c.width-w)/2, (c.height-h)/2, w, h);
          c.style.filter = getComputedStyle(v).filter;
        } requestAnimationFrame(draw); }; draw();
      }); return true; })()`);
      await sleep(1500);
    }

    let titleRect;
    if (isSense) {
      await evaluate(`(() => { document.querySelector('.scaling-container').dispatchEvent(new MouseEvent('mouseenter')); return true; })()`);
      titleRect = JSON.parse(await evaluate(`JSON.stringify((() => { const r = document.querySelector('.sense-type-hero h1').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })())`));
      await evaluate(`(() => { const cursor = document.createElement('div'); cursor.id = 'recording-pointer'; cursor.style.cssText = 'position:fixed;left:0;top:0;width:20px;height:26px;z-index:2147483647;pointer-events:none;opacity:0'; cursor.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 26"><path d="M2 1V21L7 16L11 24L15 22L11 14H18Z" fill="white" stroke="black" stroke-width="1.5"/></svg>'; document.body.append(cursor); return true; })()`);
    }
    const frames = Math.round(Number(work.preview_seconds || duration) * fps);
    for (let index = 0; index < frames; index++) {
      const frameStart = performance.now();
      if (isSense) {
        const seconds = index / fps;
        const t = Math.max(0, seconds - 0.6);
        // Sweep wide arcs and loops through the original word-rain interaction area.
        const x = Math.round(width * (0.5 + 0.36 * Math.sin(t * 1.35)));
        const y = Math.round(height * (0.32 + 0.16 * Math.sin(t * 2.1 + 0.6)));
        if (seconds >= 0.6 && seconds < 8.5) {
          await evaluate(`(() => { document.querySelector('.scaling-container').dispatchEvent(new MouseEvent('mousemove', { clientX: ${x}, clientY: ${y}, bubbles: true })); return true; })()`);
        }
        await evaluate(`(() => { const cursor = document.getElementById('recording-pointer'); cursor.style.transform = 'translate(${x}px, ${y}px)'; cursor.style.opacity = ${seconds >= 0.6 && seconds < 8.5 ? 1 : 0}; return true; })()`);
      }
      const image = await bidi.call('browsingContext.captureScreenshot', { context, origin: 'viewport', format: { type: 'image/jpeg', quality: 0.85 } });
      await fs.writeFile(path.join(temporary, `${String(index).padStart(4, '0')}.jpg`), Buffer.from(image.data, 'base64'));
      await sleep(Math.max(0, 1000 / fps - (performance.now() - frameStart)));
    }
    const videos = path.join(folder, 'videos');
    const images = path.join(folder, 'images');
    await fs.mkdir(videos, { recursive: true }); await fs.mkdir(images, { recursive: true });
    const temporaryVideo = path.join(temporary, 'preview.mp4');
    await command('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', path.join(temporary, '%04d.jpg'), '-an', '-c:v', 'libx264', '-crf', '25', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-r', '24', '-movflags', '+faststart', temporaryVideo]);
    await fs.copyFile(temporaryVideo, path.join(videos, `${work.id}.mp4`));
    await fs.copyFile(path.join(temporary, '0000.jpg'), path.join(images, `${work.id}-poster.jpg`));
    const page = path.join(folder, 'index.html');
    const html = await fs.readFile(page, 'utf8');
    if (!/^[a-z0-9-]+$/.test(work.id)) throw new Error('Invalid work ID');
    const safeID = work.id;
    const iframe = new RegExp(String.raw`<iframe\b[^>]*data-preview="${safeID}"[^>]*></iframe>`);
    const existing = new RegExp(String.raw`<video\b[^>]*data-preview="${safeID}"[^>]*>[\s\S]*?</video>`);
    const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
    const video = `<video class="student-work-video" data-preview="${work.id}" poster="images/${work.id}-poster.jpg" muted loop playsinline preload="none" aria-label="${escape(work.title)} by ${escape(work.student)}"><source data-src="videos/${work.id}.mp4" type="video/mp4"></video>`;
    const existingImage = new RegExp(String.raw`<img\b[^>]*data-preview="${safeID}"[^>]*>`);
    const matcher = iframe.test(html) ? iframe : existing.test(html) ? existing : existingImage;
    if (!matcher.test(html)) throw new Error(`Could not find preview card ${work.id}; video was saved but page was not changed.`);
    await fs.writeFile(page, html.replace(matcher, () => video));
    console.log(`Recorded ${work.id}: ${(await fs.stat(path.join(videos, `${work.id}.mp4`))).size} bytes`);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

let bidi;
let context;
try {
  bidi = await connect();
  await bidi.call('session.new', { capabilities: { alwaysMatch: { acceptInsecureCerts: false } } });
  context = (await bidi.call('browsingContext.create', { type: 'tab' })).context;
  await bidi.call('browsingContext.setViewport', { context, viewport: { width, height }, devicePixelRatio: 1 });
  const courses = ['web-interactive-design-1', 'web-interactive-design-2'].filter(course => courseFilter === 'all' || courseFilter === course);
  const failures = [];
  for (const course of courses) {
    const works = JSON.parse(await fs.readFile(path.join(root, course, 'student-works.json'), 'utf8'));
    for (const work of works.filter(work => work.preview_type !== 'image' && (idFilter === 'all' || work.id === idFilter) && work.id !== skipID)) {
      try { await record(bidi, context, course, work); }
      catch (error) { console.error(`FAILED ${work.id}: ${error.message}`); failures.push(work.id); }
    }
  }
  if (failures.length) throw new Error(`Recording still needed: ${failures.join(', ')}`);
  console.log('All selected previews recorded with Firefox.');
} catch (error) {
  console.error(error.message); process.exitCode = 1;
} finally {
  if (bidi && context) await bidi.call('browsingContext.close', { context }).catch(() => {});
  if (bidi) { await bidi.call('session.end').catch(() => {}); bidi.socket.close(); }
}
