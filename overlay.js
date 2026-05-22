/**
 * overlay.js — Manifest V3 module content script
 * Runs in the content script's isolated world (has full chrome.* access).
 * Injects a Shadow DOM overlay on every http/https page.
 *
 * SAFETY GUARD 1: manifest matches only ["http://*/*","https://*/*"]
 * SAFETY GUARD 2: bail on chrome-extension: at runtime
 */

// Guard — should never trigger given the manifest matches, but kept as safety net
if (window.location.protocol === 'chrome-extension:') {
  // Stop immediately
  throw new Error('[FP] overlay bailed: chrome-extension: page');
}

import { mountTaskUI } from './lib/tasks.js';
import * as Storage    from './lib/storage.js';

// Prevent double-mount if the script somehow executes twice
if (!window.__fpOverlayMounted) {
  window.__fpOverlayMounted = true;
  init();
}

async function init() {
  // ── 1. Check if today's task is already done ──────────────────────────
  try {
    const today = await Storage.getToday();
    if (today && (today.status === 'done' || today.status === 'skipped')) {
      return; // no overlay needed
    }
  } catch (_) {
    // If storage read fails, show the overlay to be safe
  }

  // ── 2. Build Shadow DOM host ──────────────────────────────────────────
  const host = document.createElement('div');
  host.id = 'fp-overlay-host';
  // Position the host element at the top of <html> so it's above everything
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Inject styles into shadow (URLs are resolved by the extension)
  function addStylesheet(url) {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = url;
    shadow.appendChild(link);
  }
  addStylesheet(chrome.runtime.getURL('lib/task.css'));
  addStylesheet(chrome.runtime.getURL('overlay.css'));

  // Scrollable overlay backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'fp-overlay-backdrop';

  const panel = document.createElement('div');
  panel.className = 'fp-overlay-panel';

  const inner = document.createElement('div');
  inner.className = 'fp-overlay-inner';

  // Loading placeholder (visible while mountTaskUI resolves)
  inner.innerHTML = '<div class="fp-loading">Loading today\'s task…</div>';

  panel.appendChild(inner);
  backdrop.appendChild(panel);
  shadow.appendChild(backdrop);

  // Block page scroll
  document.documentElement.style.overflow = 'hidden';
  if (document.body) document.body.style.overflow = 'hidden';

  // ── 3. Teardown helper ────────────────────────────────────────────────
  function removeOverlay() {
    document.documentElement.style.overflow = '';
    if (document.body) document.body.style.overflow = '';
    host.remove();
    window.__fpOverlayMounted = false;
  }

  // ── 4. Mount shared task UI ───────────────────────────────────────────
  try {
    const teardown = await mountTaskUI(inner, {
      surface: 'overlay',
      onComplete: async () => removeOverlay(),
      onSkip:     async () => removeOverlay(),
      onFeedback: ()       => {}
    });

    // Also dismiss if another surface (popup/newtab) completes the task
    chrome.storage.onChanged.addListener(function crossSurface(changes) {
      if (!changes.fpToday) return;
      const nv = changes.fpToday.newValue;
      if (nv && (nv.status === 'done' || nv.status === 'skipped')) {
        chrome.storage.onChanged.removeListener(crossSurface);
        teardown();
        removeOverlay();
      }
    });

  } catch (err) {
    inner.innerHTML =
      `<div style="color:red;padding:24px;font-family:sans-serif">
         Overlay error: ${err.message}
       </div>`;
    console.error('[FP overlay]', err);
  }
}
