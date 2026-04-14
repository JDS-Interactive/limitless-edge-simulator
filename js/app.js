import { loadState, saveState, resetState, addXp, pushEvent } from "./state.js";
import { SCENARIOS, getScenario } from "./scenarios.js";
import { generateScenarioCandles, appendScenarioCandle } from "./marketData.js";
import { sma, ema, rsi, macd } from "./indicators.js";
import { executeBuy, executeSell, calculateEquity, ensurePosition, applyRiskRules } from "./simulator.js";
import { runStrategy } from "./strategyEngine.js";
import { ACHIEVEMENTS, evaluateAchievements } from "./achievements.js";
import { CHALLENGES, evaluateChallenges } from "./challenges.js";
import { OBJECTIVES, evaluateObjectives } from "./objectives.js";
import { generateCoachMessage } from "./aiCoach.js";
import { loadProfiles, saveProfiles, createProfile, cloneStateSnapshot } from "./profiles.js";
import { playBuySound, playSellSound, playAchievementSound, playErrorSound } from "./sound.js";

let state = loadState();
let profiles = loadProfiles();
let autoStepInterval = null;

const els = {
  symbolHeading: document.getElementById("symbolHeading"),
  xpValue: document.getElementById("xpValue"),
  levelValue: document.getElementById("levelValue"),
  scenarioBadge: document.getElementById("scenarioBadge"),
  autoSimBadge: document.getElementById("autoSimBadge"),
  replayStatus: document.getElementById("replayStatus"),

  lastPrice: document.getElementById("lastPrice"),
  cashValue: document.getElementById("cashValue"),
  equityValue: document.getElementById("equityValue"),
  positionValue: document.getElementById("positionValue"),

  totalTradesValue: document.getElementById("totalTradesValue"),
  winningTradesValue: document.getElementById("winningTradesValue"),
  bestTradeValue: document.getElementById("bestTradeValue"),
  netRealizedValue: document.getElementById("netRealizedValue"),

  symbolSelect: document.getElementById("symbolSelect"),
  scenarioSelect: document.getElementById("scenarioSelect"),
  strategyPresetSelect: document.getElementById("strategyPresetSelect"),
  qtyInput: document.getElementById("qtyInput"),
  stopLossInput: document.getElementById("stopLossInput"),
  takeProfitInput: document.getElementById("takeProfitInput"),

  profileSelect: document.getElementById("profileSelect"),
  newProfileBtn: document.getElementById("newProfileBtn"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),

  replayToggleBtn: document.getElementById("replayToggleBtn"),
  rewindBtn: document.getElementById("rewindBtn"),
  replayIndexInput: document.getElementById("replayIndexInput"),

  buyBtn: document.getElementById("buyBtn"),
  sellBtn: document.getElementById("sellBtn"),
  runStrategyBtn: document.getElementById("runStrategyBtn"),
  autoSimToggleBtn: document.getElementById("autoSimToggleBtn"),
  nextCandleBtn: document.getElementById("nextCandleBtn"),
  playPauseBtn: document.getElementById("playPauseBtn"),
  resetBtn: document.getElementById("resetBtn"),

  coachOutput: document.getElementById("coachOutput"),
  achievementList: document.getElementById("achievementList"),
  challengeList: document.getElementById("challengeList"),
  objectiveList: document.getElementById("objectiveList"),
  eventFeed: document.getElementById("eventFeed"),
  tradeLogBody: document.getElementById("tradeLogBody"),

  sma10: document.getElementById("sma10"),
  ema10: document.getElementById("ema10"),
  rsi14: document.getElementById("rsi14"),
  macd: document.getElementById("macd"),

  chartCanvas: document.getElementById("chartCanvas")
};

function allSymbols() {
  return ["AAPL", "MSFT", "NVDA", "TSLA"];
}

function bootstrapProfiles() {
  if (!profiles.length) {
    profiles = [{ id: "default", name: "Default Player", snapshot: cloneStateSnapshot(state) }];
    saveProfiles(profiles);
  }

  const active = profiles.find((p) => p.id === state.activeProfileId) || profiles[0];
  if (active?.snapshot) {
    state = active.snapshot;
    state.activeProfileId = active.id;
  }
}

function populateScenarioOptions() {
  if (!els.scenarioSelect) return;
  els.scenarioSelect.innerHTML = SCENARIOS.map(
    (scenario) => `<option value="${scenario.id}">${scenario.label}</option>`
  ).join("");
}

