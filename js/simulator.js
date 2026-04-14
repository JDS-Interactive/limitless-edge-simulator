function getLastPrice(candles) {
  return candles[candles.length - 1]?.close ?? 0;
}

export function ensurePosition(state, symbol) {
  if (!state.positions[symbol]) {
    state.positions[symbol] = {
      quantity: 0,
      avgCost: 0
    };
  }
  return state.positions[symbol];
}

export function executeBuy(state, symbol, quantity, reason = "Manual entry") {
  const candles = state.candlesBySymbol[symbol] || [];
  const price = getLastPrice(candles);
  const cost = price * quantity;

  if (quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  if (cost > state.cash) {
    throw new Error("Not enough cash for this trade.");
  }

  const position = ensurePosition(state, symbol);
  const newQty = position.quantity + quantity;

  const newAvgCost =
    newQty === 0
      ? 0
      : (position.quantity * position.avgCost + quantity * price) / newQty;

  position.quantity = newQty;
  position.avgCost = Number(newAvgCost.toFixed(4));
  state.cash = Number((state.cash - cost).toFixed(2));
  state.stats.totalTrades += 1;

  state.trades.unshift({
    time: new Date().toLocaleTimeString(),
    symbol,
    action: "BUY",
    quantity,
    price: Number(price.toFixed(2)),
    reason,
    realizedPnL: 0,
    cashAfter: state.cash
  });

  return { price };
}

export function executeSell(state, symbol, quantity, reason = "Manual exit") {
  const candles = state.candlesBySymbol[symbol] || [];
  const price = getLastPrice(candles);

  if (quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  const position = ensurePosition(state, symbol);
  if (quantity > position.quantity) {
    throw new Error("Not enough shares to sell.");
  }

  const realizedPnL = (price - position.avgCost) * quantity;

  position.quantity -= quantity;
  if (position.quantity === 0) {
    position.avgCost = 0;
  }

  const proceeds = price * quantity;
  state.cash = Number((state.cash + proceeds).toFixed(2));
  state.stats.totalTrades += 1;
  state.stats.netRealized = Number((state.stats.netRealized + realizedPnL).toFixed(2));
  state.stats.bestTrade = Math.max(state.stats.bestTrade, realizedPnL);

  if (realizedPnL > 0) {
    state.stats.winningTrades += 1;
  }

  state.trades.unshift({
    time: new Date().toLocaleTimeString(),
    symbol,
    action: "SELL",
    quantity,
    price: Number(price.toFixed(2)),
    reason,
    realizedPnL: Number(realizedPnL.toFixed(2)),
    cashAfter: state.cash
  });

  return { price, realizedPnL };
}

export function calculateEquity(state) {
  let equity = state.cash;

  for (const [symbol, position] of Object.entries(state.positions)) {
    const candles = state.candlesBySymbol[symbol] || [];
    const lastPrice = candles[candles.length - 1]?.close ?? 0;
    equity += position.quantity * lastPrice;
  }

  return Number(equity.toFixed(2));
}

export function applyRiskRules(state) {
  const actions = [];
  const stopLossPct = Number(state.risk.stopLossPct || 0);
  const takeProfitPct = Number(state.risk.takeProfitPct || 0);

  for (const [symbol, position] of Object.entries(state.positions)) {
    if (!position || position.quantity <= 0) continue;

    const candles = state.candlesBySymbol[symbol] || [];
    const lastPrice = candles[candles.length - 1]?.close ?? 0;
    if (!lastPrice || !position.avgCost) continue;

    const pnlPct = ((lastPrice - position.avgCost) / position.avgCost) * 100;

    if (stopLossPct > 0 && pnlPct <= -stopLossPct) {
      const result = executeSell(state, symbol, position.quantity, "Stop loss triggered");
      actions.push({
        type: "STOP_LOSS",
        symbol,
        result
      });
      continue;
    }

    if (takeProfitPct > 0 && pnlPct >= takeProfitPct) {
      const result = executeSell(state, symbol, position.quantity, "Take profit triggered");
      actions.push({
        type: "TAKE_PROFIT",
        symbol,
        result
      });
    }
  }

  return actions;
}