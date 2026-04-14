import { rsi, sma, ema, macd, highestHigh, lowestLow } from "./indicators.js";
import { executeBuy, executeSell, ensurePosition } from "./simulator.js";

function manualOnly() {
  return {
    action: "HOLD",
    reason: "Manual-only mode is selected."
  };
}

function rsiReversal(state, symbol, candles) {
  const rsiValue = rsi(candles, 14);
  const smaValue = sma(candles, 10);
  const lastClose = candles[candles.length - 1].close;
  const position = ensurePosition(state, symbol);

  if (rsiValue == null || smaValue == null) {
    return { action: "HOLD", reason: "Waiting for enough RSI/SMA data." };
  }

  if (rsiValue < 32 && lastClose > smaValue && state.cash >= lastClose) {
    return { action: "BUY", quantity: 1, reason: "RSI reversal setup detected." };
  }

  if (position.quantity > 0 && rsiValue > 68) {
    return { action: "SELL", quantity: 1, reason: "RSI shows overbought conditions." };
  }

  return { action: "HOLD", reason: "No RSI reversal signal." };
}

function trendFollow(state, symbol, candles) {
  const sma10 = sma(candles, 10);
  const ema10 = ema(candles, 10);
  const lastClose = candles[candles.length - 1].close;
  const position = ensurePosition(state, symbol);

  if (sma10 == null || ema10 == null) {
    return { action: "HOLD", reason: "Waiting for enough trend data." };
  }

  if (ema10 > sma10 && lastClose > ema10 && state.cash >= lastClose) {
    return { action: "BUY", quantity: 1, reason: "Trend-following long setup detected." };
  }

  if (position.quantity > 0 && lastClose < sma10) {
    return { action: "SELL", quantity: 1, reason: "Price fell below trend support." };
  }

  return { action: "HOLD", reason: "No trend-following signal." };
}

function momentumMacd(state, symbol, candles) {
  const macdValue = macd(candles);
  const rsiValue = rsi(candles, 14);
  const lastClose = candles[candles.length - 1].close;
  const position = ensurePosition(state, symbol);

  if (macdValue == null || rsiValue == null) {
    return { action: "HOLD", reason: "Waiting for enough MACD/RSI data." };
  }

  if (macdValue > 0.6 && rsiValue < 65 && state.cash >= lastClose) {
    return { action: "BUY", quantity: 1, reason: "Momentum is strengthening." };
  }

  if (position.quantity > 0 && (macdValue < 0 || rsiValue > 72)) {
    return { action: "SELL", quantity: 1, reason: "Momentum has weakened or become overstretched." };
  }

  return { action: "HOLD", reason: "No MACD momentum signal." };
}

function breakoutStrategy(state, symbol, candles) {
  const high20 = highestHigh(candles, 20);
  const low20 = lowestLow(candles, 20);
  const lastClose = candles[candles.length - 1].close;
  const position = ensurePosition(state, symbol);

  if (high20 == null || low20 == null) {
    return { action: "HOLD", reason: "Waiting for enough breakout data." };
  }

  if (lastClose >= high20 && state.cash >= lastClose) {
    return { action: "BUY", quantity: 1, reason: "Breakout above 20-bar high." };
  }

  if (position.quantity > 0 && lastClose <= low20) {
    return { action: "SELL", quantity: 1, reason: "Breakdown below 20-bar low." };
  }

  return { action: "HOLD", reason: "No breakout signal." };
}

export function evaluateStrategyPreset(state, symbol, preset) {
  const candles = state.candlesBySymbol[symbol] || [];
  if (candles.length < 26) {
    return {
      action: "HOLD",
      reason: "Not enough candle data yet."
    };
  }

  if (preset === "none") return manualOnly();
  if (preset === "rsi_reversal") return rsiReversal(state, symbol, candles);
  if (preset === "trend_follow") return trendFollow(state, symbol, candles);
  if (preset === "momentum_macd") return momentumMacd(state, symbol, candles);
  if (preset === "breakout_20") return breakoutStrategy(state, symbol, candles);

  return {
    action: "HOLD",
    reason: "Unknown strategy preset."
  };
}

export function runStrategy(state, symbol, preset) {
  const result = evaluateStrategyPreset(state, symbol, preset);

  if (result.action === "BUY") {
    executeBuy(state, symbol, result.quantity, result.reason);
  } else if (result.action === "SELL") {
    executeSell(state, symbol, result.quantity, result.reason);
  }

  return result;
}