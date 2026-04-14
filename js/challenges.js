export const CHALLENGES = [
  {
    id: "close_one_profit",
    title: "Green Close",
    description: "Close one profitable trade.",
    xp: 25,
    check: (state) => state.stats.winningTrades >= 1
  },
  {
    id: "reach_5_trades",
    title: "Warm Up",
    description: "Complete 5 total trades.",
    xp: 20,
    check: (state) => state.stats.totalTrades >= 5
  },
  {
    id: "net_50",
    title: "Half Century",
    description: "Reach $50 net realized profit.",
    xp: 40,
    check: (state) => state.stats.netRealized >= 50
  },
  {
    id: "perfect_exit",
    title: "Perfect Exit",
    description: "Close a trade above 5% gain.",
    xp: 50,
    check: (state) =>
      state.trades.some(t => t.realizedPnL && t.realizedPnL > 0 && t.realizedPnL / (t.price * t.quantity) > 0.05)
  }
];

export function evaluateChallenges(state, addXp, pushEvent) {
  const completed = new Set(state.completedChallenges);

  for (const challenge of CHALLENGES) {
    if (!completed.has(challenge.id) && challenge.check(state)) {
      completed.add(challenge.id);

      addXp(state, challenge.xp);
      pushEvent(state, "Challenge Complete", `${challenge.title} (+${challenge.xp} XP)`);
    }
  }

  state.completedChallenges = [...completed];
}