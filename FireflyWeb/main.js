document.addEventListener("DOMContentLoaded", () => {
  // ===== Elements =====
  const stage1 = document.getElementById("stage1");
  const stage2 = document.getElementById("stage2");

  const coverVideo = document.getElementById("coverVideo");
  const openBookBtn = document.getElementById("openBookBtn");
  const nextBtn = document.getElementById("nextBtn");

  const slider = document.getElementById("slider");
  const stageVideo = document.getElementById("stageVideo");
  const stageLabel = document.getElementById("stageLabel");

  // ✅ State
  let currentStageKey = null;   // 当前吸附段位：24.2 / 49.2 / 74.2 / 100
  let currentSrc = "";          // 当前播放的视频 src（fwd/rev 都算）
  let stage2Started = false;    // 是否已经进入 Stage2
  let lastSnapped = null;       // 用于判断 forward / backward

  // Firefly layer
  const fireflyLayer = document.getElementById("fireflyLayer");

  // Card (dynamic)
  const infoCard = document.getElementById("infoCard");
  const infoClose = document.getElementById("infoClose");
  const infoSheet = infoCard?.querySelector(".info-sheet");

  const cardTitle = document.getElementById("cardTitle");
  const cardBody = document.getElementById("cardBody");

  const cardMediaWrap = document.getElementById("cardMediaWrap");
  const cardVideo = document.getElementById("cardVideo");
  const cardImg = document.getElementById("cardImg");

  // Popup (kept)
  const popup = document.getElementById("popup");
  const popupClose = document.getElementById("popupClose");
  popupClose?.addEventListener("click", () => popup?.classList.add("hidden"));
  popup?.addEventListener("click", (e) => { if (e.target === popup) popup.classList.add("hidden"); });

  // ===== Stage2 clips =====
  // ✅ 你会把倒放视频放进来：srcRev
  const clips = [
    { key: "0-25",   min: 0,  max: 25,  label: "0–25% ｜ A World Still Dark",         srcFwd: "assets/page2.mp4", srcRev: "assets/page33.mp4" },
    { key: "25-50",  min: 26, max: 50,  label: "25–50% ｜ Early Light Pollution",    srcFwd: "assets/page3.mp4", srcRev: "assets/page44.mp4" },
    { key: "50-75",  min: 51, max: 75,  label: "50–75% ｜ When Fireflies Disappear", srcFwd: "assets/page4.mp4", srcRev: "assets/page55.mp4" },
    { key: "75-100", min: 76, max: 100, label: "75–100% ｜ Skyglow",                 srcFwd: "assets/page5.mp4", srcRev: "assets/page55.mp4" },
  ];

  function getClip(v){
    v = Number(v);
    return clips.find(c => v >= c.min && v <= c.max);
  }

  // ===== Slider snap =====
  // 24.2 / 49.2 / 74.2 / 100：保持一致
  function snapValue(value) {
    value = Number(value);
    if (value < 38) return 24.2;
    if (value < 63) return 49.2;
    if (value < 88) return 74.2;
    return 100;
  }

  // ✅ 把 snapped 映射回“逻辑区间”的取值（用来找 clip / 点位 / 卡片）
  // 24.2 -> 0（0-25），49.2 -> 40（25-50），74.2 -> 60（50-75），100 -> 90（75-100）
  function snappedToLogicalValue(snapped){
    const s = Number(snapped);
    if (s <= 24.2) return 0;
    if (s <= 49.2) return 40;
    if (s <= 74.2) return 60;
    return 90;
  }

  // ✅ snapped -> stageKey（给卡片/点位用）
  function stageKeyFromSnapped(snapped){
    const s = Number(snapped);
    if (s <= 24.2) return "0-25";
    if (s <= 49.2) return "25-50";
    if (s <= 74.2) return "50-75";
    return "75-100";
  }

  // ===== Helpers =====
  function showStage(n){
    if (n === 1){
      stage1?.classList.remove("hidden");
      if (stage1) stage1.hidden = false;

      stage2?.classList.add("hidden");
      if (stage2) stage2.hidden = true;
    } else {
      stage1?.classList.add("hidden");
      if (stage1) stage1.hidden = true;

      stage2?.classList.remove("hidden");
      if (stage2) stage2.hidden = false;
    }
  }

  // ===== Card Data (4 stages) =====
  const cards = {
    "0-25": {
      theme: "theme-0-25",
      title: "Firefly · Natural Darkness",
      media: { type: "video", src: "assets/Firefly.mp4" },
      rows: [
        { label: "Species:", text: "Lampyridae, over 2000 kinds" },
        { label: "Main Distribution:", text: "Asia & North America" },
        { label: "Habitat:", text: "Dark, Low-light natural environments" },
        { label: "Key Behavior:", text: "Fireflies use bioluminescent signals to communicate and locate mates." },
        { label: "Note:", text: "Natural darkness is essential for signal visibility and reproductive success." },
      ],
    },

    "25-50": {
      theme: "theme-25-50",
      title: "Light Pollution · Artificial Glow",
      media: { type: "video", src: "assets/Firefly2.mp4" },
      rows: [
        { label: "Term:", text: "Light Pollution" },
        { label: "Definition:", text: "Artificial light in the nighttime environment, where natural darkness once prevailed." },
        { label: "Common Sources:", text: "Streetlights, buildings, vehicles, illuminated infrastructure." },
        { label: "Where it spreads:", text: "Cities and areas far beyond urban centers." },
      ],
    },

    "50-75": {
      theme: "theme-50-75",
      title: "When Lights Disrupt the Signal",
      media: { type: "video", src: "assets/Firefly3.mp4" },
      rows: [
        { label: "Core Issue:", text: "Artificial light competes with fireflies’ bioluminescent courtship signals." },
        { label: "How:", text: "Brighter nights reduce contrast, making flashes harder to see and easier to miss." },
        { label: "Behavioral Shift:", text: "Some species flash less, change timing, or stop signaling in lit areas." },
        { label: "Result:", text: "Fewer pairings, lower reproduction, and long-term population decline." },
      ],
    },

    "75-100": {
      theme: "theme-75-100",
      title: "Where Fireflies Fade",
      media: { type: "video", src: "assets/Firefly3.mp4" },
      rows: [
        { label: "What is at stake:", text: "As darkness disappears, fireflies are not the only species affected." },
        { label: "Ecosystem Impact:", text: "Nocturnal ecosystems lose rhythms, relationships, and balance." },
        { label: "What can we do:", text: "Reduce unnecessary lighting and shield outdoor light sources." },
        { label: "A Small Change:", text: "Warmer, lower-intensity lights can help bring readable nights back." },
      ],
    },
  };

  // ===== Spots Data (4 stages) =====
  const spotsByStage = {
    "0-25": [
      { x: 26.5, y: 68.5, size: 46 },
      { x: 72.8, y: 68.6, size: 46 },
      { x: 46.5, y: 66.8, size: 40 },
      { x: 55.8, y: 71.2, size: 42 },
    ],
    "25-50": [
      { x: 38.0, y: 60.0, size: 40 },
      { x: 62.0, y: 66.0, size: 42 },
      { x: 74.0, y: 54.0, size: 36 },
    ],
    "50-75": [
      { x: 34.0, y: 62.0, size: 40 },
      { x: 58.0, y: 70.0, size: 42 },
      { x: 78.0, y: 58.0, size: 36 },
    ],
    "75-100": [
      { x: 40.0, y: 64.0, size: 40 },
      { x: 64.0, y: 70.0, size: 42 },
      { x: 76.0, y: 56.0, size: 36 },
    ],
  };

  // ===== Card render =====
  function setCardTheme(themeClass){
    if (!infoSheet) return;
    infoSheet.classList.remove("theme-0-25","theme-25-50","theme-50-75","theme-75-100");
    if (themeClass) infoSheet.classList.add(themeClass);
  }

  function clearCardMedia(){
    if (cardVideo){
      cardVideo.pause();
      cardVideo.classList.add("hidden");
      cardVideo.removeAttribute("src");
      cardVideo.load();
    }
    if (cardImg){
      cardImg.classList.add("hidden");
      cardImg.removeAttribute("src");
      cardImg.alt = "";
    }
    if (cardMediaWrap) cardMediaWrap.classList.remove("hidden");
  }

  function setCardMedia(media){
    clearCardMedia();
    if (!media){
      if (cardMediaWrap) cardMediaWrap.classList.add("hidden");
      return;
    }

    if (media.type === "video" && cardVideo){
      cardVideo.src = media.src;
      cardVideo.classList.remove("hidden");
    } else if (media.type === "image" && cardImg){
      cardImg.src = media.src;
      cardImg.alt = media.alt || "";
      cardImg.classList.remove("hidden");
    }
  }

  function setCardRows(rows){
    if (!cardBody) return;
    cardBody.innerHTML = "";

    (rows || []).forEach((r, idx) => {
      const row = document.createElement("div");
      row.className = "info-row";

      const label = document.createElement("div");
      label.className = "info-label";
      label.textContent = r.label;

      const text = document.createElement("div");
      text.className = "info-text";
      text.textContent = r.text;

      row.appendChild(label);
      row.appendChild(text);
      cardBody.appendChild(row);

      if (idx !== rows.length - 1){
        const div = document.createElement("div");
        div.className = "info-divider";
        cardBody.appendChild(div);
      }
    });
  }

  function openCard(stageKey){
    const data = cards[stageKey];
    if (!data || !infoCard) return;

    setCardTheme(data.theme);
    if (cardTitle) cardTitle.textContent = data.title || "";

    setCardMedia(data.media);
    setCardRows(data.rows || []);

    infoCard.classList.remove("hidden");
    infoCard.setAttribute("aria-hidden", "false");

    if (data.media?.type === "video" && cardVideo){
      try { cardVideo.currentTime = 0; } catch (_) {}
      cardVideo.play().catch(console.warn);
    }
  }

  function closeCard(){
    if (!infoCard) return;
    infoCard.classList.add("hidden");
    infoCard.setAttribute("aria-hidden", "true");
    if (cardVideo) cardVideo.pause();
  }

  infoClose?.addEventListener("click", closeCard);
  infoCard?.addEventListener("click", (e) => { if (e.target === infoCard) closeCard(); });
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCard(); });

  // ===== Firefly render (per stage) =====
  function clearFireflies(){
    if (!fireflyLayer) return;
    fireflyLayer.innerHTML = "";
  }

  function renderFireflies(stageKey){
    clearFireflies();
    if (!fireflyLayer) return;

    const spots = spotsByStage[stageKey] || [];
    spots.forEach((s, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "firefly-dot";
      btn.style.left = `${s.x}%`;
      btn.style.top = `${s.y}%`;
      btn.style.setProperty("--s", (s.size || 22) + "px");

      const dur = (4.2 + Math.random() * 3.8).toFixed(2);
      const delay = (-Math.random() * 8.0).toFixed(2);
      btn.style.setProperty("--dur", `${dur}s`);
      btn.style.setProperty("--delay", `${delay}s`);

      btn.setAttribute("aria-label", `Hotspot ${i + 1}`);
      btn.addEventListener("click", () => openCard(stageKey));

      fireflyLayer.appendChild(btn);
    });
  }

  // ✅ 改成用“stageKey”更新交互（不再依赖 getClip 的 min/max）
  function updateInteractiveForStage(stageKey){
    if (!stageKey){
      clearFireflies();
      closeCard();
      return;
    }
    renderFireflies(stageKey);
    closeCard(); // 切段时把卡关掉
  }

  // ===== Stage 1 init =====
  if (coverVideo){
    coverVideo.pause();
    coverVideo.addEventListener("loadedmetadata", () => {
      try { coverVideo.currentTime = 0; } catch (_) {}
    }, { once: true });
  }

  // ===== Open book =====
  openBookBtn?.addEventListener("click", async () => {
    openBookBtn.style.display = "none";
    nextBtn?.classList.remove("hidden");

    try { await coverVideo.play(); }
    catch (err){
      console.warn("cover play failed:", err);
      coverVideo.controls = true;
    }
  });

  // ===== Stage 2 playback =====
  let isPlaying = false;

  // ✅ Playback（forward / reverse）：根据 dir 选择 srcFwd / srcRev
  // ✅ 同段位不重播（除非 force）
  async function playStage2Clip(clip, opts = {}){
    if (!clip || !stageVideo) return;

    const { snappedKey = null, dir = "fwd", force = false } = opts;

    const nextSrc = (dir === "rev") ? clip.srcRev : clip.srcFwd;

    // 双保险：同段位 or 同 src 都不播（除非 force）
    if (!force){
      if (snappedKey !== null && snappedKey === currentStageKey) return;
      if (nextSrc && nextSrc === currentSrc) return;
    }

    // ✅ 先写入状态：避免 Next 后第一次 change 又播
    if (snappedKey !== null) currentStageKey = snappedKey;
    currentSrc = nextSrc || "";

    if (stageLabel) stageLabel.textContent = clip.label;

    stageVideo.muted = true;
    stageVideo.playsInline = true;

    isPlaying = true;
    if (slider) slider.disabled = true;

    stageVideo.pause();
    stageVideo.src = nextSrc;
    stageVideo.load();

    await new Promise(resolve => {
      if (stageVideo.readyState >= 2) return resolve();
      stageVideo.addEventListener("canplay", resolve, { once: true });
    });

    try { stageVideo.currentTime = 0; } catch (_) {}

    try { await stageVideo.play(); }
    catch (err){
      console.warn("stage2 play failed:", err);
      stageVideo.controls = true;
    }
  }

  stageVideo?.addEventListener("ended", () => {
    isPlaying = false;
    if (slider) slider.disabled = false;
  });

  // ===== Next -> Stage2 =====
  nextBtn?.addEventListener("click", async () => {
    showStage(2);
    stage2Started = true;

    // 进入第二页：落在 24.2（你的 0–25 段位点）
    const snapped = 24.2;
    if (slider) slider.value = String(snapped);

    // ✅ 初始化 lastSnapped，彻底避免“Next 后第一次 change 还会播一次”的 bug
    lastSnapped = snapped;

    const stageKey = stageKeyFromSnapped(snapped);
    updateInteractiveForStage(stageKey);

    // ✅ 强制播一次 forward
    currentStageKey = snapped;
    currentSrc = ""; // 保证 force 一定触发
    const logicalV = snappedToLogicalValue(snapped);
    await playStage2Clip(getClip(logicalV), { snappedKey: snapped, dir: "fwd", force: true });
  });

  // ===== Slider change (✅ 回拨播放倒放：播放“目标段”的 srcRev) =====
  slider?.addEventListener("change", async (e) => {
    if (!stage2Started) return;
    if (isPlaying) return;

    const snapped = snapValue(e.target.value);
    slider.value = String(snapped);

    // ✅ 同段位：直接结束（不更新、不重播）
    if (snapped === currentStageKey) return;

    // ✅ 判断方向：往回 = rev；往前 = fwd
    const dir = (lastSnapped === null || snapped > lastSnapped) ? "fwd" : "rev";
    lastSnapped = snapped;

    const stageKey = stageKeyFromSnapped(snapped);
    updateInteractiveForStage(stageKey);

    const logicalV = snappedToLogicalValue(snapped);

    // ✅ 关键：回拨时播放“目标段”的倒放视频
    await playStage2Clip(getClip(logicalV), { snappedKey: snapped, dir, force: false });
  });
});