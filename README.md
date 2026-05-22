# 🇫🇷 French Daily Practice — Chrome Extension

A Manifest V3 Chrome extension that blocks your browser every day until you complete a short French writing task (DELF A2–B1 level). After you submit, it sends your work to Claude (Haiku) for AI feedback.

---

## Installation

### 1. Load the extension in Chrome

1. Open **Chrome** and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `french-practice/` folder (the one containing `manifest.json`)
5. The extension icon appears in your toolbar

### 2. Get an Anthropic API key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account or sign in
3. Navigate to **API Keys** and create a new key
4. Copy the key (starts with `sk-ant-…`)

### 3. Add your API key to the extension

1. Click the French Practice icon in your toolbar
2. Click **Options** (or right-click the icon → *Options*)
3. Paste your API key and click **Save**
4. Click **Test** to verify it works

> Your key is stored only in `chrome.storage.local` on your own machine and is never sent anywhere except `api.anthropic.com`.

---

## How it works

- **Each day** the extension picks one task — 50/50 random but seeded by the date, so it's the same task everywhere on that device.
- **Essay days:** you see a DELF-style writing prompt. Write ≥ 60 words in French to unlock submit.
- **Translation days:** translate 5 English sentences into French (≥ 3 words each).
- **Blocking:** a full-screen overlay appears on every website, and the new tab page shows the task.
- **After submitting:** Claude Haiku reviews your work and returns structured Markdown feedback.
- **Task resets at local midnight** via `chrome.alarms`.

---

## Expected cost

| Session | Tokens (approx.) | Cost |
|---------|-----------------|------|
| Essay feedback | ~1,800 in + 1,500 out | ~$0.003 |
| Translation feedback | ~1,200 in + 1,500 out | ~$0.002 |
| **Monthly (30 days)** | | **< $0.10** |

Haiku is the cheapest Claude model. At daily use you'll spend well under $1/month.

---

## Adding more prompts

**More essay prompts** → open `essay_prompts.json` and append objects with this shape:

```json
{
  "id": "essay_021",
  "title": "Your topic title",
  "context": "The scenario or audience.",
  "instructions": "Write a short text in French (at least 60 words) about…"
}
```

**More translation sets** → open `translation_sets.json` and append:

```json
{
  "id": "trans_021",
  "grammarFocus": "Your grammar point",
  "sentences": [
    { "source": "English sentence 1." },
    { "source": "English sentence 2." },
    { "source": "English sentence 3." },
    { "source": "English sentence 4." },
    { "source": "English sentence 5." }
  ]
}
```

Reload the extension (`chrome://extensions` → refresh icon) after editing the JSON files.

---

## Disabling the new tab override

If you want to stop using the extension temporarily without uninstalling it:

- Go to `chrome://extensions` and toggle the extension **off**

This disables the new tab override and the content script overlay. Toggle it back on to resume.

---

## Troubleshooting

### The overlay isn't appearing on a site

- Check `chrome://extensions` — make sure the extension is enabled
- The overlay only runs on `http://` and `https://` pages, not on `chrome://` pages or the Chrome Web Store
- If today's task is already done, the overlay won't appear (by design)

### The task is the same as yesterday / wrong task

Inspect today's state in DevTools. Open any webpage, press **F12**, go to the **Console** tab and run:

```js
chrome.storage.local.get('fpToday').then(console.log)
```

You should see an object with `date`, `taskType`, `taskId`, and `status`. If `date` doesn't match today, click **Reset Today's Task** in Options.

### The three surfaces show different tasks

They shouldn't — all surfaces read from the same `fpToday` key. If they differ, run the DevTools command above on each surface and compare. Use **Reset Today's Task** in Options to force a fresh state.

### API feedback says "No API key set"

Go to **Options**, paste your key, click **Save**, then click **Test** to confirm.

### API feedback returns an error

- **401** — your API key is invalid or expired. Generate a new one at console.anthropic.com.
- **429** — rate limit hit. Wait a minute and try again.
- **500** — Anthropic service issue. Try again later.

### Checking the alarm

To see when the midnight reset is scheduled:

```js
chrome.alarms.get('fp-midnight-reset').then(console.log)
```

---

## File structure

```
french-practice/
├── manifest.json             MV3 manifest
├── essay_prompts.json        20 DELF A2–B1 essay prompts
├── translation_sets.json     20 translation sets (5 sentences each)
├── background.js             Service worker: midnight alarm + startup check
├── popup.html / .js / .css   Toolbar popup
├── newtab.html / .js / .css  New tab override
├── overlay.js / .css         Content script blocking overlay (Shadow DOM)
├── options.html / .js        Options page (API key, reset, export)
├── history.html / .js        History viewer
└── lib/
    ├── tasks.js              Daily task logic + shared mountTaskUI()
    ├── api.js                Claude API call + system prompts
    ├── storage.js            chrome.storage.local helpers
    ├── markdown.js           Minimal Markdown renderer (no CDN)
    └── task.css              Shared task card styles
```
