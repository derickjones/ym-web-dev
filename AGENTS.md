# AGENTS.md — instructions for the coding agent

## What this project is

A personal "About Me" website for one person, built as a static site and hosted
on GitHub Pages. All the content and style direction comes from the user's
prompt. This file defines the rules you must build within.

## Hard constraints

- **Static site only.** Plain HTML, CSS, and vanilla JavaScript. No frameworks,
  no npm, no build step, no server-side code.
- **Must work from a subpath.** The site is served from
  `https://<username>.github.io/<repo-name>/`, so use relative URLs everywhere
  (`./style.css`, `./assets/photo.jpg`) — never root-absolute paths like
  `/style.css`.
- **Simple flat layout.** `index.html` in the repo root is the entry point.
  Keep it to `index.html`, `style.css`, `script.js` (only if interactivity is
  actually needed), and `assets/` for images.
- **No secrets or external APIs.** No API keys, no fetch calls to third-party
  services. CDN links for fonts or icons are fine.
- **No lorem ipsum or placeholder text.** If the prompt doesn't provide content
  for a section, either write something neutral the user can edit later or omit
  that section entirely.

## Quality bar

- **Responsive.** Must look right at phone width and desktop width.
- **Accessible basics.** Semantic HTML (`header`, `main`, `section`, `footer`),
  one `<h1>`, alt text on images, readable color contrast.
- **Actually designed.** Match the vibe and colors the user asked for. This
  page is the whole point of the exercise — it should look intentional, not
  like a default template. Typography, spacing, and color matter more than
  fancy features.
- **Clean render.** No console errors, no broken links, no missing images.

## How to work

- **Do everything in one pass.** The user has a very limited number of turns.
  Do not ask clarifying questions — make sensible, tasteful choices for
  anything the prompt leaves vague, and list those choices in your PR
  description so the user can adjust them in their follow-up turn.
- **Replace the placeholder `index.html` entirely.** It exists only to verify
  GitHub Pages works.
- **Open a single pull request** with a short summary: what you built, the
  sections included, and any choices you made on the user's behalf.
