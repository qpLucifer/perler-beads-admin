export function readListState(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeListState(storageKey, state) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state || {}));
  } catch {
    // Ignore storage write errors (private mode / quota).
  }
}

export function clearListState(storageKey) {
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage remove errors.
  }
}
