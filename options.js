/**
 * options.js  — ES module entry point
 */
import * as Storage from './lib/storage.js';

const inputKey    = document.getElementById('input-api-key');
const btnSave     = document.getElementById('btn-save-key');
const btnTest     = document.getElementById('btn-test-key');
const keyMasked   = document.getElementById('key-masked');
const keyStatus   = document.getElementById('key-status');
const btnReset    = document.getElementById('btn-reset-today');
const resetStatus = document.getElementById('reset-status');
const btnExport   = document.getElementById('btn-export-hist');
const btnClear    = document.getElementById('btn-clear-hist');
const histStatus  = document.getElementById('hist-status');

function setStatus(el, msg, type = 'info') {
  el.textContent = msg;
  el.className   = `fp-opt-status ${type}`;
}

function maskKey(key) {
  if (!key || key.length < 12) return '';
  return key.slice(0, 10) + '****';
}

// ── Load existing key ───────────────────────────────────────────────────────

const existingKey = await Storage.getApiKey();
if (existingKey) {
  keyMasked.textContent = `Saved: ${maskKey(existingKey)}`;
  setStatus(keyStatus, 'API key is set.', 'ok');
}

// ── Save key ────────────────────────────────────────────────────────────────

btnSave.addEventListener('click', async () => {
  const key = inputKey.value.trim();
  if (!key) { setStatus(keyStatus, 'Please enter an API key.', 'error'); return; }
  await Storage.setApiKey(key);
  keyMasked.textContent = `Saved: ${maskKey(key)}`;
  inputKey.value = '';
  setStatus(keyStatus, 'API key saved.', 'ok');
});

// ── Test key ────────────────────────────────────────────────────────────────

btnTest.addEventListener('click', async () => {
  setStatus(keyStatus, 'Testing…', 'info');
  btnTest.disabled = true;
  try {
    const key = inputKey.value.trim() || await Storage.getApiKey();
    if (!key) throw new Error('No API key — save one first.');

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':                              'application/json',
        'x-api-key':                                 key,
        'anthropic-version':                         '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model:     'claude-haiku-4-5',
        max_tokens: 10,
        messages:  [{ role: 'user', content: 'Bonjour' }]
      })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err?.error?.message || resp.statusText);
    }
    setStatus(keyStatus, '✓ API key works!', 'ok');
  } catch (err) {
    setStatus(keyStatus, `✗ ${err.message}`, 'error');
  } finally {
    btnTest.disabled = false;
  }
});

// ── Reset today ─────────────────────────────────────────────────────────────

btnReset.addEventListener('click', async () => {
  await Storage.clearToday();
  setStatus(resetStatus,
    "Today's task has been reset. Reload any open tab to see the task again.", 'ok');
});

// ── Export history ──────────────────────────────────────────────────────────

btnExport.addEventListener('click', async () => {
  const history = await Storage.getHistory();
  const blob    = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
  const url     = URL.createObjectURL(blob);
  const a       = Object.assign(document.createElement('a'), {
    href: url,
    download: `french-practice-history-${new Date().toISOString().slice(0,10)}.json`
  });
  a.click();
  URL.revokeObjectURL(url);
  setStatus(histStatus, 'History exported.', 'ok');
});

// ── Clear history ───────────────────────────────────────────────────────────

btnClear.addEventListener('click', async () => {
  if (!window.confirm('Delete all history? This cannot be undone.')) return;
  await Storage.clearHistory();
  setStatus(histStatus, 'History cleared.', 'ok');
});
