export function createInitialState() {
  return {
    selectedSymbol: "AAPL",
    selectedScenario: "bull_run",
    selectedStrategyPreset: "none",
    activeProfileId: "default",

    startingCash: 10000,
    cash: 10000,

    positions: {},
    trades: [],

    candlesBySymbol: {},
    fullCandlesBySymbol: {},

    autoSimEnabled: false,
    autoStepEnabled: false,

    replayModeEnabled: false,
    replayIndex: 80,

    xp: 0,
    level: 1,

    risk: {
      stopLossPct: 4,
      takeProfitPct: 8
    },

    stats: {
      totalTrades: 0,
      winningTrades: 0,
      bestTrade: 0,
      netRealized: 0
    },

    unlockedAchievements: [],
    completedChallenges: [],
    completedObjectives: [],

    eventFeed: []
  };
}

export function saveState(state) {
  localStorage.setItem("limitless_edge_sim_state_v1_3", JSON.stringify(state));
}

export function loadState() {
  const raw = localStorage.getItem("limitless_edge_sim_state_v1_3");
  if (!raw) return createInitialState();

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to load state:", error);
    return createInitialState();
  }
}

export function resetState() {
  const fresh = createInitialState();
  saveState(fresh);
  return fresh;
}

export function xpNeededForLevel(level) {
  return 100 + (level - 1) * 40;
}

export function addXp(state, amount) {
  state.xp += amount;

  while (state.xp >= xpNeededForLevel(state.level)) {
    state.xp -= xpNeededForLevel(state.level);
    state.level += 1;
  }
}

export function pushEvent(state, title, description) {
  state.eventFeed.unshift({
    time: new Date().toLocaleTimeString(),
    title,
    description
  });

  state.eventFeed = state.eventFeed.slice(0, 20);
}