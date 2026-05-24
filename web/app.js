const targetCurve = [100, 300, 900, 3000, 10000, 32000, 95000, 280000];
    const slotCount = 5;
    const EVENTS = {
      ON_RESOLVE: "ON_RESOLVE",
      ON_EXPLODE: "ON_EXPLODE",
      ON_HIGH_PRESSURE: "ON_HIGH_PRESSURE"
    };
    const triggerLabels = {
      ON_RESOLVE: "结算触发",
      ON_EXPLODE: "爆炸触发",
      ON_HIGH_PRESSURE: "红区触发"
    };
    const PHASES = {
      kinetic: { name: "动能", icon: "⚙", color: "#f0a349" },
      pulse: { name: "脉冲", icon: "⚡", color: "#55d8ff" },
      thermal: { name: "热熔", icon: "▲", color: "#ff6d4a" },
      toxic: { name: "腐蚀", icon: "☣", color: "#63e47d" }
    };
    const { SEQUENCES, evaluateIgnitionSequence, applyIgnitionSequence, createRunState, resolveModule, currentRunProfit, simulatePreview: simulatePreviewCore } = window.GameLogic;

    const catalog = [
      {
        id: "coil",
        name: "高压涡轮",
        tag: "异化",
        kind: "greed",
        phase: "kinetic",
        trigger: EVENTS.ON_RESOLVE,
        desc: "压力越高，倍率越凶。",
        meta: "压力 +20  倍率 x(压力x0.10)",
        style: ["#412412", "#130f0b", "#f0a349", "#eaa84c", "#9b5523"],
        icon: "turbine",
        apply(run) {
          run.pressure += 20;
          const factor = Math.max(1.05, run.pressure * 0.1);
          run.multiplier *= factor;
          return `涡轮咬合：倍率 x${factor.toFixed(1)}，压力 +20`;
        },
        preview(run) {
          run.pressure += 20;
          run.multiplier *= Math.max(1.05, run.pressure * 0.1);
        }
      },
      {
        id: "coolant",
        name: "冷却液",
        tag: "稳定",
        kind: "stable",
        phase: "toxic",
        trigger: EVENTS.ON_RESOLVE,
        desc: "大量降低压力。",
        meta: "压力 -50",
        style: ["#18351d", "#0d1510", "#63e47d", "#77db7c", "#3e8d50"],
        icon: "canister",
        apply(run) {
          const before = run.pressure;
          run.pressure = Math.max(0, run.pressure - 50);
          return `冷却液注入：压力 ${formatSigned(run.pressure - before)}`;
        },
        preview(run) {
          run.pressure = Math.max(0, run.pressure - 50);
        }
      },
      {
        id: "stabilizer",
        name: "稳压器",
        tag: "稳定",
        kind: "stable",
        phase: "pulse",
        trigger: EVENTS.ON_RESOLVE,
        desc: "先稳住，再榨钱。",
        meta: "压力 -28  基础收益 +90",
        style: ["#182f34", "#0b1316", "#5dd3dc", "#61d1da", "#2f848a"],
        icon: "dial",
        apply(run) {
          run.pressure = Math.max(0, run.pressure - 28);
          run.base += 90;
          return "稳压器锁定：压力 -28，基础收益 +90";
        },
        preview(run) {
          run.pressure = Math.max(0, run.pressure - 28);
          run.base += 90;
        }
      },
      {
        id: "fuse",
        name: "熔断器",
        tag: "防御",
        kind: "stable",
        phase: "pulse",
        trigger: EVENTS.ON_RESOLVE,
        guardTrigger: EVENTS.ON_EXPLODE,
        desc: "防爆一次，但会烧毁。",
        meta: "压力 +8  防爆 x1",
        style: ["#26323a", "#0d1012", "#56c2ea", "#76d4ea", "#2a7692"],
        icon: "skull",
        apply(run) {
          run.pressure += 8;
          run.fuses += 1;
          return "熔断器接入：压力 +8，防爆 x1";
        },
        preview(run) {
          run.pressure += 8;
          run.fuses += 1;
        }
      },
      {
        id: "loan",
        name: "高利贷",
        tag: "赌狗",
        kind: "greed",
        phase: "thermal",
        trigger: EVENTS.ON_RESOLVE,
        desc: "本轮暴涨，下轮更烫。",
        meta: "倍率 x5  下轮基础压力 +30",
        style: ["#3e2510", "#150d08", "#ffb348", "#f2a545", "#ad5a25"],
        icon: "coin",
        apply(run) {
          run.multiplier *= 5;
          run.nextDebt += 30;
          run.pressure += 10;
          return "高利贷到账：倍率 x5，下轮基础压力 +30";
        },
        preview(run) {
          run.multiplier *= 5;
          run.nextDebt += 30;
          run.pressure += 10;
        }
      },
      {
        id: "overclock",
        name: "超频器",
        tag: "赌狗",
        kind: "greed",
        phase: "thermal",
        trigger: EVENTS.ON_RESOLVE,
        desc: "压力越接近红区，收益越高。",
        meta: "压力 +18  倍率 +(压力/22)",
        style: ["#37221e", "#150d0c", "#ff6d4a", "#f07a4b", "#a54434"],
        icon: "bolt",
        apply(run) {
          run.pressure += 18;
          const boost = Math.max(1.2, 1 + run.pressure / 22);
          run.multiplier *= boost;
          return `超频启动：倍率 x${boost.toFixed(1)}，压力 +18`;
        },
        preview(run) {
          run.pressure += 18;
          run.multiplier *= Math.max(1.2, 1 + run.pressure / 22);
        }
      },
      {
        id: "blackbox",
        name: "黑箱",
        tag: "混沌",
        kind: "chaos",
        phase: "toxic",
        trigger: EVENTS.ON_RESOLVE,
        desc: "你看不见里面的齿轮。",
        meta: "压力 +0~60  倍率 x0.8~3.8",
        style: ["#2b2534", "#100f13", "#b36cf0", "#ba73f6", "#6e4491"],
        icon: "box",
        apply(run) {
          const pressure = randInt(0, 60);
          const factor = randFloat(0.8, 3.8);
          run.pressure += pressure;
          run.multiplier *= factor;
          return `黑箱展开：倍率 x${factor.toFixed(1)}，压力 +${pressure}`;
        },
        preview(run) {
          run.pressure += 30;
          run.multiplier *= 2.2;
          run.risk += 18;
        }
      },
      {
        id: "unknown",
        name: "薛定谔模块",
        tag: "混沌",
        kind: "chaos",
        phase: "pulse",
        trigger: EVENTS.ON_RESOLVE,
        desc: "可能是神，也可能是雷。",
        meta: "压力 -20~+80  倍率 x0.4~6",
        style: ["#352042", "#130d19", "#c463ff", "#c16df7", "#7e419f"],
        icon: "unknown",
        apply(run) {
          const pressure = randInt(-20, 80);
          const factor = randFloat(0.4, 6);
          run.pressure = Math.max(0, run.pressure + pressure);
          run.multiplier *= factor;
          return `薛定谔坍缩：倍率 x${factor.toFixed(1)}，压力 ${formatSigned(pressure)}`;
        },
        preview(run) {
          run.pressure += 30;
          run.multiplier *= 3.2;
          run.risk += 30;
        }
      },
      {
        id: "redline",
        name: "红区增压器",
        tag: "赌狗",
        kind: "greed",
        phase: "thermal",
        trigger: EVENTS.ON_RESOLVE,
        thresholdTrigger: EVENTS.ON_HIGH_PRESSURE,
        desc: "站在红线里才够甜。",
        meta: "压力 +35  红区倍率 x4",
        style: ["#421714", "#150a08", "#ff563f", "#ff6a4b", "#a8362b"],
        icon: "gauge",
        apply(run) {
          run.pressure += 35;
          const factor = run.pressure >= 70 ? 4 : 1.35;
          run.multiplier *= factor;
          return `红区增压：倍率 x${factor.toFixed(1)}，压力 +35`;
        },
        preview(run) {
          run.pressure += 35;
          run.multiplier *= run.pressure >= 70 ? 4 : 1.35;
        }
      },
      {
        id: "ember",
        name: "余烬保险",
        tag: "防御",
        kind: "stable",
        phase: "kinetic",
        trigger: EVENTS.ON_RESOLVE,
        guardTrigger: EVENTS.ON_EXPLODE,
        desc: "爆了也能捞回一点。",
        meta: "压力 +12  熔毁保留 50%",
        style: ["#1b3340", "#0b1215", "#55d8ff", "#5ad0ec", "#2f8198"],
        icon: "shield",
        apply(run) {
          run.pressure += 12;
          run.insurance = true;
          return "余烬保险生效：压力 +12，熔毁保留 50%";
        },
        preview(run) {
          run.pressure += 12;
          run.insurance = true;
        }
      }
    ];

    const state = {
      cash: 0,
      pressure: 0,
      round: 1,
      best: Number(localStorage.getItem("abyss-best") || 0),
      baseDebt: 0,
      hand: [],
      slots: Array(slotCount).fill(null),
      selected: null,
      settling: false,
      sound: true,
      log: []
    };

    const els = {
      cash: document.getElementById("cash"),
      target: document.getElementById("target"),
      targetMeta: document.getElementById("targetMeta"),
      round: document.getElementById("round"),
      best: document.getElementById("best"),
      pressure: document.getElementById("pressure"),
      needle: document.getElementById("needle"),
      slots: document.getElementById("slots"),
      rack: document.getElementById("rack"),
      pull: document.getElementById("pullButton"),
      refresh: document.getElementById("refreshButton"),
      log: document.getElementById("log"),
      previewProfit: document.getElementById("previewProfit"),
      previewPressure: document.getElementById("previewPressure"),
      previewRisk: document.getElementById("previewRisk"),
      multiplierDisplay: document.getElementById("multiplierDisplay"),
      baseDisplay: document.getElementById("baseDisplay"),
      voltDisplay: document.getElementById("voltDisplay"),
      profitDisplay: document.getElementById("profitDisplay"),
      yieldBoost: document.getElementById("yieldBoost"),
      chainGain: document.getElementById("chainGain"),
      overloadGain: document.getElementById("overloadGain"),
      chainText: document.getElementById("chainText"),
      pressureTrend: document.getElementById("pressureTrend"),
      overlay: document.getElementById("overlay"),
      modalTitle: document.getElementById("modalTitle"),
      modalBody: document.getElementById("modalBody"),
      restart: document.getElementById("restartButton"),
      continue: document.getElementById("continueButton"),
      toast: document.getElementById("toast"),
      sound: document.getElementById("soundButton"),
      reset: document.getElementById("settingsButton"),
      help: document.getElementById("helpButton"),
      codex: document.getElementById("codexButton")
    };

    let audioContext;
    let toastTimer;
    let rackClickTimer;

    function init() {
      detectEffectBackground();
      createSlots();
      newRound(true);
      bindEvents();
      render();
    }

    function detectEffectBackground() {
      const forced = new URLSearchParams(window.location.search).get("bg");
      if (forced) {
        setEffectBackground(forced === "1" ? "effect-bg.png" : forced);
        return;
      }
      const candidates = ["effect-bg.png", "effect-bg.jpg", "abyss-effect.png", "abyss-effect.jpg"];
      for (const src of candidates) {
        const image = new Image();
        image.onload = () => {
          if (document.body.classList.contains("bg-mode")) return;
          setEffectBackground(src);
        };
        image.src = `${src}?v=${Date.now()}`;
      }
    }

    function setEffectBackground(src) {
      document.documentElement.style.setProperty("--effect-bg", `url("${src}")`);
      document.body.classList.add("bg-mode");
      render();
    }

    function bindEvents() {
      els.pull.addEventListener("click", pullLever);
      els.refresh.addEventListener("click", () => {
        if (state.settling) return;
        drawHand();
        state.slots = Array(slotCount).fill(null);
        state.selected = null;
        logLine("换了一组模块。", "warn");
        render();
      });
      els.restart.addEventListener("click", restartGame);
      els.continue.addEventListener("click", () => els.overlay.classList.remove("show"));
      els.sound.addEventListener("click", () => {
        state.sound = !state.sound;
        toast(state.sound ? "音效已接入。" : "音效已断开。");
      });
      els.reset.addEventListener("click", restartGame);
      els.help.addEventListener("click", () => {
        toast("目标会指数增长。稳玩会断流，贪多会熔毁。");
      });
      els.codex.addEventListener("click", () => {
        toast("当前版本只有 10 张模块，所有东西都围着红区压力转。");
      });

      window.addEventListener("keydown", (event) => {
        if (event.code === "Space") {
          event.preventDefault();
          if (!state.settling) pullLever();
        }
        if (event.key.toLowerCase() === "r") {
          event.preventDefault();
          els.refresh.click();
        }
        if (event.key === "Escape") {
          state.selected = null;
          render();
        }
      });
    }

    function createSlots() {
      els.slots.innerHTML = "";
      for (let i = 0; i < slotCount; i += 1) {
        const wrap = document.createElement("div");
        wrap.className = "slot-wrap";
        wrap.innerHTML = `
          <div class="slot-label">槽位 ${i + 1}</div>
          <div class="slot empty" data-slot="${i}" aria-label="槽位 ${i + 1}"></div>
        `;
        const slot = wrap.querySelector(".slot");
        slot.addEventListener("dragover", onSlotDragOver);
        slot.addEventListener("dragleave", onSlotDragLeave);
        slot.addEventListener("drop", onSlotDrop);
        slot.addEventListener("click", () => onSlotClick(i));
        els.slots.appendChild(wrap);
      }
    }

    function newRound(first = false) {
      state.slots = Array(slotCount).fill(null);
      state.selected = null;
      drawHand();
      if (first) {
        logLine("引擎上线：第 1 轮目标 ¥100。");
      } else {
        logLine(`进入第 ${state.round} 轮，目标 ${money(currentTarget())}。`);
      }
    }

    function drawHand() {
      const pool = shuffle([...catalog]);
      const greedBias = state.round >= 3 ? pool.filter((m) => m.kind !== "stable") : [];
      state.hand = [];
      while (state.hand.length < slotCount) {
        const source = greedBias.length && Math.random() < 0.35 ? greedBias : pool;
        const picked = source.splice(randInt(0, source.length - 1), 1)[0] || pool.pop();
        state.hand.push(makeInstance(picked));
      }
    }

    function makeInstance(module) {
      return {
        uid: `${module.id}-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2)}`,
        ...module
      };
    }

    function render() {
      els.cash.textContent = money(state.cash);
      els.target.textContent = money(currentTarget());
      els.round.textContent = `${state.round} / ${targetCurve.length}`;
      els.best.textContent = String(state.best);
      els.targetMeta.textContent = state.cash >= currentTarget() ? "达标，继续榨" : "本轮必须达成";
      renderPressure(state.pressure);
      renderSlots();
      renderRack();
      renderLog();
      renderPreview();
      renderEngine();

      const hasModule = state.slots.some(Boolean);
      els.pull.disabled = state.settling || !hasModule;
      els.refresh.disabled = state.settling;
      document.body.classList.toggle("settling", state.settling);
      document.body.classList.toggle("critical", state.pressure >= 80 && !state.settling);
    }

    function renderPressure(value) {
      const clamped = Math.max(0, Math.min(120, value));
      const angle = 235 + (clamped / 120) * 142;
      els.needle.style.setProperty("--needle", `${angle}deg`);
      els.pressure.textContent = String(Math.round(value));
    }

    function renderSlots(active = -1) {
      const nodes = [...els.slots.querySelectorAll(".slot")];
      nodes.forEach((slot, index) => {
        slot.className = "slot";
        slot.dataset.slot = String(index);
        slot.innerHTML = "";
        if (active === index) slot.classList.add("active");
        const item = state.slots[index];
        if (!item) {
          slot.classList.add("empty");
        } else {
          slot.appendChild(createCard(item, "slot"));
        }
      });
    }

    function renderRack() {
      els.rack.innerHTML = "";
      const unused = state.hand.filter((card) => !state.slots.some((slot) => slot && slot.uid === card.uid));
      if (!unused.length) {
        const empty = document.createElement("div");
        empty.className = "run-meta";
        empty.textContent = "5 个模块已全部装入槽位。";
        els.rack.appendChild(empty);
        return;
      }

      unused.forEach((module) => {
        els.rack.appendChild(createCard(module, "rack"));
      });
    }

    function renderLog() {
      els.log.innerHTML = state.log.map((entry) => `<div class="${entry.type || ""}">${entry.text}</div>`).join("");
      els.log.scrollTop = els.log.scrollHeight;
    }

    function renderPreview() {
      const preview = simulatePreview();
      els.previewProfit.textContent = money(preview.profit);
      els.previewPressure.textContent = `${Math.round(preview.pressure)} / ${preview.limit || 100}`;
      els.previewRisk.textContent = preview.riskText;
    }

    function renderEngine() {
      const preview = simulatePreview();
      const filled = state.slots.filter(Boolean).length;
      const multiplier = state.slots.some(Boolean) ? preview.multiplier : 1;
      const base = state.slots.some(Boolean) ? preview.base : baseProfit();
      const profit = state.slots.some(Boolean) ? preview.profit : 0;
      if (els.multiplierDisplay) els.multiplierDisplay.textContent = `x${multiplier.toFixed(2)}`;
      if (els.baseDisplay) els.baseDisplay.textContent = `${Math.round(base)} A`;
      if (els.voltDisplay) els.voltDisplay.textContent = `x${multiplier.toFixed(2)}`;
      if (els.profitDisplay) els.profitDisplay.textContent = money(profit);
      if (els.yieldBoost) els.yieldBoost.textContent = `+${Math.max(0, Math.round((multiplier - 1) * 100))}%`;
      if (els.chainGain) els.chainGain.textContent = preview.sequence ? preview.sequence.name : "未点火";
      if (els.overloadGain) els.overloadGain.textContent = `+${Math.max(0, (preview.pressure / 34).toFixed(2))}`;
      if (els.chainText) els.chainText.textContent = `${filled} / ${slotCount}`;
      if (els.pressureTrend) els.pressureTrend.textContent = formatSigned(Math.round(preview.pressure - state.pressure));
      document.querySelectorAll(".chain-track i").forEach((segment, index) => {
        segment.classList.toggle("lit", index < filled);
      });
      document.documentElement.style.setProperty("--chain-fill", `${filled / slotCount}`);
      document.documentElement.style.setProperty("--engine-heat", `${Math.min(1, Math.max(0, preview.pressure / 100))}`);
    }

    function createCard(module, location) {
      const card = document.createElement("article");
      card.className = `card ${location === "rack" ? "in-rack" : ""}`;
      card.draggable = !state.settling;
      card.dataset.uid = module.uid;
      card.style.setProperty("--card-a", module.style[0]);
      card.style.setProperty("--card-b", module.style[1]);
      card.style.setProperty("--icon", module.style[2]);
      card.style.setProperty("--name", module.style[3]);
      card.style.setProperty("--card-border", module.style[4]);
      card.style.setProperty("--card-glow", `${module.style[2]}44`);
      card.style.setProperty("--phase", phaseInfo(module).color);
      if (state.selected === module.uid) card.classList.add("selected");

      card.innerHTML = `
        <div class="module-icon">${iconSvg(module.icon)}</div>
        <div>
          <div class="phase-badge">${phaseInfo(module).icon} ${phaseInfo(module).name}</div>
          <h3 class="module-name">${module.name}<span class="tag">${module.tag}</span></h3>
          <p class="module-desc">${module.desc}</p>
          <div class="module-meta">${module.meta}</div>
          <div class="module-trigger">${moduleTriggerText(module)}</div>
        </div>
      `;

      card.addEventListener("dragstart", (event) => {
        if (state.settling) return;
        event.dataTransfer.setData("text/plain", module.uid);
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", () => card.classList.remove("dragging"));
      card.addEventListener("click", (event) => {
        event.stopPropagation();
        if (state.settling) return;
        if (location === "slot") {
          unplaceModule(module.uid);
          return;
        }
        if (location === "rack") {
          clearTimeout(rackClickTimer);
          rackClickTimer = setTimeout(() => {
            state.selected = state.selected === module.uid ? null : module.uid;
            render();
          }, 220);
          return;
        }
        state.selected = state.selected === module.uid ? null : module.uid;
        render();
      });
      if (location === "rack") {
        card.addEventListener("dblclick", (event) => {
          event.stopPropagation();
          if (state.settling) return;
          clearTimeout(rackClickTimer);
          const firstEmpty = state.slots.findIndex((slot) => !slot);
          if (firstEmpty === -1) {
            toast("卡槽已满，可单击已装模块卸载。");
            return;
          }
          placeModule(module.uid, firstEmpty);
        });
      }
      return card;
    }

    function phaseInfo(module) {
      return PHASES[module.phase] || PHASES.kinetic;
    }

    function moduleTriggerText(module) {
      const labels = [triggerLabels[module.trigger || EVENTS.ON_RESOLVE]];
      if (module.guardTrigger) labels.push(triggerLabels[module.guardTrigger]);
      if (module.thresholdTrigger) labels.push(triggerLabels[module.thresholdTrigger]);
      return labels.filter(Boolean).join(" / ");
    }

    function onSlotDragOver(event) {
      event.preventDefault();
      event.currentTarget.classList.add("drop-ready");
    }

    function onSlotDragLeave(event) {
      event.currentTarget.classList.remove("drop-ready");
    }

    function onSlotDrop(event) {
      event.preventDefault();
      const index = Number(event.currentTarget.dataset.slot);
      const uid = event.dataTransfer.getData("text/plain");
      event.currentTarget.classList.remove("drop-ready");
      placeModule(uid, index);
    }

    function onSlotClick(index) {
      if (state.settling) return;
      if (state.selected) {
        placeModule(state.selected, index);
        return;
      }
      if (state.slots[index]) {
        state.selected = state.slots[index].uid;
        render();
      }
    }

    function placeModule(uid, index) {
      const module = state.hand.find((card) => card.uid === uid);
      if (!module) return;

      const oldIndex = state.slots.findIndex((card) => card && card.uid === uid);
      if (oldIndex !== -1) state.slots[oldIndex] = null;

      const displaced = state.slots[index];
      state.slots[index] = module;
      if (displaced && oldIndex !== -1) {
        state.slots[oldIndex] = displaced;
      }
      state.selected = null;
      tick(160, 0.035, "triangle");
      render();
    }

    function unplaceModule(uid) {
      const slotIndex = state.slots.findIndex((card) => card && card.uid === uid);
      if (slotIndex === -1) return;
      state.slots[slotIndex] = null;
      state.selected = null;
      tick(128, 0.03, "square");
      render();
    }

    async function pullLever() {
      if (state.settling) return;
      if (!state.slots.some(Boolean)) {
        toast("至少装入一个模块。");
        return;
      }

      state.settling = true;
      els.overlay.classList.remove("show");
      logLine(`第 ${state.round} 轮拉杆下压。`, "warn");
      tick(96, 0.05, "sawtooth");
      render();

      const run = createRunState(state, baseProfit());
      const sequence = evaluateIgnitionSequence(state.slots);
      applyIgnitionSequence(run, sequence);
      logLine(`点火序列：${sequence.name}，基础 +${sequence.base}，倍率 x${sequence.mult.toFixed(2)}${sequence.limit ? `，红线 +${sequence.limit}` : ""}。`, sequence.limit ? "warn" : "");

      if (state.baseDebt > 0) {
        logLine(`旧债点火：基础压力 +${state.baseDebt}`, "danger");
        await animatePressure(state.pressure, run.pressure);
      }

      for (let index = 0; index < state.slots.length; index += 1) {
        const module = state.slots[index];
        if (!module) continue;
        renderSlots(index);
        tick(180 + index * 34, 0.06, index % 2 ? "square" : "sawtooth");
        await wait(470);

        const beforePressure = run.pressure;
        const beforeProfit = currentRunProfit(run);
        const beforeBase = run.base;
        const beforeMult = run.multiplier;
        const message = resolveModule(module, run);
        const afterProfit = currentRunProfit(run);
        const afterBase = run.base;
        const afterMult = run.multiplier;

        logLine(`槽位 ${index + 1}：${message}`, run.pressure >= 80 ? "danger" : "");
        if (beforePressure < 80 && run.pressure >= 80) {
          run.redlineTrips += 1;
          logLine(`ON_HIGH_PRESSURE：压力越过 80，红区警报接管。`, "danger");
        }
        await Promise.all([
          animatePressure(beforePressure, run.pressure),
          animatePreviewProfit(beforeProfit, afterProfit),
          animateDualCore(beforeBase, afterBase, beforeMult, afterMult, beforeProfit, afterProfit)
        ]);
        shake(Math.min(14, 2 + run.pressure / 12));

        if (run.pressure > run.explosionLimit) {
          const saved = await resolveExplosion(run, index);
          if (!saved) return;
        }
      }

      renderSlots();
      await finishRun(run);
    }

    async function resolveExplosion(run, index) {
      if (run.fuses > 0) {
        run.fuses -= 1;
        run.pressure = Math.max(0, run.explosionLimit - 6);
        logLine(`ON_EXPLODE：槽位 ${index + 1} 后触发熔断器，爆炸被压回红线内。`, "danger");
        tick(54, 0.16, "sawtooth");
        await animatePressure(112, run.pressure);
        shake(18);
        return true;
      }

      if (run.insurance) {
        const salvage = Math.floor(currentRunProfit(run) * 0.5);
        state.cash += salvage;
        run.insurance = false;
        run.pressure = Math.max(0, run.explosionLimit - 4);
        run.base = Math.max(40, Math.floor(run.base * 0.35));
        run.multiplier = 1;
        logLine(`ON_EXPLODE：余烬保险保留 ${money(salvage)}，本轮收益烧成余烬。`, "danger");
        tick(72, 0.15, "triangle");
        await animatePressure(114, run.pressure);
        animateCash(state.cash - salvage, state.cash);
        shake(18);
        return true;
      }

      state.pressure = run.pressure;
      renderPressure(state.pressure);
      document.body.classList.add("boom");
      buzz();
      shake(28);
      logLine("压力越过 100，引擎熔毁。", "danger");
      await wait(700);
      document.body.classList.remove("boom");
      state.settling = false;
      render();
      endGame("引擎熔毁", "你把收益推上去了，也把机器推进了红区。");
      return false;
    }

    async function finishRun(run) {
      const profit = currentRunProfit(run);
      const oldCash = state.cash;
      state.cash += profit;
      state.pressure = Math.max(0, Math.round(run.pressure - 16));
      state.baseDebt = run.nextDebt;

      tick(440, 0.11, "triangle");
      logLine(`本轮入账 ${money(profit)}，残余压力 ${state.pressure}。`);
      await Promise.all([
        animateCash(oldCash, state.cash),
        animatePressure(run.pressure, state.pressure)
      ]);

      const target = currentTarget();
      if (state.cash < target) {
        state.settling = false;
        render();
        endGame("资金断流", `目标是 ${money(target)}，你停在了 ${money(state.cash)}。`);
        return;
      }

      state.best = Math.max(state.best, state.round);
      localStorage.setItem("abyss-best", String(state.best));

      if (state.round >= targetCurve.length) {
        state.settling = false;
        render();
        endGame("深渊压榨完成", `你带着 ${money(state.cash)} 从机器旁边走开了。`);
        return;
      }

      state.round += 1;
      state.settling = false;
      newRound();
      render();
    }

    function simulatePreview() {
      return simulatePreviewCore({
        slots: state.slots,
        state,
        baseProfit: baseProfit(),
        resolveModuleFn: resolveModule,
        slotCount
      });
    }

    function baseProfit() {
      return Math.round(70 * Math.pow(1.72, state.round - 1));
    }

    function currentTarget() {
      return targetCurve[state.round - 1];
    }

    function restartGame() {
      state.cash = 0;
      state.pressure = 0;
      state.round = 1;
      state.baseDebt = 0;
      state.settling = false;
      state.log = [];
      els.overlay.classList.remove("show");
      document.body.classList.remove("boom", "critical");
      newRound(true);
      render();
    }

    function endGame(title, body) {
      els.modalTitle.textContent = title;
      els.modalBody.textContent = body;
      els.overlay.classList.add("show");
      tick(title.includes("完成") ? 520 : 80, 0.18, title.includes("完成") ? "triangle" : "sawtooth");
    }

    function logLine(text, type = "") {
      state.log.push({ text, type });
      state.log = state.log.slice(-24);
      renderLog();
    }

    function toast(text) {
      clearTimeout(toastTimer);
      els.toast.textContent = text;
      els.toast.classList.add("show");
      toastTimer = setTimeout(() => els.toast.classList.remove("show"), 1800);
    }

    function animateCash(from, to) {
      return animateNumber(from, to, 620, (value) => {
        els.cash.textContent = money(value);
      });
    }

    function animatePressure(from, to) {
      return animateNumber(from, to, 540, (value) => {
        state.pressure = Math.round(value);
        renderPressure(state.pressure);
        document.body.classList.toggle("critical", state.pressure >= 80);
      });
    }

    function animatePreviewProfit(from, to) {
      return animateNumber(from, to, 480, (value) => {
        els.previewProfit.textContent = money(value);
      });
    }

    function animateDualCore(baseFrom, baseTo, multFrom, multTo, profitFrom, profitTo) {
      const start = performance.now();
      const duration = 420;
      return new Promise((resolve) => {
        function frame(now) {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          const baseNow = baseFrom + (baseTo - baseFrom) * eased;
          const multNow = multFrom + (multTo - multFrom) * eased;
          const profitNow = profitFrom + (profitTo - profitFrom) * eased;
          if (els.baseDisplay) els.baseDisplay.textContent = `${Math.round(baseNow)} A`;
          if (els.voltDisplay) els.voltDisplay.textContent = `x${multNow.toFixed(2)}`;
          if (els.profitDisplay) els.profitDisplay.textContent = money(profitNow);
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
    }

    function animateNumber(from, to, duration, renderValue) {
      const start = performance.now();
      return new Promise((resolve) => {
        function frame(now) {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          renderValue(Math.round(from + (to - from) * eased));
          if (t < 1) {
            requestAnimationFrame(frame);
          } else {
            renderValue(to);
            renderPreview();
            resolve();
          }
        }
        requestAnimationFrame(frame);
      });
    }

    function shake(strength) {
      let frames = 8;
      function step() {
        const offset = (Math.random() - 0.5) * strength;
        document.documentElement.style.setProperty("--shake-x", `${offset}px`);
        frames -= 1;
        if (frames > 0) {
          requestAnimationFrame(step);
        } else {
          document.documentElement.style.setProperty("--shake-x", "0px");
        }
      }
      step();
    }

    function tick(frequency = 180, volume = 0.04, type = "square") {
      if (!state.sound) return;
      try {
        audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        gain.gain.value = volume;
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.12);
        oscillator.stop(audioContext.currentTime + 0.13);
      } catch (error) {
        state.sound = false;
      }
    }

    function buzz() {
      if (!state.sound) return;
      [62, 74, 51, 96].forEach((frequency, index) => {
        setTimeout(() => tick(frequency, 0.14, "sawtooth"), index * 92);
      });
    }

    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function money(value) {
      return `¥ ${Math.round(value).toLocaleString("zh-CN")}`;
    }

    function formatSigned(value) {
      return value >= 0 ? `+${value}` : `${value}`;
    }

    function randInt(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function randFloat(min, max) {
      return Math.random() * (max - min) + min;
    }

    function shuffle(list) {
      for (let i = list.length - 1; i > 0; i -= 1) {
        const j = randInt(0, i);
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    }

    function iconSvg(name) {
      const icons = {
        turbine: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22"></circle><circle cx="32" cy="32" r="8"></circle><path d="M32 10c8 7 9 14 2 22"></path><path d="M54 32c-7 8-14 9-22 2"></path><path d="M32 54c-8-7-9-14-2-22"></path><path d="M10 32c7-8 14-9 22-2"></path></svg>`,
        canister: `<svg viewBox="0 0 64 64"><path d="M24 10h16l3 8v32l-4 6H25l-4-6V18l3-8Z"></path><path d="M24 18h18"></path><path d="M25 37c7-6 14-6 19 0"></path><path d="M32 27v11"></path><path d="M27 32h10"></path></svg>`,
        dial: `<svg viewBox="0 0 64 64"><path d="M14 42a22 22 0 1 1 36 0"></path><path d="M32 42l12-18"></path><path d="M18 42h28"></path><circle cx="32" cy="42" r="4"></circle></svg>`,
        skull: `<svg viewBox="0 0 64 64"><path d="M16 29c0-12 7-20 16-20s16 8 16 20c0 7-4 11-8 14v9H24v-9c-4-3-8-7-8-14Z"></path><circle cx="25" cy="29" r="4"></circle><circle cx="39" cy="29" r="4"></circle><path d="M28 42h8"></path><path d="M27 52v-6"></path><path d="M37 52v-6"></path></svg>`,
        coin: `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="32" rx="18" ry="23"></ellipse><path d="M38 13c9 3 15 11 15 19s-6 16-15 19"></path><path d="M30 20v24"></path><path d="M24 26c2-4 13-5 16 0 3 6-13 6-10 12 3 5 13 4 15 0"></path></svg>`,
        bolt: `<svg viewBox="0 0 64 64"><path d="M36 6 16 35h15l-4 23 21-31H33l3-21Z"></path></svg>`,
        box: `<svg viewBox="0 0 64 64"><path d="M12 20h40v33H12z"></path><path d="M18 14h28l6 6H12l6-6Z"></path><path d="M25 31a7 7 0 1 1 12 5c-4 3-5 5-5 9"></path><path d="M32 51h.01"></path></svg>`,
        unknown: `<svg viewBox="0 0 64 64"><path d="M32 7 53 20v24L32 57 11 44V20L32 7Z"></path><path d="M25 26a8 8 0 1 1 13 6c-4 3-6 5-6 10"></path><path d="M32 49h.01"></path></svg>`,
        gauge: `<svg viewBox="0 0 64 64"><path d="M11 45a25 25 0 1 1 42 0"></path><path d="M32 45l17-20"></path><path d="M17 45h30"></path><path d="M45 16l5-5"></path><path d="M20 16l-5-5"></path></svg>`,
        shield: `<svg viewBox="0 0 64 64"><path d="M32 8 50 15v14c0 13-7 22-18 27-11-5-18-14-18-27V15l18-7Z"></path><path d="M24 33h16"></path><path d="M32 25v16"></path></svg>`
      };
      return icons[name] || icons.box;
    }

    init();

const BUILD_SHA = window.__BUILD_SHA__ || 'dev';
const v=document.getElementById('buildVersion'); if (v) v.textContent = `build: ${BUILD_SHA}`;
