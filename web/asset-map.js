(function (global) {
  const base = "../public/assets/ui";
  const path = (folder, file) => `${base}/${folder}/${file}`;

  const assets = {
    redEye: {
      inactive: path("red-eye", "red_eye_inactive.png"),
      active: path("red-eye", "red_eye_active.png"),
      trigger: path("red-eye", "red_eye_trigger.png"),
      burst: path("red-eye", "red_eye_burst.png")
    },
    stressEye: {
      cold: path("stress-eye", "stress_eye_cold.png"),
      hot: path("stress-eye", "stress_eye_hot.png"),
      redEye: path("stress-eye", "stress_eye_red.png"),
      overload: path("stress-eye", "stress_eye_overload.png")
    },
    surge: {
      cardBack: path("surge", "surge_card_back.png"),
      cardFaceTemplate: path("surge", "surge_card_face_template.png"),
      revealGlow: path("surge", "surge_reveal_glow.png"),
      unknownBack: path("surge", "surge_unknown_back.png")
    },
    cards: {
      deckBack: path("cards", "deck_back.png")
    },
    joker: {
      frame: path("joker", "joker_frame.png"),
      portraitFallback: path("joker", "joker_portrait_fallback.png")
    },
    fx: {
      redBeam: path("fx", "red_beam.png"),
      ember: path("fx", "ember.png"),
      multiplierBurst: path("fx", "multiplier_burst.png"),
      cardFlipGlow: path("fx", "card_flip_glow.png")
    },
    panel: {
      gameTable: path("panel", "game_table_bg.png"),
      leftPanelBg: path("panel", "left_panel_bg.png"),
      rightPanelBg: path("panel", "right_panel_bg.png"),
      tableBg: path("panel", "table_bg.png"),
      handAreaBg: path("panel", "hand_area_bg.png"),
      jokerRowBg: path("panel", "joker_row_bg.png")
    }
  };

  global.GameAssets = Object.freeze(assets);
})(typeof window !== "undefined" ? window : globalThis);
