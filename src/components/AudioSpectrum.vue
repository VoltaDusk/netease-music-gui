<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { Activity, Sparkles, Waves, BarChart2 } from "lucide-vue-next";
import { playerState, getAudioAnalyser } from "../store/player";

type SpectrumMode = "bars" | "wave" | "mirror";

const canvasRef = ref<HTMLCanvasElement | null>(null);
const currentMode = ref<SpectrumMode>(
  (localStorage.getItem("cloudmusic_spectrum_mode") as SpectrumMode) || "bars"
);

const modeList: { key: SpectrumMode; label: string; icon: any }[] = [
  { key: "bars", label: "炫彩柱状", icon: BarChart2 },
  { key: "wave", label: "极光波浪", icon: Waves },
  { key: "mirror", label: "对称律动", icon: Activity },
];

function toggleMode() {
  const currentIndex = modeList.findIndex((m) => m.key === currentMode.value);
  const nextIndex = (currentIndex + 1) % modeList.length;
  currentMode.value = modeList[nextIndex].key;
  localStorage.setItem("cloudmusic_spectrum_mode", currentMode.value);
}

let animationFrameId: number | null = null;
let resizeObserver: ResizeObserver | null = null;

// Bar counts and states
const BAR_COUNT = 64;
const barHeights = new Float32Array(BAR_COUNT);
const peakHeights = new Float32Array(BAR_COUNT);
const peakDrops = new Float32Array(BAR_COUNT);

// Logarithmic bin index mapping for 64 bars over 128 FFT frequency bins
// Spreads sub-bass, kick, vocals, mids, and treble across the spectrum naturally
const binIndices = new Int32Array(BAR_COUNT);
for (let i = 0; i < BAR_COUNT; i++) {
  const norm = i / (BAR_COUNT - 1);
  binIndices[i] = Math.min(126, Math.floor(Math.pow(norm, 1.55) * 115));
}

// FFT Frequency Buffer
const rawFreqData = new Uint8Array(128);

// Multi-color palette interpolation (Lime -> Cyan -> Blue -> Purple -> Pink -> Amber)
const COLOR_STOPS = [
  { pos: 0.0, r: 214, g: 243, b: 121 }, // #d6f379 Lime
  { pos: 0.2, r: 6, g: 182, b: 212 },   // #06b6d4 Cyan
  { pos: 0.4, r: 59, g: 130, b: 246 },  // #3b82f6 Blue
  { pos: 0.6, r: 139, g: 92, b: 246 },  // #8b5cf6 Purple
  { pos: 0.8, r: 236, g: 72, b: 153 },  // #ec4899 Pink
  { pos: 1.0, r: 245, g: 158, b: 11 },  // #f59e0b Amber
];

function getVibrantColor(ratio: number, alpha = 1): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  let lower = COLOR_STOPS[0];
  let upper = COLOR_STOPS[COLOR_STOPS.length - 1];

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    if (clamped >= COLOR_STOPS[i].pos && clamped <= COLOR_STOPS[i + 1].pos) {
      lower = COLOR_STOPS[i];
      upper = COLOR_STOPS[i + 1];
      break;
    }
  }

  const range = upper.pos - lower.pos || 1;
  const factor = (clamped - lower.pos) / range;
  const r = Math.round(lower.r + (upper.r - lower.r) * factor);
  const g = Math.round(lower.g + (upper.g - lower.g) * factor);
  const b = Math.round(lower.b + (upper.b - lower.b) * factor);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Canvas CSS dimensions
let cssWidth = 0;
let cssHeight = 0;

// Dynamic physical audio simulation fallback
let simTime = 0;
let lastTimestamp = performance.now();

