<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { ChevronDown, Heart, Music, Play, Pause } from "lucide-vue-next";
import { playerState, playerActions } from "../store/player";
import { DEFAULT_COVER_URL } from "../services/api";
import AudioSpectrum from "./AudioSpectrum.vue";

const lyricsContainer = ref<HTMLElement | null>(null);

function close() {
  playerState.isVinylOpen = false;
}

function handleImgError(e: Event) {
  const target = e.target as HTMLImageElement;
  if (target.src !== DEFAULT_COVER_URL) {
    target.src = DEFAULT_COVER_URL;
  }
}

// Auto-scroll lyrics to keep active line centered
watch(
  () => playerState.currentLyricIndex,
  async (newIdx) => {
    if (!lyricsContainer.value) return;
    await nextTick();
    const activeEl = lyricsContainer.value.querySelector(`[data-index="${newIdx}"]`) as HTMLElement;
    if (activeEl) {
      const containerHeight = lyricsContainer.value.clientHeight;
      const elOffsetTop = activeEl.offsetTop;
      const elHeight = activeEl.clientHeight;
      lyricsContainer.value.scrollTo({
        top: elOffsetTop - containerHeight / 2 + elHeight / 2,
        behavior: "smooth",
      });
    }
  }
);
</script>

<template>
  <div
    v-if="playerState.isVinylOpen"
    class="vinyl-player-root fixed inset-0 z-50 flex flex-col select-none overflow-hidden bg-[var(--app-bg)] animate-in fade-in duration-300"
  >
    <!-- Dynamic Ambient Blurred Cover Art Background -->
    <div
      class="absolute inset-0 bg-cover bg-center scale-125 filter blur-[100px] opacity-25 pointer-events-none transition-all duration-1000"
      :style="{
        backgroundImage: `url(${playerState.currentSong?.al?.picUrl || DEFAULT_COVER_URL})`,
      }"
    ></div>
    <div class="vinyl-player-overlay absolute inset-0 bg-gradient-to-b from-[var(--app-bg)]/80 via-[var(--app-bg)]/50 to-[var(--app-bg)]/90 pointer-events-none"></div>

    <!-- Top Action Bar -->
    <header class="h-16 px-8 flex items-center justify-between z-10 shrink-0">
      <button
        @click="close"
        class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[9px] bg-[var(--card-bg)]/80 hover:bg-[var(--card-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] backdrop-blur-md transition-all text-xs cursor-pointer shadow-sm"
      >
        <ChevronDown class="w-4 h-4" />
        <span>收起唱机</span>
      </button>

      <div class="text-center px-4">
        <h2 class="text-sm font-bold text-[var(--text-primary)] tracking-wide truncate max-w-md">
          {{ playerState.currentSong?.name || "未知音乐" }}
        </h2>
        <p class="text-xs text-[var(--text-muted)] mt-0.5">
          {{ playerState.currentSong?.ar?.map((a) => a.name).join(" / ") || "雾岛 FM" }}
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="playerState.currentSong"
          @click="playerActions.toggleLike(playerState.currentSong.id)"
          class="p-2 rounded-full bg-[var(--card-bg)]/80 hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[#ec4141] border border-[var(--border)] transition-colors cursor-pointer shadow-sm"
          title="喜欢这首歌"
        >
          <Heart
            class="w-4 h-4"
            :class="playerActions.isLiked(playerState.currentSong.id) ? 'text-[#ec4141] fill-[#ec4141]' : ''"
          />
        </button>
      </div>
    </header>

    <!-- Main Content Area: Turntable on Left, Synced Lyrics on Right -->
    <main class="flex-1 flex flex-col md:flex-row items-center justify-center px-10 pb-2 gap-10 md:gap-14 z-10 overflow-hidden">
      <!-- Left: Turntable with Tonearm and Vinyl Record -->
      <div class="w-full md:w-1/2 flex flex-col items-center justify-center relative">
        <div class="relative w-80 h-80 sm:w-84 sm:h-84 flex items-center justify-center">
          <!-- Tonearm Stylus -->
          <div
            class="absolute -top-12 right-10 w-28 h-36 z-20 pointer-events-none tonearm"
            :class="playerState.isPlaying ? 'tonearm-playing' : 'tonearm-paused'"
          >
            <!-- Stylus Arm Graphic -->
            <svg viewBox="0 0 100 140" class="w-full h-full drop-shadow-2xl">
              <!-- Arm Base / Bearing -->
              <circle cx="24" cy="24" r="16" fill="#2d3027" stroke="#484d3e" stroke-width="3" />
              <circle cx="24" cy="24" r="8" fill="#141612" />
              <!-- Arm Rod -->
              <path
                d="M 24 24 L 28 85 L 42 120"
                stroke="#c2c7b5"
                stroke-width="4"
                stroke-linecap="round"
                fill="none"
              />
              <!-- Cartridge Head with Accent -->
              <rect x="34" y="116" width="16" height="22" rx="3" fill="var(--accent)" transform="rotate(18 42 120)" />
            </svg>
          </div>

          <!-- Turntable Platter Outer Rim -->
          <div
            @click="playerActions.togglePlay()"
            class="turntable-platter group/turntable w-76 h-76 rounded-full bg-[#181a16] border-4 border-[#282b22] flex items-center justify-center shadow-2xl relative cursor-pointer select-none"
            :title="playerState.isPlaying ? '点击暂停' : '点击播放'"
          >
            <!-- Rotating Vinyl Disc -->
            <div
              class="w-72 h-72 rounded-full flex items-center justify-center relative animate-spin-slow"
              :class="{ paused: !playerState.isPlaying }"
              style="
                background: repeating-radial-gradient(circle, #242720 0 3px, #181a16 4px 7px);
                box-shadow: inset 0 0 15px rgba(0,0,0,0.8), 0 0 25px rgba(0,0,0,0.6);
              "
            >
              <!-- Center Album Cover -->
              <div class="w-48 h-48 rounded-full overflow-hidden border-4 border-black/80 shadow-inner flex items-center justify-center relative">
                <img
                  :src="playerState.currentSong?.al?.picUrl || DEFAULT_COVER_URL"
                  alt="cover"
                  @error="handleImgError"
                  class="w-full h-full object-cover"
                />
                <!-- Spindle Center Hole -->
                <div class="absolute w-5 h-5 rounded-full bg-[#10110f] border-2 border-[#333544]"></div>
              </div>
            </div>

            <!-- Center Play/Pause Control Button (Only visible on hover) -->
            <button
              @click.stop="playerActions.togglePlay()"
              class="vinyl-center-play-btn absolute z-30 w-14 h-14 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 active:scale-90 backdrop-blur-md border border-white/25 text-white shadow-[0_8px_24px_rgba(0,0,0,0.65)] transition-all duration-300 cursor-pointer pointer-events-none group-hover/turntable:pointer-events-auto"
              :title="playerState.isPlaying ? '点击暂停' : '点击播放'"
            >
              <Pause
                v-if="playerState.isPlaying"
                class="w-6 h-6 text-[var(--accent)] fill-[var(--accent)] hover:scale-110 transition-transform"
              />
              <Play
                v-else
                class="w-6 h-6 text-[var(--accent)] fill-[var(--accent)] ml-0.5 hover:scale-110 transition-transform"
              />
            </button>
          </div>
        </div>

        <!-- Album & Info Under Record -->
        <div class="mt-6 text-center">
          <span class="album-badge text-xs px-3 py-1 rounded-[7px] bg-[var(--card-bg)]/80 border border-[var(--border)] text-[var(--text-muted)] font-medium shadow-sm">
            专辑：{{ playerState.currentSong?.al?.name || "未知专辑" }}
          </span>
        </div>
      </div>

      <!-- Right: Fluid Scrolling Lyrics -->
      <div class="w-full md:w-1/2 flex-1 max-h-[440px] flex flex-col relative">
        <div
          ref="lyricsContainer"
          class="flex-1 overflow-y-auto px-4 py-28 space-y-6 scroll-smooth text-center md:text-left"
          style="scrollbar-width: none;"
        >
          <template v-if="playerState.lyrics && playerState.lyrics.length > 0">
            <div
              v-for="(line, idx) in playerState.lyrics"
              :key="idx"
              :data-index="idx"
              @click="playerActions.seek(line.time)"
              class="transition-all duration-300 cursor-pointer select-none group"
            >
              <p
                class="leading-relaxed transition-all duration-300 font-medium"
                :class="[
                  playerState.currentLyricIndex === idx
                    ? 'text-[var(--accent)] text-2xl font-bold scale-105 origin-left drop-shadow-[0_4px_12px_var(--accent-glow)]'
                    : 'text-[var(--text-muted)] text-base opacity-40 group-hover:opacity-90 group-hover:text-[var(--text-primary)]'
                ]"
              >
                {{ line.text }}
              </p>
              <p
                v-if="line.translation"
                class="text-xs mt-1.5 transition-opacity duration-300"
                :class="[
                  playerState.currentLyricIndex === idx
                    ? 'text-[#f59e0b] font-medium opacity-90'
                    : 'text-[var(--text-subtle)] opacity-40'
                ]"
              >
                {{ line.translation }}
              </p>
            </div>
          </template>

          <!-- No Lyrics Fallback -->
          <div v-else class="h-full flex flex-col items-center justify-center text-[var(--text-muted)] gap-3">
            <Music class="w-8 h-8 opacity-40 text-[var(--accent)]" />
            <p class="text-xs">纯音乐，慢下来，享受静谧时光</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom Dazzling Audio Spectrum Visualizer -->
    <footer class="w-full z-10 shrink-0 select-none pb-1 pointer-events-none">
      <AudioSpectrum />
    </footer>
  </div>
</template>
