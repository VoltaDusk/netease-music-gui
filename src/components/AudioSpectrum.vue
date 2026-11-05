<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import { Activity, Sparkles, Waves, BarChart2 } from "lucide-vue-next";
import { playerState } from "../store/player";

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

// Dynamic physical audio simulation
let simTime = 0;
let lastTimestamp = performance.now();
let lyricEnergy = 0;

watch(
  () => playerState.currentLyricIndex,
  () => {
    // Vocal shift pulse
    lyricEnergy = 0.45;
  }
);

function updatePhysics(dt: number) {
  const isPlaying = playerState.isPlaying;
  const vol = playerState.isMuted ? 0 : playerState.volume || 0.8;
  const cTime = playerState.currentTime;

  if (isPlaying) {
    simTime += dt * 0.0035;
  } else {
    simTime += dt * 0.0006; // Gentle breathing drift when paused
  }

  if (lyricEnergy > 0) {
    lyricEnergy = Math.max(0, lyricEnergy - dt * 0.001);
  }

  // Musical rhythmic pulses
  const tempoBeat = Math.pow(Math.max(0, Math.sin(simTime * 2.8 + (cTime % 2) * 1.5)), 5);
  const kickPulse = Math.pow(Math.max(0, Math.sin(simTime * 1.4)), 6);
  const subBass = Math.pow(Math.max(0, Math.sin(simTime * 0.95)), 4);

  for (let i = 0; i < BAR_COUNT; i++) {
    const normIdx = i / (BAR_COUNT - 1); // 0 to 1
    let target = 0;

    if (isPlaying && vol > 0) {
      // 1. Low frequency power (bars 0-18): Sub-bass & Bass kick
      const bassWeight = Math.max(0, 1 - normIdx * 2.1);
      const bassComponent = (subBass * 0.65 + kickPulse * 0.85 + tempoBeat * 0.5) * bassWeight;

      // 2. Mid frequency vocal/melody waves (bars 15-45)
      const midWave = Math.sin(simTime * 4.2 + normIdx * 9.5) * 0.35 + 0.35;
      const vocalHarmonics = Math.sin(simTime * 7.0 + normIdx * 14.0) * 0.2 + 0.2;
      const midWeight = Math.sin(normIdx * Math.PI) * (0.8 + lyricEnergy * 0.5);
      const midComponent = (midWave + vocalHarmonics) * midWeight;

      // 3. High frequency shimmer & percussion (bars 35-63)
      const highWave = Math.sin(simTime * 9.5 + normIdx * 18.0) * 0.22 + 0.22;
      const shimmer = Math.sin(simTime * 18.0 + i * 2.5) * 0.18;
      const highWeight = Math.pow(normIdx, 0.85);
      const highComponent = (highWave + shimmer) * highWeight;

      // Natural acoustic curve (pink noise falloff)
      const acousticCurve = Math.pow(1 - normIdx * 0.3, 1.15);
      const combined = (bassComponent + midComponent + highComponent) * acousticCurve;

      target = Math.max(0.04, Math.min(0.95, combined * vol * 1.1));
    } else {
      // Idle tranquil undulating calm wave
      const idleWave = Math.sin(simTime * 2.0 + normIdx * 4.0) * 0.02 + 0.025;
      target = idleWave;
    }

    // Dynamic smoothing response (fast attack, smooth natural decay)
    const current = barHeights[i];
    const attackSpeed = 0.35;
    const releaseSpeed = 0.14;
    const speed = target > current ? attackSpeed : releaseSpeed;
    barHeights[i] += (target - current) * speed;

    // Peak holding & gravity falloff
    if (barHeights[i] >= peakHeights[i]) {
      peakHeights[i] = barHeights[i];
      peakDrops[i] = 0;
    } else {
      peakDrops[i] += 0.0016 * (dt / 16);
      peakHeights[i] = Math.max(barHeights[i], peakHeights[i] - peakDrops[i]);
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
  // Fallback to standard rect
  ctx.fillRect(x, y, w, h);
}

// Mode 1: 炫彩柱状 (Spectrum Bars with Floating Peak Caps & Glass Reflection)
function renderBars(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  isLight: boolean
) {
  const baseMarginBottom = 14;
  const maxBarHeight = height - baseMarginBottom - 16;
  const barGap = 3.5;
  const totalGap = (BAR_COUNT - 1) * barGap;
  const barWidth = Math.max(3, (width - 48 - totalGap) / BAR_COUNT);
  const startX = (width - (BAR_COUNT * barWidth + totalGap)) / 2;
  const baselineY = height - baseMarginBottom;

  for (let i = 0; i < BAR_COUNT; i++) {
    const x = startX + i * (barWidth + barGap);
    const ratio = i / (BAR_COUNT - 1);
    const bHeight = Math.max(2.5, barHeights[i] * maxBarHeight);
    const y = baselineY - bHeight;

    // Main vibrant gradient for this frequency column
    const barGradient = ctx.createLinearGradient(0, baselineY, 0, y);
    const baseColor = getVibrantColor(ratio, isLight ? 0.75 : 0.85);
    const peakColor = getVibrantColor(Math.min(1, ratio + 0.12), 1);
    barGradient.addColorStop(0, baseColor);
    barGradient.addColorStop(1, peakColor);

    ctx.save();
    // Ambient glow halo
    ctx.shadowBlur = isLight ? 6 : 10;
    ctx.shadowColor = getVibrantColor(ratio, isLight ? 0.35 : 0.65);

    // Draw main bar with rounded top
    ctx.fillStyle = barGradient;
    const r = Math.min(barWidth / 2, 3);
    drawRoundRect(ctx, x, y, barWidth, bHeight, [r, r, 0, 0]);

    // Floating Peak Cap (High-Fi style)
    const peakH = peakHeights[i] * maxBarHeight;
    const peakY = Math.max(2, baselineY - peakH - 3.5);
    ctx.fillStyle = isLight ? "#1a1d17" : "#ffffff";
    ctx.shadowBlur = isLight ? 2 : 5;
    ctx.shadowColor = isLight ? "rgba(0,0,0,0.25)" : "#ffffff";
    drawRoundRect(ctx, x, peakY, barWidth, 2, [1, 1, 1, 1]);

    // Subtle Glass Floor Inverted Reflection
    const reflectH = bHeight * 0.28;
    const reflectGrad = ctx.createLinearGradient(0, baselineY, 0, baselineY + reflectH);
    reflectGrad.addColorStop(0, getVibrantColor(ratio, isLight ? 0.25 : 0.35));
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
  const baselineY = height - 10;
  const layers = [
    { colorA: "#10b981", colorB: "#06b6d4", speed: 1.0, amp: 0.9, alpha: isLight ? 0.45 : 0.4 },
    { colorA: "#3b82f6", colorB: "#8b5cf6", speed: 1.3, amp: 0.75, alpha: isLight ? 0.4 : 0.35 },
    { colorA: "#ec4899", colorB: "#f59e0b", speed: 0.8, amp: 0.6, alpha: isLight ? 0.35 : 0.3 },
  ];

  layers.forEach((layer, layerIdx) => {
    ctx.save();
    const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
    waveGrad.addColorStop(0, layer.colorA);
    waveGrad.addColorStop(1, layer.colorB);

    ctx.fillStyle = waveGrad;
    ctx.globalAlpha = layer.alpha;
    ctx.shadowBlur = isLight ? 8 : 16;
    ctx.shadowColor = layer.colorB;

    ctx.beginPath();
    ctx.moveTo(0, baselineY);

    const step = width / (BAR_COUNT - 1);
    for (let i = 0; i < BAR_COUNT; i++) {
      const x = i * step;
      const idxOffset = (i + layerIdx * 8) % BAR_COUNT;
      const h = barHeights[idxOffset] * (height - 20) * layer.amp;
      const y = baselineY - h;

      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        const prevX = (i - 1) * step;
        const prevIdx = (i - 1 + layerIdx * 8) % BAR_COUNT;
        const prevY = baselineY - barHeights[prevIdx] * (height - 20) * layer.amp;
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

// Mode 3: 镜像律动 (Symmetrical Dual-Sided Equalizer)
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

  for (let i = 0; i < BAR_COUNT; i++) {
    const x = startX + i * (barWidth + barGap);
    const ratio = i / (BAR_COUNT - 1);
    const halfH = Math.max(2, (barHeights[i] * (height - 18)) / 2);

    const grad = ctx.createLinearGradient(0, centerY - halfH, 0, centerY + halfH);
    grad.addColorStop(0, getVibrantColor(ratio, 1));
    grad.addColorStop(0.5, getVibrantColor(Math.min(1, ratio + 0.1), 0.7));
    grad.addColorStop(1, getVibrantColor(ratio, 1));

    ctx.save();
    ctx.shadowBlur = isLight ? 4 : 8;
    ctx.shadowColor = getVibrantColor(ratio, 0.4);
    ctx.fillStyle = grad;

    const r = Math.min(barWidth / 2, 2.5);
    drawRoundRect(ctx, x, centerY - halfH, barWidth, halfH * 2, [r, r, r, r]);
    ctx.fill();
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
  <div class="spectrum-container relative w-full h-20 flex items-end justify-center select-none overflow-hidden">
    <!-- Visualizer Canvas -->
    <canvas ref="canvasRef" class="w-full h-full block pointer-events-none"></canvas>

    <!-- Spectrum Mode Switcher & Indicator -->
    <div class="absolute bottom-1 right-6 z-20 flex items-center gap-2 pointer-events-auto">
      <button
        @click="toggleMode"
        class="spectrum-toggle-btn flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-[#a8aca3] hover:text-[#f1f0e9] border border-white/[0.08] backdrop-blur-md transition-all text-[11px] shadow-sm active:scale-95 cursor-pointer"
        :title="`当前频谱模式：${modeList.find(m => m.key === currentMode)?.label}（点击切换）`"
      >
        <Sparkles class="w-3 h-3 text-[#d6f379] animate-pulse" />
        <span class="tracking-wide">{{ modeList.find((m) => m.key === currentMode)?.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.spectrum-container {
  mask-image: linear-gradient(to right, transparent, black 3%, black 97%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 3%, black 97%, transparent);
}

:global(html.light) .spectrum-toggle-btn {
  background-color: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.08);
  color: #555950;
}

:global(html.light) .spectrum-toggle-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: #1a1d17;
}
</style>
