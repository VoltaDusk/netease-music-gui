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
  SkipBack,
  SkipForward,
  ListMusic,
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
    class="player-bar h-[80px] w-full px-5 flex items-center justify-between select-none border-t border-[var(--player-border)] bg-[var(--player-bg)] backdrop-blur-xl z-40 relative shadow-2xl"
  >
    <!-- Left: Track Information -->
    <div class="player-track-info flex items-center gap-3 w-1/4 min-w-[210px]">
      <div
        @click="openVinyl"
        class="relative w-[48px] h-[48px] rounded-[9px] overflow-hidden cursor-pointer group shadow-md border border-[var(--border)] shrink-0"
        title="点击打开全屏黑胶与歌词"
      >
        <img
          :src="playerState.currentSong?.al?.picUrl || DEFAULT_COVER_URL"
          alt="cover"
          @error="handleImgError"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Disc3 class="w-4 h-4 text-white animate-spin-slow" />
        </div>
      </div>

      <div class="flex flex-col min-w-0 max-w-[170px]">
        <div class="flex items-center gap-2">
          <span
            @click="openVinyl"
            class="text-xs font-bold text-[var(--text-primary)] hover:text-[var(--accent)] cursor-pointer truncate transition-colors"
          >
            {{ playerState.currentSong?.name || "雾岛 FM" }}
          </span>
          <button
            v-if="playerState.currentSong"
            @click="playerActions.toggleLike(playerState.currentSong.id)"
            class="text-[var(--text-muted)] hover:text-[#ec4141] transition-transform active:scale-125 shrink-0"
            title="喜欢这首歌"
          >
            <Heart
              class="w-3.5 h-3.5"
              :class="isLiked ? 'text-[#ec4141] fill-[#ec4141]' : 'text-[var(--text-muted)]'"
            />
          </button>
        </div>
        <span class="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
          {{ playerState.currentSong?.ar?.map((a) => a.name).join(" / ") || "让音乐陪你慢下来" }}
        </span>
      </div>
    </div>

    <!-- Center: Playback Controls & Progress Bar -->
    <div class="player-center-controls flex flex-col items-center gap-1.5 w-1/2 max-w-xl">
      <!-- Transport Buttons -->
      <div class="flex items-center gap-5 text-[var(--text-secondary)]">
        <!-- Play Mode Toggle -->
        <button
          @click="playerActions.togglePlayMode()"
          class="hover:text-[var(--text-primary)] transition-colors p-1"
          :title="
            playerState.playMode === 'sequence'
              ? '顺序播放'
              : playerState.playMode === 'loop'
              ? '单曲循环'
              : '随机播放'
          "
        >
          <Repeat v-if="playerState.playMode === 'sequence'" class="w-3.5 h-3.5" />
          <Repeat1 v-else-if="playerState.playMode === 'loop'" class="w-3.5 h-3.5 text-[var(--accent)]" />
          <Shuffle v-else class="w-3.5 h-3.5 text-[var(--accent)]" />
        </button>

        <!-- Previous Track -->
        <button
          @click="playerActions.prev()"
          class="hover:text-[var(--text-primary)] transition-all active:scale-90 p-1"
          title="上一首"
        >
          <SkipBack class="w-4 h-4 fill-current" />
        </button>

        <!-- Play / Pause Main Button -->
        <button
          @click="playerActions.togglePlay()"
          class="w-[38px] h-[38px] rounded-full bg-[var(--text-primary)] text-[var(--app-bg)] hover:scale-105 active:scale-95 flex items-center justify-center shadow-md transition-all cursor-pointer"
          :title="playerState.isPlaying ? '暂停' : '播放'"
        >
          <Pause v-if="playerState.isPlaying" class="w-4 h-4 fill-current" />
          <Play v-else class="w-4 h-4 fill-current translate-x-0.5" />
        </button>

        <!-- Next Track -->
        <button
          @click="playerActions.next()"
          class="hover:text-[var(--text-primary)] transition-all active:scale-90 p-1"
          title="下一首"
        >
          <SkipForward class="w-4 h-4 fill-current" />
        </button>

        <!-- Vinyl Disc Fullscreen Button -->
        <button
          @click="openVinyl"
          class="hover:text-[var(--accent)] transition-colors p-1"
          title="打开黑胶唱片与全屏歌词"
        >
          <Disc3
            class="w-4 h-4"
            :class="playerState.isPlaying ? 'animate-spin-slow text-[var(--accent)]' : ''"
          />
        </button>
      </div>

      <!-- Scrubber Progress Bar -->
      <div class="player-scrubber w-full flex items-center gap-2.5 text-[10px] font-mono text-[var(--text-muted)]">
        <span class="w-8 text-right shrink-0">{{ formatTime(playerState.currentTime) }}</span>

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
            class="absolute -top-6 -translate-x-1/2 px-1.5 py-0.5 rounded-[5px] bg-[var(--popover-bg)] border border-[var(--border)] text-[9px] text-[var(--text-primary)] pointer-events-none shadow-md font-mono"
          >
            {{ formatTime(hoverTime) }}
          </div>

          <!-- Progress Bar Track -->
          <div class="w-full h-[3px] bg-[var(--card-hover)] border border-[var(--border-subtle)] rounded-full overflow-hidden group-hover:h-[5px] transition-all">
            <div
              class="h-full bg-[var(--accent)] rounded-full transition-all duration-100"
              :style="{ width: `${progressPercent}%` }"
            ></div>
          </div>

          <!-- Knob -->
          <div
            class="absolute w-2.5 h-2.5 rounded-full bg-white shadow-md border border-black/20 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1/2 pointer-events-none"
            :style="{ left: `${progressPercent}%` }"
          ></div>
        </div>

        <span class="w-8 text-left shrink-0">{{ formatTime(playerState.duration) }}</span>
      </div>
    </div>

    <!-- Right: Audio Format Tag & Volume & Queue -->
    <div class="player-side-controls flex items-center justify-end gap-3.5 w-1/4 min-w-[170px] text-[10px] font-mono text-[var(--text-secondary)]">
      <!-- Interactive Audio Quality Switcher -->
      <div class="player-quality-switcher relative hidden sm:inline-block shrink-0">
        <button
          @click.stop="toggleQualityMenu"
          class="flex items-center gap-1 shrink-0 tracking-[1px] text-[9px] font-mono font-bold px-2 py-0.5 rounded-[6px] bg-[var(--card-hover)] hover:bg-[var(--card-active)] text-[var(--accent)] border border-[var(--accent-border)] transition-all cursor-pointer shadow-sm active:scale-95"
          :title="`当前音质: ${currentQualityLabel} (点击切换)`"
        >
          <span>{{ currentQualityBadge }}</span>
          <span class="text-[8px] opacity-70 leading-none">▾</span>
        </button>

        <!-- Quality Selection Dropdown Popover -->
        <div
          v-if="isQualityMenuOpen"
          @click.stop
          class="absolute bottom-full right-0 mb-3 w-[210px] p-2 rounded-[12px] bg-[var(--popover-bg)] border border-[var(--border)] shadow-2xl z-50 backdrop-blur-md"
        >
          <div class="px-2 py-1 text-[10px] font-mono font-bold text-[var(--text-muted)] flex items-center justify-between border-b border-[var(--border-subtle)] mb-1.5">
            <span>切换歌曲音质</span>
            <span v-if="playerState.isLoading" class="text-[9px] text-[var(--accent)] animate-pulse">请求中...</span>
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
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                  : opt.available === false
                  ? 'opacity-40 cursor-not-allowed text-[var(--text-subtle)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)]'
              ]"
            >
              <div class="flex flex-col">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs">{{ opt.label }}</span>
                  <span
                    class="text-[8px] px-1 py-0.2 rounded font-mono"
                    :class="
                      playerState.quality === opt.level
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-border)]'
                        : 'bg-black/5 dark:bg-white/5 text-[var(--text-muted)]'
                    "
                  >
                    {{ opt.badge }}
                  </span>
                </div>
                <span class="text-[9px] text-[var(--text-muted)] font-mono mt-0.5">{{ opt.sub }}</span>
              </div>

              <!-- Status indicator -->
              <div class="shrink-0 text-right">
                <span v-if="playerState.quality === opt.level" class="text-xs text-[var(--accent)] font-bold">✓</span>
                <span v-else-if="opt.available === false" class="text-[9px] text-[var(--text-subtle)] font-mono">暂无</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- Volume -->
      <div class="player-volume-control flex items-center gap-1.5 shrink-0">
        <button
          @click="playerActions.toggleMute()"
          class="hover:text-[var(--text-primary)] transition-colors p-1"
          :title="playerState.isMuted ? '取消静音' : '静音'"
        >
          <VolumeX v-if="playerState.isMuted || playerState.volume === 0" class="w-3.5 h-3.5 text-[#ec4141]" />
          <Volume1 v-else-if="playerState.volume < 0.5" class="w-3.5 h-3.5" />
          <Volume2 v-else class="w-3.5 h-3.5" />
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          :value="playerState.isMuted ? 0 : playerState.volume"
          @input="handleVolumeChange"
          class="volume-slider w-16 h-[3px] bg-[var(--card-hover)] rounded-full appearance-none cursor-pointer accent-[var(--accent)]"
        />
      </div>

      <!-- Queue Button -->
      <button
        @click="toggleQueue"
        class="queue-toggle p-1.5 rounded-[7px] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-colors shrink-0"
        :class="playerState.isQueueOpen ? 'text-[var(--accent)] bg-[var(--accent-soft)]' : ''"
        title="当前播放队列"
      >
        <ListMusic class="w-4 h-4" :stroke-width="1.8" />
      </button>
    </div>
  </footer>
</template>
