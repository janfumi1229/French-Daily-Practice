/**
 * background.js — Manifest V3 service worker
 * Responsibilities:
 *  1. Schedule a chrome.alarm for next local midnight to reset the daily task
 *  2. On startup, check if we've crossed midnight and reset if needed
 *  3. Listen for the daily alarm and reset storage
 */

'use strict';

const ALARM_NAME      = 'fp-midnight-reset';
const STORAGE_KEY     = 'fpToday';
const STORAGE_HISTORY = 'fpHistory';

// ─── Helpers ───────────────────────────────────────────────────────────────

function localDateString() {
  const d   = new Date();
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Milliseconds until next local midnight. */
function msUntilMidnight() {
  const now  = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  return next.getTime() - now.getTime();
}

async function getToday() {
  const r = await chrome.storage.local.get(STORAGE_KEY);
  return r[STORAGE_KEY] || null;
}

async function clearTodayIfStale() {
  const today = await getToday();
  if (!today) return;
  const dateStr = localDateString();
  if (today.date !== dateStr) {
    console.log('[FP background] Date changed — clearing stale task state');
    await chrome.storage.local.remove(STORAGE_KEY);
  }
}

async function scheduleMidnightAlarm() {
  // Clear any existing alarm first
  await chrome.alarms.clear(ALARM_NAME);
  const ms = msUntilMidnight();
  // chrome.alarms.create takes delayInMinutes
  const delayInMinutes = ms / 60000;
  chrome.alarms.create(ALARM_NAME, { delayInMinutes });
  console.log(`[FP background] Midnight alarm set for ${(delayInMinutes / 60).toFixed(2)}h from now`);
}

// ─── Event listeners ───────────────────────────────────────────────────────

/** On install / update — set up first alarm. */
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[FP background] onInstalled — scheduling midnight alarm');
  await scheduleMidnightAlarm();
});

/** On browser startup — check for stale state and reschedule alarm. */
chrome.runtime.onStartup.addListener(async () => {
  console.log('[FP background] onStartup — checking date');
  await clearTodayIfStale();
  await scheduleMidnightAlarm();
});

/** When the midnight alarm fires — clear today's state and reschedule. */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  console.log('[FP background] Midnight alarm fired — resetting daily task');
  await chrome.storage.local.remove(STORAGE_KEY);
  // Schedule next midnight alarm
  await scheduleMidnightAlarm();
});
