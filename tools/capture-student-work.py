#!/usr/bin/env python3
"""Capture the student sites with Firefox and replace live previews with JPGs.

Run from the repository: python3 tools/capture-student-work.py
Requires Firefox and Pillow. Never uses Chrome or the default browser profile.
"""
import argparse
import json
from pathlib import Path
import re
import subprocess
import tempfile
from PIL import Image, ImageOps


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--firefox', default='/Applications/Firefox.app/Contents/MacOS/firefox')
    parser.add_argument('--course', choices=['web-interactive-design-1', 'web-interactive-design-2'], default='web-interactive-design-2')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    folder = root / args.course
    (folder / 'images').mkdir(parents=True, exist_ok=True)
    page = folder / 'index.html'
    works = json.loads((folder / 'student-works.json').read_text())
    failures = []
    for work in works:
        if f'data-preview="{work["id"]}"' not in page.read_text() or not re.search(
            r'<iframe\b[^>]*data-preview="' + re.escape(work['id']) + r'"', page.read_text()
        ):
            print('Skipping existing local preview:', work['title'], flush=True)
            continue
        try:
            with tempfile.TemporaryDirectory(prefix='student-work-firefox-') as tmp:
                profile = Path(tmp) / 'profile'
                profile.mkdir()
                (profile / 'user.js').write_text('user_pref("ui.prefersReducedMotion", 1);\n')
                screenshot = Path(tmp) / 'screenshot.png'
                capture_url = (folder / work['capture_path']).as_uri() if work.get('capture_path') else work['url']
                result = subprocess.run([
                    args.firefox, '--headless', '--no-remote', '--profile', str(profile),
                    '--window-size', '1440,960', '--screenshot', str(screenshot), capture_url
                ], capture_output=True, text=True, timeout=60)
                if result.returncode != 0 or not screenshot.is_file():
                    raise RuntimeError(result.stderr.strip()[:250] or 'Firefox did not produce a screenshot')
                with Image.open(screenshot) as image:
                    image = image.convert('RGB')
                    # Capture the top viewport, retaining the actual page composition.
                    image = image.crop((0, 0, min(image.width, 1440), min(image.height, 960)))
                    for width, suffix in [(1440, '-1440'), (720, '-720')]:
                        thumb = ImageOps.fit(image, (width, width * 2 // 3), Image.Resampling.LANCZOS)
                        thumb.save(folder / 'images' / f'{work["id"]}{suffix}.jpg', quality=90, optimize=True, progressive=True)
                html = page.read_text()
                image_tag = (
                    f'<img src="images/{work["id"]}-1440.jpg" '
                    f'srcset="images/{work["id"]}-720.jpg 720w, images/{work["id"]}-1440.jpg 1440w" '
                    'sizes="(max-width: 865px) calc(100vw - 56px), (max-width: 1199px) calc((100vw - 146px) / 2), calc((100vw - 176px) / 3)" '
                    f'width="1440" height="960" alt="Screenshot of {work["title"]} by {work["student"]}" '
                    'loading="lazy" decoding="async">'
                )
                html = re.sub(r'<iframe\b[^>]*data-preview="' + re.escape(work['id']) + r'"[^>]*></iframe>', lambda _: image_tag, html)
                page.write_text(html)
                print('Captured:', work['title'], '—', work['student'], flush=True)
        except Exception as error:
            failures.append(work['id'])
            print('Could not capture:', work['url'], str(error), flush=True)
    if failures:
        raise SystemExit(f'{len(failures)} screenshot(s) still need capturing. Live previews have been retained for these sites.')
    print(f'All {len(works)} Firefox screenshots are ready.')


if __name__ == '__main__':
    main()
