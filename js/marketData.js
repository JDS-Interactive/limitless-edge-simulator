import { getScenario } from "./scenarios.js";

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function symbolSeed(symbol) {
  return symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
}

function basePrice(symbol) {
  return (
    symbol === "AAPL" ? 190 :
    symbol === "MSFT" ? 420 :
    symbol === "NVDA" ? 890 :
    symbol === "TSLA" ? 170 : 100
  );
}

export function generateScenarioCandles(symbol, scenarioId, count = 150) {
  const scenario = getScenario(scenarioId);
  const rand = mulberry32(symbolSeed(symbol) + scenarioId.length * 999);

  const candles = [];
  let price = basePrice(symbol);

  for (let i = 0; i < count; i++) {
    const drift = scenario.drift;
    const momentum = scenario.momentumBias * (rand() - 0.5);
    const swing = (rand() - 0.5) * scenario.volatility;

    const move = drift + swing + momentum;

    const open = price;
    price = Math.max(5, price + move);

    const close = Number(price.toFixed(2));

    const high = Number((Math.max(open, close) + rand() * 2).toFixed(2));
    const low = Number((Math.min(open, close) - rand() * 2).toFixed(2));

    candles.push({
      time: Date.now() + i * 60000,
      open: Number(open.toFixed(2)),
      high,
      low,
      close,
      volume: Math.floor(rand() * 800000 + 200000)
    });
  }

  return candles;
}

export function appendScenarioCandle(candles, scenarioId) {
  const scenario = getScenario(scenarioId);
  const last = candles[candles.length - 1];
  const base = last ? last.close : 100;

  const drift = scenario.drift * 0.8;
  const swing = (Math.random() - 0.5) * scenario.volatility;
  const momentum = scenario.momentumBias * (Math.random() - 0.5);

  const close = Math.max(5, Number((base + drift + swing + momentum).toFixed(2)));
  const open = Number((base + (Math.random() - 0.5)).toFixed(2));

  const high = Number((Math.max(open, close) + Math.random() * 1.5).toFixed(2));
  const low = Number((Math.min(open, close) - Math.random() * 1.5).toFixed(2));

  return [
    ...candles.slice(-200),
    {
      time: (last?.time || Date.now()) + 60000,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 800000 + 200000)
    }
  ];
}