function populateProfileOptions() {
  if (!els.profileSelect) return;
  els.profileSelect.innerHTML = profiles
    .map((profile) => `<option value="${profile.id}">${profile.name}</option>`)
    .join("");
  els.profileSelect.value = state.activeProfileId || profiles[0]?.id || "default";
}

function initializeCandles() {
  state.candlesBySymbol ||= {};
  state.fullCandlesBySymbol ||= {};

  for (const symbol of allSymbols()) {
    const full = generateScenarioCandles(symbol, state.selectedScenario, 150);
    state.fullCandlesBySymbol[symbol] = full;
    state.candlesBySymbol[symbol] = full.slice(0, Math.max(20, state.replayIndex || 80));
    ensurePosition(state, symbol);
  }
}

function selectedSymbol() {
  return state.selectedSymbol || "AAPL";
}

function visibleCandles(symbol) {
  const full = state.fullCandlesBySymbol?.[symbol] || [];
  if (state.replayModeEnabled) {
    return full.slice(0, Math.max(20, Number(state.replayIndex || 80)));
  }
  return state.candlesBySymbol?.[symbol] || [];
}

function syncFormToState() {
  if (els.symbolSelect) els.symbolSelect.value = state.selectedSymbol || "AAPL";
  if (els.scenarioSelect) els.scenarioSelect.value = state.selectedScenario || "bull_run";
  if (els.strategyPresetSelect) els.strategyPresetSelect.value = state.selectedStrategyPreset || "none";
  if (els.stopLossInput) els.stopLossInput.value = state.risk.stopLossPct;
  if (els.takeProfitInput) els.takeProfitInput.value = state.risk.takeProfitPct;
  if (els.replayIndexInput) els.replayIndexInput.value = String(state.replayIndex || 80);
}

function syncStateFromForm() {
  state.selectedSymbol = els.symbolSelect?.value || "AAPL";
  state.selectedScenario = els.scenarioSelect?.value || "bull_run";
  state.selectedStrategyPreset = els.strategyPresetSelect?.value || "none";
  state.risk.stopLossPct = Number(els.stopLossInput?.value || 0);
  state.risk.takeProfitPct = Number(els.takeProfitInput?.value || 0);
  state.replayIndex = Number(els.replayIndexInput?.value || 80);
}

function evaluateProgression(strategyResult = null) {
  const beforeCount = new Set(state.unlockedAchievements).size;

  evaluateAchievements(state);
  evaluateChallenges(state, addXp, pushEvent);
  evaluateObjectives(state, addXp, pushEvent);

  const afterCount = new Set(state.unlockedAchievements).size;
  if (afterCount > beforeCount) {
    playAchievementSound();
  }

  if (strategyResult?.action === "HOLD") addXp(state, 2);
  if (strategyResult?.action === "BUY") addXp(state, 10);
  if (strategyResult?.action === "SELL") addXp(state, 15);
}

function saveProfilesNow() {
  const idx = profiles.findIndex((p) => p.id === state.activeProfileId);
  if (idx >= 0) {
    profiles[idx].snapshot = cloneStateSnapshot(state);
  } else {
    profiles.push({
      id: state.activeProfileId || "default",
      name: "Default Player",
      snapshot: cloneStateSnapshot(state)
    });
  }
  saveProfiles(profiles);
}

function saveAndRender(strategyResult = null) {
  saveState(state);
  saveProfilesNow();
  render(strategyResult);
}

function stepMarket() {
  if (state.replayModeEnabled) {
    const maxLen = state.fullCandlesBySymbol[selectedSymbol()]?.length || 150;
    state.replayIndex = Math.min(maxLen, Number(state.replayIndex || 80) + 1);
  } else {
    for (const symbol of allSymbols()) {
      const full = state.fullCandlesBySymbol[symbol] || [];
      const nextFull = appendScenarioCandle(full, state.selectedScenario);
      state.fullCandlesBySymbol[symbol] = nextFull;
      state.candlesBySymbol[symbol] = nextFull.slice(-80);
    }
  }

  let strategyResult = null;

  if (state.autoSimEnabled && state.selectedStrategyPreset !== "none") {
    strategyResult = runStrategy(state, selectedSymbol(), state.selectedStrategyPreset);
    pushEvent(state, "Strategy Evaluated", `${state.selectedStrategyPreset} returned ${strategyResult.action}.`);
    if (strategyResult.action === "BUY") playBuySound();
    if (strategyResult.action === "SELL") playSellSound();
  }

  const riskActions = applyRiskRules(state);
  for (const action of riskActions) {
    pushEvent(
      state,
      action.type === "STOP_LOSS" ? "Stop Loss" : "Take Profit",
      `${action.symbol} position was closed by risk rules.`
    );
    playSellSound();
  }

  evaluateProgression(strategyResult);
  saveAndRender(strategyResult);
}

