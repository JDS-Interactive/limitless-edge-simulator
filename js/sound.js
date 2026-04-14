let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function tone(freq, duration, type = "sine", gainVal = 0.03) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainVal;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playBuySound() {
  tone(520, 0.08, "triangle");
  setTimeout(() => tone(660, 0.08, "triangle"), 60);
}

export function playSellSound() {
  tone(420, 0.1, "sawtooth");
  setTimeout(() => tone(300, 0.12, "sawtooth"), 70);
}

export function playAchievementSound() {
  tone(523, 0.08);
  setTimeout(() => tone(659, 0.08), 60);
  setTimeout(() => tone(784, 0.12), 120);
}

export function playErrorSound() {
  tone(200, 0.15, "square", 0.04);
}