function updatePhysics(dt: number) {
  const isPlaying = playerState.isPlaying;
  const vol = playerState.isMuted ? 0 : playerState.volume || 0.8;

  // Attempt to read real audio frequency data from Web Audio API AnalyserNode
  const analyser = getAudioAnalyser();
  let hasRealAudio = false;

  if (analyser && isPlaying && vol > 0) {
    analyser.getByteFrequencyData(rawFreqData);
    // Verify if there is non-zero acoustic energy
    for (let j = 0; j < 128; j++) {
      if (rawFreqData[j] > 0) {
        hasRealAudio = true;
        break;
      }
    }
  }

  if (hasRealAudio) {
    // 100% Real Audio Frequency Analysis (真实时音频高低音分析)
    for (let i = 0; i < BAR_COUNT; i++) {
      const bin = binIndices[i];
      const valA = rawFreqData[bin] || 0;
      const valB = bin < 127 ? (rawFreqData[bin + 1] || 0) : valA;
      const rawVal = valA * 0.7 + valB * 0.3;

      const norm = i / (BAR_COUNT - 1);
      // Frequency acoustic equal-loudness boost (compensating for human hearing and natural pink-noise mix rolloff)
      // Bass gets solid punch, mids get rich presence, highs get crystal-clear shimmer
      const boost = 1.15 + Math.pow(norm, 0.85) * 2.35;
      const perceived = Math.pow(rawVal / 255.0, 0.82) * boost;
      const target = Math.max(0.03, Math.min(1.0, perceived * vol * 1.12));

      // Snappy attack, smooth natural decay
      const current = barHeights[i];
      const speed = target > current ? 0.48 : 0.18;
      barHeights[i] += (target - current) * speed;

      // Peak holding & gravity falloff
      if (barHeights[i] >= peakHeights[i]) {
        peakHeights[i] = barHeights[i];
        peakDrops[i] = 0;
      } else {
        peakDrops[i] += 0.0028 * (dt / 16);
        peakHeights[i] = Math.max(barHeights[i], peakHeights[i] - peakDrops[i]);
      }
    }
  } else {
    // Fallback if audio context is buffering or paused
    if (isPlaying && vol > 0) {
      simTime += dt * 0.004;
      const kick = Math.pow(Math.max(0, Math.sin(simTime * 2.6)), 5);
      const mid = Math.sin(simTime * 4.2) * 0.3 + 0.3;

      for (let i = 0; i < BAR_COUNT; i++) {
        const norm = i / (BAR_COUNT - 1);
        const bTarget = Math.max(0.04, (kick * (1 - norm) + mid * Math.sin(norm * Math.PI)) * vol * 0.6);
        const current = barHeights[i];
        barHeights[i] += (bTarget - current) * 0.25;

        if (barHeights[i] >= peakHeights[i]) {
          peakHeights[i] = barHeights[i];
          peakDrops[i] = 0;
        } else {
          peakDrops[i] += 0.002 * (dt / 16);
          peakHeights[i] = Math.max(barHeights[i], peakHeights[i] - peakDrops[i]);
        }
      }
    } else {
      // Paused state: Smoothly collapse to a quiet 2px baseline
      for (let i = 0; i < BAR_COUNT; i++) {
        barHeights[i] += (0.02 - barHeights[i]) * 0.12;
        peakHeights[i] += (0.02 - peakHeights[i]) * 0.12;
      }
    }
  }
}

function render() {
  const canvas = canvasRef.value;
  if (!canvas || cssWidth <= 0 || cssHeight <= 0) {
    animationFrameId = requestAnimationFrame(render);
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const now = performance.now();
  const dt = Math.min(40, now - lastTimestamp);
  lastTimestamp = now;

  updatePhysics(dt);

  const dpr = window.devicePixelRatio || 1;
  const isLight = document.documentElement.classList.contains("light");

  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  if (currentMode.value === "bars") {
    renderBars(ctx, cssWidth, cssHeight, isLight);
  } else if (currentMode.value === "wave") {
    renderWaves(ctx, cssWidth, cssHeight, isLight);
  } else {
    renderMirror(ctx, cssWidth, cssHeight, isLight);
  }

  ctx.restore();

  animationFrameId = requestAnimationFrame(render);
}

// Helper to draw rounded rectangle safely across browsers
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radii: number[]
) {
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radii);
    ctx.fill();
    return;
  }
  ctx.fillRect(x, y, w, h);
}

