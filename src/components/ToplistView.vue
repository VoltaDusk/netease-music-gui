<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Headphones, Play, TrendingUp } from "lucide-vue-next";
import { api, DEFAULT_COVER_URL } from "../services/api";
import { playerActions } from "../store/player";
import type { Playlist } from "../types";

const emit = defineEmits<{
  (e: "select-playlist", playlist: Playlist): void;
}>();

const toplists = ref<Playlist[]>([]);
const isLoading = ref(true);

onMounted(async () => {
  try {
    toplists.value = await api.getToplist();
  } catch (err) {
    console.error("Failed to load toplists:", err);
  } finally {
    isLoading.value = false;
  }
});

function formatPlayCount(count: number): string {
  if (!count) return "0";
  if (count >= 100000000) {
    return (count / 100000000).toFixed(1) + "亿";
  }
  if (count >= 10000) {
    return Math.floor(count / 10000) + "万";
  }
  return count.toString();
}

async function playToplistImmediately(playlist: Playlist) {
  try {
    const res = await api.getPlaylistDetail(playlist.id, 30);
    if (res.tracks && res.tracks.length > 0) {
      playerActions.playSong(res.tracks[0], res.tracks);
    }
  } catch {
    emit("select-playlist", playlist);
  }
}

function handleImgError(e: Event) {
  const target = e.target as HTMLImageElement;
  if (target.src !== DEFAULT_COVER_URL) {
    target.src = DEFAULT_COVER_URL;
  }
}
</script>

<template>
  <div class="toplist-page p-8 space-y-6 select-none max-w-[1140px] mx-auto">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-[8px] bg-[var(--accent-soft)] flex items-center justify-center text-[var(--accent)]">
        <TrendingUp class="w-4 h-4" />
      </div>
      <div>
        <h1 class="text-2xl font-bold text-[var(--text-primary)] tracking-tight">官方权威榜单</h1>
        <p class="text-xs text-[var(--text-muted)] mt-0.5">网易云音乐官方精选 · 全球风向标</p>
      </div>
    </div>

    <!-- Loading Skeletons -->
    <div v-if="isLoading" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
      <div v-for="i in 8" :key="i" class="space-y-2">
        <div class="w-full aspect-square rounded-[14px] bg-[var(--card-hover)] animate-shimmer"></div>
        <div class="h-3.5 w-3/4 rounded bg-[var(--card-hover)] animate-shimmer"></div>
        <div class="h-3 w-1/2 rounded bg-[var(--card-hover)] animate-shimmer"></div>
      </div>
    </div>

    <!-- Grid of Toplists -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
      <article
        v-for="item in toplists"
        :key="item.id"
        @click="emit('select-playlist', item)"
        class="group flex flex-col cursor-pointer select-none"
      >
        <div class="relative w-full aspect-square rounded-[14px] overflow-hidden bg-[var(--card-bg)] shadow-sm border border-[var(--border)] transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-xl cover-ring">
          <img
            :src="item.coverImgUrl"
            :alt="item.name"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            @error="handleImgError"
          />

          <!-- Play Count Badge -->
          <div
            class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-1 text-[10px] text-white font-mono z-10 shadow-sm"
          >
            <Headphones class="w-2.5 h-2.5 text-[var(--accent)]" />
            <span>{{ formatPlayCount(item.playCount) }}</span>
          </div>

          <!-- Hover Play Overlay -->
          <div
            class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
          >
            <button
              @click.stop="playToplistImmediately(item)"
              class="w-11 h-11 rounded-full bg-[var(--accent)] text-[var(--accent-text)] flex items-center justify-center shadow-2xl transform translate-y-2 group-hover:translate-y-0 active:scale-90 transition-all duration-300 cursor-pointer"
              title="立即播放榜单"
              aria-label="立即播放"
            >
              <Play class="w-5 h-5 fill-current ml-0.5" />
            </button>
          </div>
        </div>

        <h3
          class="text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors mt-2.5 truncate"
        >
          {{ item.name }}
        </h3>
        <span class="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
          实时更新
        </span>
      </article>
    </div>
  </div>
</template>
