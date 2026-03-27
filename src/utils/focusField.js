export function scrollAndFlashFocusField(focusField) {
  if (!focusField) return () => {};

  const timer = setTimeout(() => {
    const el = document.querySelector(`[data-focus-field="${focusField}"]`);
    if (!el) return;

    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const target = el;
    const prevBoxShadow = target.style.boxShadow;
    const prevTransition = target.style.transition;
    target.style.transition = 'box-shadow 0.2s ease';
    target.style.boxShadow = '0 0 0 3px rgba(250, 173, 20, 0.45)';

    setTimeout(() => {
      target.style.boxShadow = prevBoxShadow;
      target.style.transition = prevTransition;
    }, 1500);
  }, 100);

  return () => clearTimeout(timer);
}