function manualBuy() {
  try {
    syncStateFromForm();
    const qty = Number(els.qtyInput?.value || 1);
    const result = executeBuy(state, selectedSymbol(), qty, "Manual entry");
    addXp(state, 10);
    pushEvent(state, "Buy Executed", `Bought ${qty} ${selectedSymbol()} at $${result.price.toFixed(2)}.`);
    playBuySound();
    saveAndRender();
  } catch (err) {
    playErrorSound();
    alert(err.message);
  }
}

function manualSell() {
  try {
    syncStateFromForm();
    const qty = Number(els.qtyInput?.value || 1);
    const result = executeSell(state, selectedSymbol(), qty, "Manual exit");
    addXp(state, result.realizedPnL > 0 ? 20 : 8);
    pushEvent(state, "Sell Executed", `Sold ${qty} ${selectedSymbol()} at $${result.price.toFixed(2)}.`);
    playSellSound();
    saveAndRender();
  } catch (err) {
    playErrorSound();
    alert(err.message);
  }
}

function manualRunStrategy() {
  try {
    syncStateFromForm();
    const result = runStrategy(state, selectedSymbol(), state.selectedStrategyPreset);
    pushEvent(state, "Strategy Evaluated", `${state.selectedStrategyPreset} returned ${result.action}.`);
    if (result.action === "BUY") playBuySound();
    if (result.action === "SELL") playSellSound();
    evaluateProgression(result);
    saveAndRender(result);
  } catch (err) {
    playErrorSound();
    alert(err.message);
  }
}

function toggleAutoStep() {
  state.autoStepEnabled = !state.autoStepEnabled;

  if (autoStepInterval) {
    clearInterval(autoStepInterval);
    autoStepInterval = null;
  }

  if (state.autoStepEnabled && !state.replayModeEnabled) {
    autoStepInterval = setInterval(stepMarket, 1500);
  }

  pushEvent(state, "Auto Step", `Auto step turned ${state.autoStepEnabled ? "on" : "off"}.`);
  saveAndRender();
}

function toggleAutoSim() {
  state.autoSimEnabled = !state.autoSimEnabled;
  pushEvent(state, "Auto Simulation", `Auto simulation turned ${state.autoSimEnabled ? "on" : "off"}.`);
  saveAndRender();
}

function toggleReplay() {
  state.replayModeEnabled = !state.replayModeEnabled;

  if (state.replayModeEnabled) {
    if (autoStepInterval) {
      clearInterval(autoStepInterval);
      autoStepInterval = null;
    }
    state.autoStepEnabled = false;
  }

  pushEvent(state, "Replay", `Replay mode turned ${state.replayModeEnabled ? "on" : "off"}.`);
  saveAndRender();
}

function rewindReplay() {
  state.replayModeEnabled = true;
  state.replayIndex = 80;
  pushEvent(state, "Replay Rewind", "Replay position reset.");
  saveAndRender();
}

function scenarioChanged() {
  syncStateFromForm();
  initializeCandles();
  pushEvent(state, "Scenario Changed", `Scenario switched to ${getScenario(state.selectedScenario).label}.`);
  saveAndRender();
}

function createNewProfile() {
  const name = prompt("Enter a profile name:", `Player ${profiles.length + 1}`);
  if (!name) return;

  const profile = createProfile(name);
  profile.snapshot = cloneStateSnapshot(state);
  profiles.push(profile);
  state.activeProfileId = profile.id;
  saveProfiles(profiles);
  populateProfileOptions();
  pushEvent(state, "Profile Created", `Created profile "${name}".`);
  saveAndRender();
}

function saveCurrentProfile() {
  saveProfilesNow();
  pushEvent(state, "Profile Saved", "Current profile saved.");
  saveAndRender();
}

function loadSelectedProfile() {
  const id = els.profileSelect?.value;
  const profile = profiles.find((p) => p.id === id);
  if (!profile) return;

  state.activeProfileId = profile.id;
  if (profile.snapshot) {
    state = profile.snapshot;
    state.activeProfileId = profile.id;
  }

  syncFormToState();
  pushEvent(state, "Profile Loaded", `Loaded profile "${profile.name}".`);
  saveAndRender();
}