// Mode 1: 炫彩柱状 (High-Impact Spectrum Bars with Peak Caps & Reflection)
function renderBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isLight: boolean
) {
  const baseMarginBottom = 16;
  const maxBarHeight = height - baseMarginBottom - 16; // Up to 80px high
  const barGap = 3.5;
  const totalGap = (BAR_COUNT - 1) * barGap;
  const barWidth = Math.max(3, (width - 48 - totalGap) / BAR_COUNT);
  const startX = (width - (BAR_COUNT * barWidth + totalGap)) / 2;
  const baselineY = height - baseMarginBottom;

  for (let i = 0; i < BAR_COUNT; i++) {
    const x = startX + i * (barWidth + barGap);
    const ratio = i / (BAR_COUNT - 1);
    const bHeight = Math.max(3, barHeights[i] * maxBarHeight);
    const y = baselineY - bHeight;

    // Main vibrant gradient for this frequency column
    const barGradient = ctx.createLinearGradient(0, baselineY, 0, y);
    const baseColor = getVibrantColor(ratio, isLight ? 0.8 : 0.88);
    const peakColor = getVibrantColor(Math.min(1, ratio + 0.12), 1);
    barGradient.addColorStop(0, baseColor);
    barGradient.addColorStop(1, peakColor);

    ctx.save();
    // Ambient glow halo
    ctx.shadowBlur = isLight ? 6 : 12;
    ctx.shadowColor = getVibrantColor(ratio, isLight ? 0.35 : 0.7);

    // Draw main bar with rounded top
    ctx.fillStyle = barGradient;
    const r = Math.min(barWidth / 2, 3);
    drawRoundRect(ctx, x, y, barWidth, bHeight, [r, r, 0, 0]);

    // Floating Peak Cap (High-Fi style)
    const peakH = peakHeights[i] * maxBarHeight;
    const peakY = Math.max(3, baselineY - peakH - 4);
    ctx.fillStyle = isLight ? "#1a1d17" : "#ffffff";
    ctx.shadowBlur = isLight ? 3 : 6;
    ctx.shadowColor = isLight ? "rgba(0,0,0,0.3)" : "#ffffff";
    drawRoundRect(ctx, x, peakY, barWidth, 2.5, [1, 1, 1, 1]);

    // Glass Floor Inverted Reflection
    const reflectH = bHeight * 0.28;
    const reflectGrad = ctx.createLinearGradient(0, baselineY, 0, baselineY + reflectH);
    reflectGrad.addColorStop(0, getVibrantColor(ratio, isLight ? 0.28 : 0.38));
    reflectGrad.addColorStop(1, getVibrantColor(ratio, 0));
    ctx.fillStyle = reflectGrad;
    drawRoundRect(ctx, x, baselineY + 1, barWidth, reflectH, [0, 0, r, r]);

    ctx.restore();
  }
}

