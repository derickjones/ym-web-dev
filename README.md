# About Me Starter 🌐

A starter repo for the workshop: fork it, fill in `prompt.txt`, paste it into
Codex cloud, merge the PR, and your personal website is live on GitHub Pages.

## What's in here

| File | What it does |
|---|---|
| `AGENTS.md` | Instructions Codex reads automatically. It sets the rules (static site, no build step, works on GitHub Pages, one pass, no questions). **You don't need to edit this.** |
| `prompt.txt` | Your brief. Fill in the `[BRACKETED]` fields, then paste the whole thing into Codex. |
| `index.html` | A placeholder page so you can confirm GitHub Pages works before Codex touches anything. Codex will replace it. |

## Workshop steps

1. **Fork this repo** (top-right on GitHub → Fork).
2. **Turn on GitHub Pages** in your fork:
   `Settings → Pages → Build and deployment → Source: "Deploy from a branch" → Branch: main, folder: /(root) → Save`.
3. **Check the placeholder**: after a minute, visit
   `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/` — you should see the
   "waiting for Codex" page.
4. **Open Codex cloud** (chatgpt.com/codex), connect your GitHub account, and
   select your fork as the repo.
5. **Fill in `prompt.txt`** — every bracket, honestly and specifically.
6. **Paste it into Codex** as your first prompt. Codex reads `AGENTS.md` on its
   own, so the prompt is all you need to send.
7. **Review the pull request** Codex opens, then **merge** it.
8. **Visit your site again** — it's live. 🎉

## You have ~2 Codex turns. Spend them well.

- **Turn 1 is your whole brief.** Everything Codex knows about you comes from
  `prompt.txt`, so be specific: colors, vibe, sections, links, a fun fact.
- **Don't ask Codex questions** in turn 1 — if it asks one back, you've burned
  a turn answering it. The prompt and `AGENTS.md` both tell it to make tasteful
  choices instead.
- **Save turn 2 for fixes.** After you see the merged site, paste one follow-up
  like: *"Make the header smaller, change the accent color to teal, and add a
  section for my dog."* Batch all your changes into that one message.
- **Turn 3 is emergency-only** (something broken, typo in your name, etc.).

## If something looks wrong

- Site not updating? Pages can take a minute or two after a merge — hard-refresh
  (Cmd/Ctrl + Shift + R).
- 404? Check the repo name in the URL matches your fork exactly, and that Pages
  is set to the `main` branch, `/(root)`.
