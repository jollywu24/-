(function (global) {
  function wait(ms) {
    return new Promise((resolve) => global.setTimeout(resolve, ms));
  }

  function pulseElement(element, className = "flash") {
    if (!element) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }

  function playArtVfx(element, className, duration = 1250) {
    if (!element || !element.complete || element.naturalWidth === 0) return;
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    global.setTimeout(() => element.classList.remove(className), duration);
  }

  function animateValue(from, to, duration, onUpdate) {
    const start = global.performance.now();
    return new Promise((resolve) => {
      function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        onUpdate(from + (to - from) * eased, progress);
        if (progress < 1) {
          global.requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }
      global.requestAnimationFrame(tick);
    });
  }

  function animateTextNumber(element, from, to, duration, format) {
    return animateValue(from, to, duration, (value) => {
      element.textContent = format(value);
    });
  }

  const api = { wait, pulseElement, playArtVfx, animateValue, animateTextNumber };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  global.GameAnimations = api;
})(typeof window !== "undefined" ? window : globalThis);
