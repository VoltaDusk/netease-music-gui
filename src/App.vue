<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import TitleBar from "./components/TitleBar.vue";
import Sidebar from "./components/Sidebar.vue";
import PlayerBar from "./components/PlayerBar.vue";
import DiscoverView from "./components/DiscoverView.vue";
import PlaylistView from "./components/PlaylistView.vue";
import ToplistView from "./components/ToplistView.vue";
import SearchView from "./components/SearchView.vue";
import TrackListView from "./components/TrackListView.vue";
import VinylPlayer from "./components/VinylPlayer.vue";
import QueueDrawer from "./components/QueueDrawer.vue";
import SettingsModal from "./components/SettingsModal.vue";
import LoginModal from "./components/LoginModal.vue";

import { playerState, playerActions } from "./store/player";
import { userState } from "./store/user";
import { DEMO_SONGS } from "./services/api";
import type { NavView, Playlist, Song } from "./types";

const currentView = ref<NavView>("discover");
const previousView = ref<NavView>("discover");
const selectedPlaylist = ref<Playlist | null>(null);
const searchKeyword = ref("");

// Navigation History Stack
const navHistory = ref<{ view: NavView; playlist: Playlist | null; search: string }[]>([
  { view: "discover", playlist: null, search: "" },
]);
const historyIndex = ref(0);

const canGoBack = computed(() => historyIndex.value > 0);
const canGoForward = computed(() => historyIndex.value < navHistory.value.length - 1);

function navigateTo(view: NavView, payload?: { playlist?: Playlist | null; search?: string }) {
  if (view === currentView.value && !payload?.playlist && !payload?.search) return;

  previousView.value = currentView.value;
  currentView.value = view;
  if (payload?.playlist !== undefined) selectedPlaylist.value = payload.playlist;
  if (payload?.search !== undefined) searchKeyword.value = payload.search;

  // Truncate forward history and push new entry
  navHistory.value = navHistory.value.slice(0, historyIndex.value + 1);
  navHistory.value.push({
    view,
    playlist: selectedPlaylist.value,
    search: searchKeyword.value,
  });
  historyIndex.value = navHistory.value.length - 1;
}

function handleGoBack() {
  if (canGoBack.value) {
    historyIndex.value--;
    const target = navHistory.value[historyIndex.value];
    previousView.value = currentView.value;
    currentView.value = target.view;
    selectedPlaylist.value = target.playlist;
    searchKeyword.value = target.search;
  }
}

function handleGoForward() {
  if (canGoForward.value) {
    historyIndex.value++;
    const target = navHistory.value[historyIndex.value];
    previousView.value = currentView.value;
    currentView.value = target.view;
    selectedPlaylist.value = target.playlist;
    searchKeyword.value = target.search;
  }
}

function handleSelectPlaylist(pl: Playlist) {
  navigateTo("playlist-detail", { playlist: pl });
}

function handleBackFromPlaylist() {
  if (canGoBack.value) {
    handleGoBack();
  } else {
    navigateTo("discover");
  }
}

function handleSearch(keyword: string) {
  navigateTo("search", { search: keyword });
}

// Compute songs for "Liked" view
const likedSongs = computed<Song[]>(() => {
  if (playerState.likedSongs && playerState.likedSongs.length > 0) {
    return playerState.likedSongs;
  }
  const allKnown = [...playerState.playlist, ...playerState.history, ...DEMO_SONGS];
  const unique = new Map<number, Song>();
  for (const s of allKnown) {
    if (playerState.likedIds.has(s.id)) {
      unique.set(s.id, s);
    }
  }
  return Array.from(unique.values());
});

// Global Keyboard Shortcuts
function handleKeyDown(e: KeyboardEvent) {
  const target = e.target as HTMLElement;
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

  if (e.code === "Space") {
    e.preventDefault();
    playerActions.togglePlay();
  } else if (e.altKey && e.code === "ArrowLeft") {
    e.preventDefault();
    handleGoBack();
  } else if (e.altKey && e.code === "ArrowRight") {
    e.preventDefault();
    handleGoForward();
  } else if (e.code === "ArrowLeft") {
    e.preventDefault();
    playerActions.seek(Math.max(0, playerState.currentTime - 5));
  } else if (e.code === "ArrowRight") {
    e.preventDefault();
    playerActions.seek(Math.min(playerState.duration, playerState.currentTime + 5));
  } else if (e.code === "ArrowUp") {
    e.preventDefault();
    playerActions.setVolume(Math.min(1, playerState.volume + 0.1));
  } else if (e.code === "ArrowDown") {
    e.preventDefault();
    playerActions.setVolume(Math.max(0, playerState.volume - 0.1));
  } else if (e.code === "Escape") {
    if (playerState.isVinylOpen) playerState.isVinylOpen = false;
    else if (playerState.isQueueOpen) playerState.isQueueOpen = false;
    else if (playerState.isSettingsOpen) playerState.isSettingsOpen = false;
    else if (userState.isLoginModalOpen) userState.isLoginModalOpen = false;
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
  if (userState.isLoggedIn && userState.profile?.userId) {
    playerActions.syncLikedFromCloud(userState.profile.userId);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <div class="app-shell w-screen h-screen flex bg-[var(--app-bg)] text-[var(--text-primary)] overflow-hidden select-none">
    <Sidebar
      :current-view="currentView"
      @navigate="navigateTo"
      @search="handleSearch"
    />

    <div class="app-workspace flex-1 min-w-0 h-full flex flex-col relative overflow-hidden bg-[var(--app-bg)]">
      <TitleBar
        :current-view="currentView"
        :can-go-back="canGoBack"
        :can-go-forward="canGoForward"
        @go-back="handleGoBack"
        @go-forward="handleGoForward"
      />

      <main class="app-main flex-1 min-h-0 overflow-y-auto relative bg-[var(--app-bg)]">
        <DiscoverView
          v-if="currentView === 'discover'"
          @select-playlist="handleSelectPlaylist"
          @view-toplists="navigateTo('toplist')"
        />

        <ToplistView
          v-else-if="currentView === 'toplist'"
          @select-playlist="handleSelectPlaylist"
        />

        <SearchView
          v-else-if="currentView === 'search'"
          :initial-query="searchKeyword"
          @select-playlist="handleSelectPlaylist"
        />

        <PlaylistView
          v-else-if="currentView === 'playlist-detail' && selectedPlaylist"
          :playlist="selectedPlaylist"
          @back="handleBackFromPlaylist"
        />

        <TrackListView
          v-else-if="currentView === 'liked'"
          title="我喜欢的音乐"
          :subtitle="`红心珍藏 · 共 ${likedSongs.length} 首` + (playerState.isSyncingLiked ? ' (正在同步云端...)' : '')"
          :songs="likedSongs"
          empty-text="暂无喜爱的音乐，遇到心动歌曲点击红心收藏，或登录网易云同步"
        />

        <TrackListView
          v-else-if="currentView === 'history'"
          title="最近播放记录"
          subtitle="重温不久前聆听的时光"
          :songs="playerState.history"
          empty-text="暂无最近播放记录"
        />

        <DiscoverView
          v-else
          @select-playlist="handleSelectPlaylist"
          @view-toplists="navigateTo('toplist')"
        />
      </main>

      <PlayerBar />
    </div>

    <QueueDrawer />
    <VinylPlayer />
    <SettingsModal />
    <LoginModal />
  </div>
</template>
