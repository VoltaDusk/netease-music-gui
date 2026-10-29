<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import {
  Play,
  Pause,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  Volume1,
  VolumeX,
  Disc3,
  Heart,
} from "lucide-vue-next";
import { playerState, playerActions } from "../store/player";
import { DEFAULT_COVER_URL } from "../services/api";
import type { SongQuality } from "../types";

const isHoveringProgress = ref(false);
const hoverTime = ref(0);
const hoverPosition = ref(0);
const isQualityMenuOpen = ref(false);

const qualityBadgeMap: Record<SongQuality, string> = {
  jymaster: "MASTER",
  hires: "HI-RES",
  lossless: "LOSSLESS",
  exhigh: "320K",
  higher: "192K",
  standard: "128K",
};

const qualityLabelMap: Record<SongQuality, string> = {
  jymaster: "超清母带",
  hires: "Hi-Res 音质",
  lossless: "无损音质",
  exhigh: "极高音质",
  higher: "较高音质",
  standard: "标准音质",
};

const currentQualityBadge = computed(() => {
  const activeLevel = playerState.quality || playerState.actualQuality || "lossless";
  return qualityBadgeMap[activeLevel] || String(activeLevel).toUpperCase();
});

const currentQualityLabel = computed(() => {
  const activeLevel = playerState.quality || playerState.actualQuality || "lossless";
  return qualityLabelMap[activeLevel] || "无损音质";
});

function toggleQualityMenu() {
  isQualityMenuOpen.value = !isQualityMenuOpen.value;
}

function closeQualityMenu() {
  isQualityMenuOpen.value = false;
}

async function selectQuality(level: SongQuality, available?: boolean) {
  if (available === false) return;
  isQualityMenuOpen.value = false;
  playerState.quality = level;
  playerState.actualQuality = level;
  await playerActions.setQuality(level);
}

onMounted(() => {
  window.addEventListener("click", closeQualityMenu);
});

onUnmounted(() => {
  window.removeEventListener("click", closeQualityMenu);
});

const isLiked = computed(() => {
  return playerState.currentSong ? playerActions.isLiked(playerState.currentSong.id) : false;
});

const progressPercent = computed(() => {
  if (!playerState.duration) return 0;
  return Math.min(100, Math.max(0, (playerState.currentTime / playerState.duration) * 100));
});

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function handleProgressClick(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const percent = Math.min(1, Math.max(0, clickX / rect.width));
  playerActions.seek(percent * playerState.duration);
}

function handleProgressHover(e: MouseEvent) {
  const target = e.currentTarget as HTMLElement;
  const rect = target.getBoundingClientRect();
  const hoverX = e.clientX - rect.left;
  hoverPosition.value = hoverX;
  hoverTime.value = (hoverX / rect.width) * playerState.duration;
}

function handleVolumeChange(e: Event) {
  const target = e.target as HTMLInputElement;
  playerActions.setVolume(parseFloat(target.value));
}

function openVinyl() {
  playerState.isVinylOpen = true;
}

function toggleQueue() {
  playerState.isQueueOpen = !playerState.isQueueOpen;
}

function handleImgError(e: Event) {
  const target = e.target as HTMLImageElement;
  if (target.src !== DEFAULT_COVER_URL) {
    target.src = DEFAULT_COVER_URL;
  }
}
</script>

