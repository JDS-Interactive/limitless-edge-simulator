function closes(candles) {
  return candles.map(c => c.close);
}

export function sma(candles, period = 10) {
  const arr = closes(candles);
  if (arr.length < period) return null;

  const slice = arr.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function ema(candles, period = 10) {
  const arr = closes(candles);
  if (arr.length < period) return null;

  const k = 2 / (period + 1);
  let value = arr[0];

  for (let i = 1; i < arr.length; i++) {
    value = arr[i] * k + value * (1 - k);
  }

  return value;
}

export function rsi(candles, period = 14) {
  const arr = closes(candles);
  if (arr.length <= period) return null;

  let gains = 0;
  let losses = 0;

  for (let i = arr.length - period; i < arr.length; i++) {
    const diff = arr[i] - arr[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  if (losses === 0) return 100;

  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

export function macd(candles, fast = 12, slow = 26) {
  if (candles.length < slow) return null;

  const fastVal = ema(candles, fast);
  const slowVal = ema(candles, slow);

  if (fastVal == null || slowVal == null) return null;
  return fastVal - slowVal;
}

export function highestHigh(candles, period = 20) {
  if (candles.length < period) return null;
  return Math.max(...candles.slice(-period).map(c => c.high));
}

export function lowestLow(candles, period = 20) {
  if (candles.length < period) return null;
  return Math.min(...candles.slice(-period).map(c => c.low));
}