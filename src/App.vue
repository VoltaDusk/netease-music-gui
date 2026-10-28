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
import RightPanel from "./components/RightPanel.vue";
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

function navigateTo(view: NavView) {
  previousView.value = currentView.value;
  currentView.value = view;
}

function handleSelectPlaylist(pl: Playlist) {
  selectedPlaylist.value = pl;
  navigateTo("playlist-detail");
}

function handleBackFromPlaylist() {
  navigateTo(previousView.value === "playlist-detail" ? "discover" : previousView.value);
}

function handleSearch(keyword: string) {
  searchKeyword.value = keyword;
  navigateTo("search");
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
  // 如果已登录，自动在后台同步用户喜爱的音乐和歌单
  if (userState.isLoggedIn && userState.profile?.userId) {
    playerActions.syncLikedFromCloud(userState.profile.userId);
  }
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeyDown);
});
</script>

<template>
  <div class="w-screen h-screen flex flex-col bg-[#10110f] text-[#f1f0e9] overflow-hidden select-none">
    <!-- Top Custom Drag Region Titlebar -->
    <TitleBar
      :current-view="currentView"
      @navigate="navigateTo"
      @search="handleSearch"
    />

    <!-- Middle 3-Column Layout -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Left Sidebar (218px) -->
      <Sidebar
        :current-view="currentView"
        @navigate="navigateTo"
      />

      <!-- Center Main Content Area -->
      <main class="flex-1 overflow-y-auto bg-[#10110f] relative">
        <!-- Ambient Subtle Lighting in Top Background -->
        <div class="absolute top-0 left-1/4 w-96 h-96 bg-[#d6f379]/[0.03] rounded-full filter blur-[120px] pointer-events-none"></div>

        <!-- Dynamic Views -->
        <DiscoverView
          v-if="currentView === 'discover'"
          @select-playlist="handleSelectPlaylist"
          @view-all-playlists="navigateTo('playlists')"
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

        <!-- Default to Discover -->
        <DiscoverView
          v-else
          @select-playlist="handleSelectPlaylist"
          @view-all-playlists="navigateTo('playlists')"
        />
      </main>

      <!-- Right Column: Queue & Atmosphere Panel (270px) -->
      <RightPanel class="hidden xl:flex" />

      <!-- Slide-in Queue Drawer (for narrow screens) -->
      <QueueDrawer class="xl:hidden" />
    </div>

    <!-- Bottom Audio Controller (82px) -->
    <PlayerBar />

    <!-- Fullscreen Immersive Vinyl Player & Synced Lyrics -->
    <VinylPlayer />

    <!-- Settings Modal -->
    <SettingsModal />

    <!-- Login Modal -->
    <LoginModal />
  </div>
</template>
