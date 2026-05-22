/**
 * history.js  — ES module entry point
 */
import * as Storage      from './lib/storage.js';
import { renderMarkdown } from './lib/markdown.js';

const listEl    = document.getElementById('fp-hist-list');
const btnExport = document.getElementById('btn-export');
const btnClear  = document.getElementById('btn-clear');

// ─── Render list ────────────────────────────────────────────────────────────

async function render() {
  const history = await Storage.getHistory();
  listEl.innerHTML = '';

  if (!history || history.length === 0) {
    listEl.innerHTML =
      '<div class="fp-hist-empty">No history yet. Complete a task to see it here.</div>';
    return;
  }

  history.forEach(entry => listEl.appendChild(buildEntryEl(entry)));
}

function buildEntryEl(entry) {
  const wrap = document.createElement('div');
  wrap.className = 'fp-hist-entry';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'fp-hist-entry-header';
  hdr.appendChild(Object.assign(document.createElement('span'), {
    className:   'fp-hist-date',
    textContent: entry.date || 'Unknown date'
  }));
  hdr.appendChild(Object.assign(document.createElement('span'), {
    className:   `fp-hist-type ${entry.taskType || 'skipped'}`,
    textContent: entry.taskType || 'skipped'
  }));
  const statusEl = document.createElement('span');
  statusEl.className   = entry.status === 'skipped' ? 'fp-hist-status-skipped' : 'fp-hist-status-done';
  statusEl.textContent = entry.status === 'skipped' ? '⏭ Skipped' : '✅ Done';
  hdr.appendChild(statusEl);
  wrap.appendChild(hdr);

  // Title
  if (entry.taskTitle || entry.grammarFocus) {
    wrap.appendChild(Object.assign(document.createElement('div'), {
      className:   'fp-hist-title',
      textContent: entry.taskTitle || `Translation — ${entry.grammarFocus}`
    }));
  }

  // Content
  if (entry.content) {
    if (typeof entry.content === 'string') {
      wrap.appendChild(Object.assign(document.createElement('pre'), {
        className:   'fp-hist-content',
        textContent: entry.content
      }));
    } else if (Array.isArray(entry.content)) {
      const ul = document.createElement('ul');
      ul.className = 'fp-hist-translations';
      entry.content.forEach((ans, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${i + 1}.</strong> ${esc(ans || '—')}`;
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
    }
  }

  // Feedback toggle
  if (entry.feedback) {
    const toggleBtn = Object.assign(document.createElement('button'), {
      className:   'fp-hist-feedback-toggle',
      textContent: 'Show feedback'
    });
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className    = 'fp-hist-feedback';
    feedbackDiv.style.display = 'none';
    feedbackDiv.innerHTML    = renderMarkdown(entry.feedback);

    toggleBtn.addEventListener('click', () => {
      const showing = feedbackDiv.style.display !== 'none';
      feedbackDiv.style.display = showing ? 'none' : 'block';
      toggleBtn.textContent     = showing ? 'Show feedback' : 'Hide feedback';
    });

    wrap.appendChild(toggleBtn);
    wrap.appendChild(feedbackDiv);
  }

  return wrap;
}

// ─── Export ─────────────────────────────────────────────────────────────────

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
});

// ─── Clear ──────────────────────────────────────────────────────────────────

btnClear.addEventListener('click', async () => {
  if (!window.confirm('Delete all history? This cannot be undone.')) return;
  await Storage.clearHistory();
  await render();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Init ────────────────────────────────────────────────────────────────────

await render();