<template>
  <footer
    class="h-[82px] w-full px-6 flex items-center justify-between select-none border-t border-white/[0.08] bg-[#171916f5] backdrop-blur-xl z-40 relative shadow-2xl"
  >
    <!-- Left: Track Information -->
    <div class="flex items-center gap-3.5 w-1/4 min-w-[200px]">
      <div
        @click="openVinyl"
        class="relative w-[42px] h-[42px] rounded-[8px] overflow-hidden cursor-pointer group shadow-md border border-white/[0.08] flex-shrink-0"
      >
        <img
          :src="playerState.currentSong?.al?.picUrl || DEFAULT_COVER_URL"
          alt="cover"
          @error="handleImgError"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      <div class="flex flex-col overflow-hidden max-w-[170px]">
        <div class="flex items-center gap-2">
          <span
            @click="openVinyl"
            class="text-xs font-bold text-[#f1f0e9] hover:text-[#d6f379] cursor-pointer truncate transition-colors"
          >
            {{ playerState.currentSong?.name || "雾岛 FM" }}
          </span>
          <button
            v-if="playerState.currentSong"
            @click="playerActions.toggleLike(playerState.currentSong.id)"
            class="text-[#8d9188] hover:text-[#d6f379] transition-colors flex-shrink-0"
          >
            <Heart
              class="w-3.5 h-3.5"
              :class="isLiked ? 'text-[#d6f379] fill-[#d6f379]' : 'text-[#8d9188]'"
            />
          </button>
        </div>
        <span class="text-[10px] text-[#8d9188] truncate mt-0.5">
          {{ playerState.currentSong?.ar?.map((a) => a.name).join(" / ") || "让音乐陪你慢下来" }}
        </span>
      </div>
    </div>

    <!-- Center: Playback Controls & Progress Bar -->
    <div class="flex flex-col items-center gap-1.5 w-1/2 max-w-xl">
      <!-- Buttons -->
      <div class="flex items-center gap-5 text-[#9ca095]">
        <!-- Play Mode Toggle -->
        <button
          @click="playerActions.togglePlayMode()"
          class="hover:text-[#f1f0e9] transition-colors"
          :title="
            playerState.playMode === 'sequence'
              ? '顺序播放'
              : playerState.playMode === 'loop'
              ? '单曲循环'
              : '随机播放'
          "
        >
          <Repeat v-if="playerState.playMode === 'sequence'" class="w-3.5 h-3.5" />
          <Repeat1 v-else-if="playerState.playMode === 'loop'" class="w-3.5 h-3.5 text-[#d6f379]" />
          <Shuffle v-else class="w-3.5 h-3.5 text-[#d6f379]" />
        </button>

        <!-- Previous Track -->
        <button
          @click="playerActions.prev()"
          class="hover:text-[#f1f0e9] transition-colors active:scale-95 font-mono text-sm"
          title="上一首"
        >
          |◀
        </button>

        <!-- Play / Pause Main Button (Reference Cream Circle) -->
        <button
          @click="playerActions.togglePlay()"
          class="w-[36px] h-[36px] rounded-full bg-[#eeeede] hover:bg-white text-[#1a1d13] flex items-center justify-center shadow-md active:scale-95 transition-all"
          :title="playerState.isPlaying ? '暂停' : '播放'"
        >
          <Pause v-if="playerState.isPlaying" class="w-4 h-4 fill-[#1a1d13]" />
          <Play v-else class="w-4 h-4 fill-[#1a1d13] translate-x-0.5" />
        </button>

        <!-- Next Track -->
        <button
          @click="playerActions.next()"
          class="hover:text-[#f1f0e9] transition-colors active:scale-95 font-mono text-sm"
          title="下一首"
        >
          ▶|
        </button>

        <!-- Vinyl Disc Fullscreen Button -->
        <button
          @click="openVinyl"
          class="hover:text-[#d6f379] transition-colors"
          title="打开黑胶唱片与全屏歌词"
        >
          <Disc3
            class="w-4 h-4"
            :class="playerState.isPlaying ? 'animate-spin-slow text-[#d6f379]' : ''"
          />
        </button>
      </div>

      <!-- Scrubber Progress Bar -->
      <div class="w-full flex items-center gap-2.5 text-[10px] font-mono text-[#8d9188]">
        <span class="w-8 text-right">{{ formatTime(playerState.currentTime) }}</span>

        <div
          @click="handleProgressClick"
          @mousemove="handleProgressHover"
          @mouseenter="isHoveringProgress = true"
          @mouseleave="isHoveringProgress = false"
          class="relative flex-1 h-3 flex items-center cursor-pointer group"
        >
          <!-- Hover Time Tooltip -->
          <div
            v-if="isHoveringProgress"
            :style="{ left: `${hoverPosition}px` }"
            class="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded-[5px] bg-[#23261f] border border-white/[0.08] text-[9px] text-[#f1f0e9] pointer-events-none shadow-md font-mono"
          >
            {{ formatTime(hoverTime) }}
          </div>

          <!-- Progress Bar Track -->
          <div class="w-full h-[3px] bg-[#44483f] rounded-[5px] overflow-hidden group-hover:h-[4px] transition-all">
            <div
              class="h-full bg-[#d6f379] rounded-[5px] transition-all duration-100"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>

          <!-- Knob -->
          <div
            class="absolute w-2 h-2 rounded-full bg-[#eeeede] shadow opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 pointer-events-none"
            :style="{ left: `${progressPercent}%` }"
          ></div>
        </div>

        <span class="w-8 text-left">{{ formatTime(playerState.duration) }}</span>
      </div>
    </div>

    <!-- Right: Audio Format Tag & Volume & Queue -->
    <div class="flex items-center justify-end gap-4 w-1/4 min-w-[160px] text-[10px] font-mono text-[#9ca095]">
      <!-- Interactive Audio Quality Switcher -->
      <div class="relative hidden sm:inline-block">
        <button
          @click.stop="toggleQualityMenu"
          class="flex items-center gap-1 tracking-[1px] text-[9px] font-mono px-2 py-0.5 rounded-[6px] bg-[#23261f] hover:bg-[#2c3127] text-[#d6f379] border border-[#d6f379]/30 hover:border-[#d6f379]/60 transition-all cursor-pointer shadow-sm active:scale-95"
          :title="`当前音质: ${currentQualityLabel} (点击从 API 切换音质)`"
        >
          <span>{{ currentQualityBadge }}</span>
          <span class="text-[8px] opacity-70 leading-none">▾</span>
        </button>

        <!-- Quality Selection Dropdown Popover -->
        <div
          v-if="isQualityMenuOpen"
          @click.stop
          class="absolute bottom-full right-0 mb-3 w-[205px] p-2 rounded-[12px] bg-[#1a1d17] border border-white/[0.12] shadow-2xl z-50 backdrop-blur-md"
        >
          <div class="px-2 py-1 text-[10px] font-mono font-bold text-[#8d9188] flex items-center justify-between border-b border-white/[0.06] mb-1.5">
            <span>歌曲音质切换</span>
            <span v-if="playerState.isLoading" class="text-[9px] text-[#d6f379] animate-pulse">切换中...</span>
          </div>

          <div class="space-y-1">
            <button
              v-for="opt in playerState.availableQualities"
              :key="opt.level"
              @click="selectQuality(opt.level, opt.available)"
              :disabled="opt.available === false"
              class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] text-left transition-all duration-150"
              :class="[
                playerState.quality === opt.level
                  ? 'bg-[#282d23] text-[#d6f379] font-medium'
                  : opt.available === false
                  ? 'opacity-40 cursor-not-allowed text-[#686d65]'
                  : 'text-[#c6c9c0] hover:text-[#f1f0e9] hover:bg-white/[0.04]'
              ]"
            >
              <div class="flex flex-col">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs">{{ opt.label }}</span>
                  <span
                    class="text-[8px] px-1 py-0.2 rounded font-mono"
                    :class="
                      playerState.quality === opt.level
                        ? 'bg-[#d6f379]/20 text-[#d6f379] border border-[#d6f379]/30'
                        : 'bg-white/5 text-[#8d9188]'
                    "
                  >
                    {{ opt.badge }}
                  </span>
                </div>
                <span class="text-[9px] text-[#8d9188] font-mono mt-0.5">{{ opt.sub }}</span>
              </div>

              <!-- Status indicator -->
              <div class="flex-shrink-0 text-right">
                <span v-if="playerState.quality === opt.level" class="text-xs text-[#d6f379] font-bold">✓</span>
                <span v-else-if="opt.available === false" class="text-[9px] text-[#555] font-mono">暂无</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Volume -->
      <div class="flex items-center gap-2">
        <button
          @click="playerActions.toggleMute()"
          class="hover:text-[#f1f0e9] transition-colors"
        >
          <VolumeX v-if="playerState.isMuted || playerState.volume === 0" class="w-3.5 h-3.5 text-[#ff6b6b]" />
          <Volume1 v-else-if="playerState.volume < 0.5" class="w-3.5 h-3.5" />
          <Volume2 v-else class="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="playerState.volume"
          @input="handleVolumeChange"
          class="w-16 h-[3px] bg-[#44483f] rounded-[5px] appearance-none cursor-pointer accent-[#d6f379]"
        />
      </div>

      <!-- Queue Button -->
      <button
        @click="toggleQueue"
        class="hover:text-[#f1f0e9] transition-colors text-sm"
        :class="playerState.isQueueOpen ? 'text-[#d6f379]' : ''"
        title="播放列表"
      >
        ☷
      </button>
    </div>
  </footer>
</template>
