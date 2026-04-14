export function generateCoachMessage({
  symbol,
  scenario,
  candles,
  indicators,
  strategyResult,
  position,
  stats,
  replayModeEnabled
}) {
  const lastClose = candles[candles.length - 1]?.close ?? 0;
  const rsiText = indicators.rsi14 == null ? "n/a" : indicators.rsi14.toFixed(2);
  const smaText = indicators.sma10 == null ? "n/a" : indicators.sma10.toFixed(2);
  const emaText = indicators.ema10 == null ? "n/a" : indicators.ema10.toFixed(2);
  const macdText = indicators.macd == null ? "n/a" : indicators.macd.toFixed(2);

  const trendBias =
    indicators.ema10 != null && indicators.sma10 != null
      ? indicators.ema10 > indicators.sma10
        ? "short-term bullish"
        : "short-term bearish"
      : "undetermined";

  const riskTone =
    position?.quantity > 0 && position.avgCost > 0
      ? ((lastClose - position.avgCost) / position.avgCost) * 100
      : null;

  let text = `${symbol} is trading at $${lastClose.toFixed(2)} in the ${scenario.label} scenario. `;
  text += `Current bias looks ${trendBias}. `;
  text += `RSI: ${rsiText}, SMA(10): ${smaText}, EMA(10): ${emaText}, MACD: ${macdText}. `;

  if (replayModeEnabled) {
    text += `Replay mode is active, so this is a study session rather than a live simulation stream. `;
  }

  if (strategyResult) {
    text += `The selected strategy returned ${strategyResult.action}. ${strategyResult.reason} `;
  }

  if (position?.quantity > 0) {
    text += `You currently hold ${position.quantity} share(s) at an average cost of $${position.avgCost.toFixed(2)}. `;
    if (riskTone != null) {
      if (riskTone >= 5) {
        text += `This position is nicely extended in your favor. Review whether your take-profit logic still matches the setup. `;
      } else if (riskTone <= -3) {
        text += `This trade is under pressure. Respect your stop discipline if the thesis is weakening. `;
      } else {
        text += `This position is still developing. Watch whether momentum confirms your entry. `;
      }
    }
  } else {
    text += `You do not currently hold a position in ${symbol}. `;
  }

  if (stats.netRealized > 0) {
    text += `Your realized performance is positive at $${stats.netRealized.toFixed(2)}.`;
  } else if (stats.netRealized < 0) {
    text += `Your realized performance is down $${Math.abs(stats.netRealized).toFixed(2)}. Focus on patience and cleaner entries.`;
  } else {
    text += `No realized gain or loss has been locked in yet.`;
  }

  return text;
}