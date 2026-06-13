(function (global) {
  function normalizeClassNames(value) {
    return String(value || "")
      .split(/\s+/)
      .filter(Boolean);
  }

  function setSource(image, src, fallbackClassName = "asset-fallback") {
    if (!image) return null;
    if (image.dataset.assetSrc === src) return image;

    image.dataset.assetSrc = src || "";
    image.hidden = false;
    image.parentElement?.classList.remove(fallbackClassName, "asset-ready");

    image.onload = () => {
      image.hidden = false;
      image.parentElement?.classList.remove(fallbackClassName);
      image.parentElement?.classList.add("asset-ready");
    };
    image.onerror = () => {
      image.hidden = true;
      image.parentElement?.classList.remove("asset-ready");
      image.parentElement?.classList.add(fallbackClassName);
      console.warn(`[美术资源] 加载失败，已回退到 CSS 表现：${src}`);
    };
    image.src = src || "";
    return image;
  }

  function create(options = {}) {
    const image = document.createElement("img");
    normalizeClassNames(options.className).forEach((className) => image.classList.add(className));
    image.alt = options.alt || "";
    image.decoding = "async";
    image.draggable = false;
    if (!options.alt) image.setAttribute("aria-hidden", "true");
    setSource(image, options.src, options.fallbackClassName);
    return image;
  }

  function mount(host, options = {}) {
    if (!host) return null;
    const selector = options.selector || "img[data-safe-image]";
    let image = host.querySelector(selector);
    if (!image) {
      image = create(options);
      image.dataset.safeImage = "";
      host.prepend(image);
    } else {
      normalizeClassNames(options.className).forEach((className) => image.classList.add(className));
      setSource(image, options.src, options.fallbackClassName);
    }
    return image;
  }

  global.SafeImage = { create, mount, setSource };
})(typeof window !== "undefined" ? window : globalThis);
