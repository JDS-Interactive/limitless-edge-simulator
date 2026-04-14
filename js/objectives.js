export const OBJECTIVES = [
  {
    id: "objective_buy_once",
    title: "Take a Position",
    description: "Enter one position.",
    xp: 10,
    check: (state) => state.trades.some(t => t.action === "BUY")
  },
  {
    id: "objective_strategy_run",
    title: "Trust the System",
    description: "Run strategy engine once.",
    xp: 10,
    check: (state) =>
      state.eventFeed.some(e => e.title === "Strategy Evaluated")
  },
  {
    id: "objective_risk_set",
    title: "Risk Configured",
    description: "Set stop loss and take profit.",
    xp: 10,
    check: (state) =>
      Number(state.risk.stopLossPct) > 0 &&
      Number(state.risk.takeProfitPct) > 0
  }
];

export function evaluateObjectives(state, addXp, pushEvent) {
  const completed = new Set(state.completedObjectives);

  for (const obj of OBJECTIVES) {
    if (!completed.has(obj.id) && obj.check(state)) {
      completed.add(obj.id);

      addXp(state, obj.xp);
      pushEvent(state, "Objective Complete", `${obj.title} (+${obj.xp} XP)`);
    }
  }

  state.completedObjectives = [...completed];
}