(function (global) {
  const validPhases = new Set(["hidden", "flying", "flipping", "revealed"]);

  function create(options = {}) {
    const root = document.createElement("div");
    root.className = "surge-reveal-card surge-card-view";
    root.innerHTML = `
      <div class="surge-reveal-glow" aria-hidden="true"></div>
      <div class="surge-card-face playing-card ${options.colorClass || "black"}">
        <div class="surge-card-face-art" aria-hidden="true"></div>
        <div class="surge-card-content"></div>
        <div class="surge-card-value" aria-hidden="true"></div>
        <div class="surge-card-hype" aria-hidden="true"></div>
      </div>
      <div class="surge-card-back">
        <div class="surge-card-back-art" aria-hidden="true"></div>
        <span class="skull" aria-hidden="true">☠</span>
      </div>
    `;

    const assets = global.GameAssets?.surge || {};
    global.SafeImage?.mount(root.querySelector(".surge-card-face-art"), {
      src: assets.cardFaceTemplate,
      className: "surge-asset-image"
    });
    global.SafeImage?.mount(root.querySelector(".surge-card-back-art"), {
      src: assets.cardBack || assets.unknownBack,
      className: "surge-asset-image"
    });
    global.SafeImage?.mount(root.querySelector(".surge-reveal-glow"), {
      src: assets.revealGlow,
      className: "surge-glow-image"
    });

    update(root, options);
    return root;
  }

  function update(root, options = {}) {
    if (!root) return;
    const phase = validPhases.has(options.phase) ? options.phase : "hidden";
    root.dataset.phase = phase;
    root.classList.toggle("is-face-up", phase === "revealed");
    root.classList.toggle("is-flipping", phase === "flipping");
    root.classList.toggle("is-revealed", phase === "revealed");

    const content = root.querySelector(".surge-card-content");
    if (content && options.faceMarkup !== undefined) content.innerHTML = options.faceMarkup || "";

    const value = root.querySelector(".surge-card-value");
    const hype = root.querySelector(".surge-card-hype");
    const canReveal = phase === "revealed";
    value.textContent = canReveal && options.value !== undefined ? `+${options.value}` : "";
    hype.textContent = canReveal && options.hypeValue !== undefined ? `上头 +${options.hypeValue}` : "";
  }

  global.SurgeCardView = { create, update };
})(typeof window !== "undefined" ? window : globalThis);