function renderStats() {
  const symbol = selectedSymbol();
  const candles = visibleCandles(symbol);
  const last = candles[candles.length - 1]?.close ?? 0;
  const position = ensurePosition(state, symbol);

  els.symbolHeading.textContent = symbol;
  els.lastPrice.textContent = `$${last.toFixed(2)}`;
  els.cashValue.textContent = `$${state.cash.toFixed(2)}`;
  els.equityValue.textContent = `$${calculateEquity(state).toFixed(2)}`;
  els.positionValue.textContent = `${position.quantity}`;

  els.xpValue.textContent = String(state.xp);
  els.levelValue.textContent = String(state.level);
  els.scenarioBadge.textContent = getScenario(state.selectedScenario).label;
  els.autoSimBadge.textContent = state.autoSimEnabled ? "On" : "Off";
  els.replayStatus.textContent = state.replayModeEnabled ? `On (${state.replayIndex})` : "Off";

  els.totalTradesValue.textContent = String(state.stats.totalTrades);
  els.winningTradesValue.textContent = String(state.stats.winningTrades);
  els.bestTradeValue.textContent = `$${state.stats.bestTrade.toFixed(2)}`;
  els.netRealizedValue.textContent = `$${state.stats.netRealized.toFixed(2)}`;
  els.netRealizedValue.className = state.stats.netRealized >= 0 ? "positive" : "negative";

  if (els.autoSimToggleBtn) {
    els.autoSimToggleBtn.textContent = `Auto Sim: ${state.autoSimEnabled ? "On" : "Off"}`;
  }
  if (els.playPauseBtn) {
    els.playPauseBtn.textContent = `Auto Step: ${state.autoStepEnabled ? "On" : "Off"}`;
  }
  if (els.replayToggleBtn) {
    els.replayToggleBtn.textContent = `Replay: ${state.replayModeEnabled ? "On" : "Off"}`;
  }
}

function renderIndicators() {
  const candles = visibleCandles(selectedSymbol());
  const smaVal = sma(candles, 10);
  const emaVal = ema(candles, 10);
  const rsiVal = rsi(candles, 14);
  const macdVal = macd(candles);

  els.sma10.textContent = smaVal == null ? "-" : smaVal.toFixed(2);
  els.ema10.textContent = emaVal == null ? "-" : emaVal.toFixed(2);
  els.rsi14.textContent = rsiVal == null ? "-" : rsiVal.toFixed(2);
  els.macd.textContent = macdVal == null ? "-" : macdVal.toFixed(2);
}