// Mode 2: 极光波浪 (Cyber Aurora Waves)
function renderWaves(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isLight: boolean
) {
  const baselineY = height - 12;
  const layers = [
    { colorA: "#10b981", colorB: "#06b6d4", speed: 1.0, amp: 1.0, alpha: isLight ? 0.48 : 0.45 },
    { colorA: "#3b82f6", colorB: "#8b5cf6", speed: 1.3, amp: 0.85, alpha: isLight ? 0.42 : 0.4 },
    { colorA: "#ec4899", colorB: "#f59e0b", speed: 0.8, amp: 0.7, alpha: isLight ? 0.38 : 0.35 },
  ];

  layers.forEach((layer, layerIdx) => {
    ctx.save();
    const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
    waveGrad.addColorStop(0, layer.colorA);
    waveGrad.addColorStop(1, layer.colorB);

    ctx.fillStyle = waveGrad;
    ctx.globalAlpha = layer.alpha;
    ctx.shadowBlur = isLight ? 8 : 18;
    ctx.shadowColor = layer.colorB;

    ctx.beginPath();
    ctx.moveTo(0, baselineY);

    const step = width / (BAR_COUNT - 1);
    for (let i = 0; i < BAR_COUNT; i++) {
      const x = i * step;
      const idxOffset = (i + layerIdx * 8) % BAR_COUNT;
      const h = barHeights[idxOffset] * (height - 24) * layer.amp;
      const y = baselineY - h;

      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        const prevX = (i - 1) * step;
        const prevIdx = (i - 1 + layerIdx * 8) % BAR_COUNT;
        const prevY = baselineY - barHeights[prevIdx] * (height - 24) * layer.amp;
        const cX = (prevX + x) / 2;
        const cY = (prevY + y) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cX, cY);
      }
    }

    ctx.lineTo(width, baselineY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

// Mode 3: 对称律动 (High-Impact Mirrored Dual-Sided Equalizer)
function renderMirror(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isLight: boolean
) {
  const centerY = height / 2;
  const barGap = 3.5;
  const totalGap = (BAR_COUNT - 1) * barGap;
  const barWidth = Math.max(3, (width - 48 - totalGap) / BAR_COUNT);
  const startX = (width - (BAR_COUNT * barWidth + totalGap)) / 2;
  const maxHalfH = centerY - 8; // Expands up to 48px each direction (total 96px!)

  for (let i = 0; i < BAR_COUNT; i++) {
    const x = startX + i * (barWidth + barGap);
    const ratio = i / (BAR_COUNT - 1);
    const halfH = Math.max(3, barHeights[i] * maxHalfH);

    const grad = ctx.createLinearGradient(0, centerY - halfH, 0, centerY + halfH);
    grad.addColorStop(0, getVibrantColor(ratio, 1));
    grad.addColorStop(0.5, getVibrantColor(Math.min(1, ratio + 0.1), 0.75));
    grad.addColorStop(1, getVibrantColor(ratio, 1));

    ctx.save();
    ctx.shadowBlur = isLight ? 6 : 10;
    ctx.shadowColor = getVibrantColor(ratio, 0.5);
    ctx.fillStyle = grad;

    const r = Math.min(barWidth / 2, 2.5);
    // Draw mirrored bar
    drawRoundRect(ctx, x, centerY - halfH, barWidth, halfH * 2, [r, r, r, r]);

    // Floating Peak Cap (Top)
    const topPeakY = centerY - peakHeights[i] * maxHalfH - 3.5;
    ctx.fillStyle = isLight ? "#1a1d17" : "#ffffff";
    ctx.shadowBlur = isLight ? 2 : 5;
    ctx.shadowColor = isLight ? "rgba(0,0,0,0.25)" : "#ffffff";
    drawRoundRect(ctx, x, topPeakY, barWidth, 2, [1, 1, 1, 1]);

    // Floating Peak Cap (Bottom)
    const bottomPeakY = centerY + peakHeights[i] * maxHalfH + 1.5;
    drawRoundRect(ctx, x, bottomPeakY, barWidth, 2, [1, 1, 1, 1]);

    ctx.restore();
  }
}

function handleResize() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  cssWidth = rect.width;
  cssHeight = rect.height;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
}

onMounted(() => {
  handleResize();
  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(canvasRef.value);
  }
  animationFrameId = requestAnimationFrame(render);
});

onBeforeUnmount(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<template>
  <div class="spectrum-container relative w-full h-28 flex items-end justify-center select-none overflow-hidden">
    <!-- Visualizer Canvas -->
    <canvas ref="canvasRef" class="w-full h-full block pointer-events-none"></canvas>

    <!-- Spectrum Mode Switcher & Indicator -->
    <div class="absolute bottom-2 right-6 z-20 flex items-center gap-2 pointer-events-auto">
      <button
        @click="toggleMode"
        class="spectrum-toggle-btn flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-[#c4c8be] hover:text-[#f1f0e9] border border-white/[0.1] backdrop-blur-md transition-all text-[11px] shadow-sm active:scale-95 cursor-pointer"
        :title="`当前频谱模式：${modeList.find(m => m.key === currentMode)?.label}（点击切换）`"
      >
        <Sparkles class="w-3.5 h-3.5 text-[#d6f379] animate-pulse" />
        <span class="tracking-wide">{{ modeList.find((m) => m.key === currentMode)?.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.spectrum-container {
  mask-image: linear-gradient(to right, transparent, black 2.5%, black 97.5%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 2.5%, black 97.5%, transparent);
}

:global(html.light) .spectrum-toggle-btn {
  background-color: rgba(0, 0, 0, 0.06);
  border-color: rgba(0, 0, 0, 0.1);
  color: #3b4233;
}

:global(html.light) .spectrum-toggle-btn:hover {
  background-color: rgba(0, 0, 0, 0.12);
  color: #12160e;
}
</style>
