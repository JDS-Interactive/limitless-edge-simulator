export const SCENARIOS = [
  {
    id: "bull_run",
    label: "Bull Run",
    drift: 1.2,
    volatility: 2.0,
    momentumBias: 0.7,
    description: "Strong upward trend with minor pullbacks."
  },
  {
    id: "bear_slide",
    label: "Bear Slide",
    drift: -1.1,
    volatility: 2.5,
    momentumBias: -0.7,
    description: "Consistent downward pressure."
  },
  {
    id: "sideways_chop",
    label: "Sideways Chop",
    drift: 0.0,
    volatility: 2.8,
    momentumBias: 0.0,
    description: "Noisy range-bound market."
  },
  {
    id: "volatile_breakout",
    label: "Volatile Breakout",
    drift: 0.4,
    volatility: 4.5,
    momentumBias: 0.3,
    description: "Sharp swings and breakouts."
  },
  {
    id: "mean_reversion",
    label: "Mean Reversion",
    drift: 0.0,
    volatility: 3.2,
    momentumBias: -0.2,
    description: "Price tends to snap back to average."
  }
];

export function getScenario(id) {
  return SCENARIOS.find(s => s.id === id) || SCENARIOS[0];
}