function renderTradeLog() {
  els.tradeLogBody.innerHTML = state.trades
    .slice(0, 20)
    .map((trade) => {
      const pnl = trade.realizedPnL || 0;
      const pnlClass = pnl > 0 ? "positive" : pnl < 0 ? "negative" : "";
      return `
        <tr>
          <td>${trade.time}</td>
          <td>${trade.action}</td>
          <td>$${trade.price.toFixed(2)}</td>
          <td class="${pnlClass}">$${pnl.toFixed(2)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderCardList(el, items, completedIds = [], icon = "") {
  if (!el) return;

  el.innerHTML = items
    .map((item) => {
      const done = completedIds.includes(item.id);
      return `
        <div class="card-item">
          <div class="card-title">${done ? `${icon} ` : ""}${item.title}</div>
          <div class="card-desc">${item.description}</div>
        </div>
      `;
    })
    .join("");
}

function renderEvents() {
  els.eventFeed.innerHTML = state.eventFeed
    .slice(0, 12)
    .map(
      (event) => `
        <div class="card-item">
          <div class="card-title">${event.time} · ${event.title}</div>
          <div class="card-desc">${event.description}</div>
        </div>
      `
    )
    .join("");
}

function renderCoach(strategyResult = null) {
  const symbol = selectedSymbol();
  const candles = visibleCandles(symbol);
  const indicators = {
    sma10: sma(candles, 10),
    ema10: ema(candles, 10),
    rsi14: rsi(candles, 14),
    macd: macd(candles)
  };

  els.coachOutput.textContent = generateCoachMessage({
    symbol,
    scenario: getScenario(state.selectedScenario),
    candles,
    indicators,
    strategyResult,
    position: ensurePosition(state, symbol),
    stats: state.stats,
    replayModeEnabled: state.replayModeEnabled
  });
}

function drawChart() {
  const canvas = els.chartCanvas;
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth || 1200;
  const cssHeight = 420;

  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = cssWidth;
  const height = cssHeight;
  const candles = visibleCandles(selectedSymbol()).slice(-60);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  if (!candles.length) return;

  const max = Math.max(...candles.map((c) => c.high));
  const min = Math.min(...candles.map((c) => c.low));
  const spread = Math.max(1, max - min);

  const pad = { left: 50, right: 12, top: 12, bottom: 24 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const candleW = Math.max(4, (plotW / candles.length) * 0.62);

  ctx.strokeStyle = "rgba(255,255,255,0.07)";
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
  }

  function yForPrice(price) {
    const pct = (price - min) / spread;
    return pad.top + plotH - pct * plotH;
  }

  candles.forEach((candle, i) => {
    const x = pad.left + (i + 0.5) * (plotW / candles.length);
    const yOpen = yForPrice(candle.open);
    const yClose = yForPrice(candle.close);
    const yHigh = yForPrice(candle.high);
    const yLow = yForPrice(candle.low);
    const rising = candle.close >= candle.open;

    ctx.strokeStyle = rising ? "#22c55e" : "#ef4444";
    ctx.fillStyle = rising ? "#22c55e" : "#ef4444";

    ctx.beginPath();
    ctx.moveTo(x, yHigh);
    ctx.lineTo(x, yLow);
    ctx.stroke();

    ctx.fillRect(
      x - candleW / 2,
      Math.min(yOpen, yClose),
      candleW,
      Math.max(2, Math.abs(yClose - yOpen))
    );
  });
}

function render(strategyResult = null) {
  renderStats();
  renderIndicators();
  renderTradeLog();
  renderCardList(els.achievementList, ACHIEVEMENTS, state.unlockedAchievements, "🏆");
  renderCardList(els.challengeList, CHALLENGES, state.completedChallenges, "✅");
  renderCardList(els.objectiveList, OBJECTIVES, state.completedObjectives, "🎯");
  renderEvents();
  renderCoach(strategyResult);
  drawChart();
  populateProfileOptions();
}

function bindEvents() {
  els.symbolSelect?.addEventListener("change", () => {
    syncStateFromForm();
    saveAndRender();
  });

  els.scenarioSelect?.addEventListener("change", scenarioChanged);

  els.strategyPresetSelect?.addEventListener("change", () => {
    syncStateFromForm();
    saveAndRender();
  });

  els.stopLossInput?.addEventListener("input", () => {
    syncStateFromForm();
    saveAndRender();
  });

  els.takeProfitInput?.addEventListener("input", () => {
    syncStateFromForm();
    saveAndRender();
  });

  els.replayIndexInput?.addEventListener("input", () => {
    syncStateFromForm();
    if (state.replayModeEnabled) saveAndRender();
  });

  els.buyBtn?.addEventListener("click", manualBuy);
  els.sellBtn?.addEventListener("click", manualSell);
  els.runStrategyBtn?.addEventListener("click", manualRunStrategy);
  els.autoSimToggleBtn?.addEventListener("click", toggleAutoSim);
  els.nextCandleBtn?.addEventListener("click", stepMarket);
  els.playPauseBtn?.addEventListener("click", toggleAutoStep);
  els.resetBtn?.addEventListener("click", () => {
    state = resetState();
    initializeCandles();
    syncFormToState();
    pushEvent(state, "Simulation Reset", "A fresh training session has started.");
    saveAndRender();
  });

  els.replayToggleBtn?.addEventListener("click", toggleReplay);
  els.rewindBtn?.addEventListener("click", rewindReplay);

  els.newProfileBtn?.addEventListener("click", createNewProfile);
  els.saveProfileBtn?.addEventListener("click", saveCurrentProfile);
  els.profileSelect?.addEventListener("change", loadSelectedProfile);

  window.addEventListener("resize", drawChart);
}

async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("./sw.js");
    } catch (err) {
      console.warn("SW registration failed:", err);
    }
  }
}

function init() {
  bootstrapProfiles();

  state.selectedSymbol ||= "AAPL";
  state.selectedScenario ||= "bull_run";
  state.selectedStrategyPreset ||= "none";
  state.activeProfileId ||= "default";
  state.risk ||= { stopLossPct: 4, takeProfitPct: 8 };
  state.stats ||= { totalTrades: 0, winningTrades: 0, bestTrade: 0, netRealized: 0 };
  state.unlockedAchievements ||= [];
  state.completedChallenges ||= [];
  state.completedObjectives ||= [];
  state.eventFeed ||= [];
  state.replayModeEnabled ||= false;
  state.replayIndex ||= 80;
  state.autoSimEnabled ||= false;
  state.autoStepEnabled ||= false;

  populateScenarioOptions();

  if (!state.candlesBySymbol || !Object.keys(state.candlesBySymbol).length) {
    initializeCandles();
  }

  syncFormToState();
  bindEvents();
  registerServiceWorker();
  render();
}

init();