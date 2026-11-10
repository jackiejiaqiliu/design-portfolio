# Jiaqi Liu Design Portfolio

A static HTML, CSS, and JavaScript portfolio. No build step is required.

## Structure

Every public page has its own top-level folder and an `index.html`. The homepage is the root `index.html`. Detail pages are never nested inside category pages.

```text
index.html
pd/                              Production Design listing
gd/                             Graphic Design listing
ux/                              UX/UI Design listing
teaching/                        Teaching listing only
aphasia/                         Example design project
  index.html
  images/                        Final images used by this project
web-interactive-design-1/        Example course detail
  index.html
  images/                        Final images and course cover
  student-works.json             Work titles, credits, and source URLs
assets/
  css/                           Shared responsive and page styles
  js/                            Main interactions and lightbox
  fonts/                         Web font files
  icons/                         Shared SVG icons
tools/                          Local maintenance scripts
```

All design projects and all six course details follow the same top-level page pattern. `pd`, `gd`, and `ux` retain their existing public URLs.

## Naming and assets

- Use lowercase, hyphen-separated folder and asset names.
- Use `index.html` for every page to keep public URLs free of `.html`.
- Keep project images in that project's `images/` folder. Category listings reference those same files rather than storing duplicate copies.
- Course covers use `cover-WIDTH.jpg`; numbered photos use `photo-01.jpg` or `photo-01-WIDTH.jpg`.
- Keep responsive image variants that are referenced by `srcset`. The number in a width filename describes the image's pixel width.
- No `originals`, `optimized`, backup, or inspiration folders are included in the website. Keep working source files outside this repository.
- Shared assets belong in `assets/`; maintenance code belongs in `tools/`.

## Local preview

From the repository root:

```sh
python3 -m http.server 5501 --bind 127.0.0.1
```

Open http://127.0.0.1:5501/.

## Firefox student-work videos

Web 1 and Web 2 use local images for static homepages and silent, looping MP4 previews for animated homepages, instead of embedding student websites. Each video keeps the opening viewport fixed; Sense additionally demonstrates the original site's mouse and title interaction. External card links still open the original projects.

Videos are stored in each course's `videos/` folder, with matching static posters in `images/`. Only visible previews load and play; reduced-motion visitors see the poster instead.

To re-record, use Firefox, Node.js 22 or later, and ffmpeg. Start an isolated Firefox profile from a normal terminal:

```sh
mkdir -p /tmp/portfolio-firefox-video
"/Applications/Firefox.app/Contents/MacOS/firefox" --headless --no-remote --profile /tmp/portfolio-firefox-video --remote-debugging-port 9228 about:blank
```

From a second terminal at the repository root:

```sh
node tools/record-student-previews.mjs
```

Optional filters: `--course web-interactive-design-1`, `--id andy-nguyen-sense`, or `--seconds 8`. Each course's `student-works.json` supplies titles, credits, URLs, and any extra loading delay.

## Course detail URLs

- `/web-interactive-design-2/`
- `/web-interactive-design-1/`
- `/participatory-design/`
- `/applied-technopoetics/`
- `/first-robotics/`
- `/core-studio-practice-1/`

These replace the previous nested `/teaching/.../` detail URLs; all internal links have been updated.
