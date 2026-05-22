/**
 * popup.js  — ES module entry point
 */
import { mountTaskUI } from './lib/tasks.js';

const container = document.getElementById('fp-popup-task');

try {
  const teardown = await mountTaskUI(container, {
    surface:    'popup',
    onComplete: async () => {},
    onFeedback: ()       => {}
  });
  window.addEventListener('unload', teardown);
} catch (err) {
  container.innerHTML =
    `<p style="color:red;padding:16px">Error: ${err.message}</p>`;
  console.error('[FP popup]', err);
}
