export const ACHIEVEMENTS = [
  {
    id: "first_trade",
    title: "First Trade",
    description: "Complete your first simulated trade."
  },
  {
    id: "first_win",
    title: "First Win",
    description: "Close a profitable simulated trade."
  },
  {
    id: "ten_trades",
    title: "Active Trader",
    description: "Complete 10 total trades."
  },
  {
    id: "level_three",
    title: "Rising Analyst",
    description: "Reach level 3."
  },
  {
    id: "profit_100",
    title: "Triple Digits",
    description: "Reach $100 net realized profit."
  },
  {
    id: "risk_manager",
    title: "Risk Manager",
    description: "Use a stop loss or take profit exit."
  },
  {
    id: "breakout_hunter",
    title: "Breakout Hunter",
    description: "Run the breakout strategy at least once."
  }
];

export function evaluateAchievements(state) {
  const unlocked = new Set(state.unlockedAchievements);

  if (state.stats.totalTrades >= 1) unlocked.add("first_trade");
  if (state.stats.winningTrades >= 1) unlocked.add("first_win");
  if (state.stats.totalTrades >= 10) unlocked.add("ten_trades");
  if (state.level >= 3) unlocked.add("level_three");
  if (state.stats.netRealized >= 100) unlocked.add("profit_100");

  const usedRiskExit = state.trades.some(
    (t) =>
      t.action === "SELL" &&
      (t.reason === "Stop loss triggered" || t.reason === "Take profit triggered")
  );
  if (usedRiskExit) unlocked.add("risk_manager");

  const usedBreakout = state.eventFeed.some(
    (e) => e.title === "Strategy Evaluated" && String(e.description || "").includes("breakout_20")
  );
  if (usedBreakout) unlocked.add("breakout_hunter");

  state.unlockedAchievements = [...unlocked];
}