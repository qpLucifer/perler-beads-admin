import { message } from 'antd';

const FILTER_CORRECTION_STATS_KEY = 'admin:applied-filter-corrections';
const MAX_HISTORY_EVENTS = 1000;

function normalize(value) {
  if (value === '' || value === undefined) return null;
  return value;
}

export function collectFilterDiff(requested, applied) {
  if (!applied || typeof applied !== 'object') return [];
  return Object.keys(requested || {}).filter((key) => normalize(requested[key]) !== normalize(applied[key]));
}

export function notifyAppliedFilterDiff(label, requested, applied, lastSignatureRef) {
  const changedKeys = collectFilterDiff(requested, applied);
  if (!changedKeys.length) return;
  const signature = `${label}:${changedKeys.join(',')}:${JSON.stringify(applied)}`;
  if (lastSignatureRef?.current === signature) return;
  if (lastSignatureRef) lastSignatureRef.current = signature;
  message.warning(`${label}部分筛选值已被服务端修正：${changedKeys.join('、')}`);
  trackAppliedFilterCorrection(label, changedKeys);
}

export function syncAppliedFilters(requested, applied) {
  const changedKeys = collectFilterDiff(requested, applied);
  if (!changedKeys.length) return { changedKeys, nextFilters: null };

  const nextFilters = { ...requested };
  changedKeys.forEach((key) => {
    const targetValue = applied?.[key];
    if (targetValue === null || targetValue === undefined) {
      nextFilters[key] = typeof requested[key] === 'string' ? '' : undefined;
    } else {
      nextFilters[key] = targetValue;
    }
  });

  return { changedKeys, nextFilters };
}

export function applyAndNotifyAppliedFilters({
  label,
  requested,
  applied,
  lastSignatureRef,
  setFilters,
  setKeywordInput
}) {
  notifyAppliedFilterDiff(label, requested, applied, lastSignatureRef);
  const { nextFilters } = syncAppliedFilters(requested, applied);
  if (!nextFilters) return;
  setFilters(nextFilters);
  if (typeof setKeywordInput === 'function') {
    setKeywordInput(nextFilters.keyword || '');
  }
}

function readCorrectionStats() {
  try {
    const raw = localStorage.getItem(FILTER_CORRECTION_STATS_KEY);
    if (!raw) return { total: 0, byLabel: {}, byField: {}, updated_at: null, events: [] };
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object'
      ? { total: 0, byLabel: {}, byField: {}, updated_at: null, events: [], ...parsed }
      : { total: 0, byLabel: {}, byField: {}, updated_at: null, events: [] };
  } catch {
    return { total: 0, byLabel: {}, byField: {}, updated_at: null, events: [] };
  }
}

function writeCorrectionStats(stats) {
  try {
    localStorage.setItem(FILTER_CORRECTION_STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore quota / storage errors.
  }
}

function trackAppliedFilterCorrection(label, changedKeys) {
  const now = new Date().toISOString();
  const stats = readCorrectionStats();
  const next = {
    total: Number(stats.total || 0) + 1,
    byLabel: { ...(stats.byLabel || {}) },
    byField: { ...(stats.byField || {}) },
    updated_at: now,
    events: Array.isArray(stats.events) ? [...stats.events] : []
  };

  next.byLabel[label] = Number(next.byLabel[label] || 0) + 1;
  changedKeys.forEach((key) => {
    next.byField[key] = Number(next.byField[key] || 0) + 1;
  });
  next.events.push({ ts: now, label, fields: [...changedKeys] });
  if (next.events.length > MAX_HISTORY_EVENTS) {
    next.events = next.events.slice(next.events.length - MAX_HISTORY_EVENTS);
  }

  writeCorrectionStats(next);
}

export function getAppliedFilterCorrectionStats() {
  return readCorrectionStats();
}

export function clearAppliedFilterCorrectionStats() {
  writeCorrectionStats({ total: 0, byLabel: {}, byField: {}, updated_at: new Date().toISOString(), events: [] });
}
