/**
 * newtab.js  — ES module entry point
 */
import { mountTaskUI } from './lib/tasks.js';

const container = document.getElementById('fp-newtab-task');

try {
  const teardown = await mountTaskUI(container, {
    surface:    'newtab',
    onComplete: async () => {},
    onFeedback: ()       => {}
  });
  window.addEventListener('unload', teardown);
} catch (err) {
  container.innerHTML =
    `<p style="color:red;padding:24px">Error: ${err.message}</p>`;
  console.error('[FP newtab]', err);
}
