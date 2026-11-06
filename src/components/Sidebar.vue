<script setup lang="ts">
import { ref, onMounted } from "vue";
import {
  House,
  TrendingUp,
  Heart,
  History,
  Search,
  X,
  Disc3,
  Settings,
  Sun,
  Moon,
  LogOut,
  UserRound,
} from "lucide-vue-next";
import { api, DEFAULT_COVER_URL } from "../services/api";
import { playerState, playerActions } from "../store/player";
import { userState, userActions } from "../store/user";
import { themeState, themeActions } from "../store/theme";
import type { NavView } from "../types";

const props = defineProps<{ currentView: NavView }>();
const emit = defineEmits<{
  (e: "navigate", view: NavView): void;
  (e: "search", keyword: string): void;
}>();

const searchQuery = ref("");
const showHotSearch = ref(false);
const showAccountMenu = ref(false);
const hotKeywords = ref<{ searchWord: string; score: number }[]>([]);

const mainNavItems = [
  { id: "discover", label: "发现音乐", icon: House },
  { id: "toplist", label: "权威榜单", icon: TrendingUp },
];

const musicNavItems = [
  { id: "liked", label: "我喜欢的音乐", icon: Heart },
  { id: "history", label: "最近播放", icon: History },
];

onMounted(async () => {
  hotKeywords.value = await api.getHotSearch();
});

function handleSearch(keyword?: string) {
  const value = (keyword || searchQuery.value).trim();
  if (!value) return;
  searchQuery.value = value;
  showHotSearch.value = false;
  emit("search", value);
}

function handleAccountClick() {
  if (userState.isLoggedIn) {
    showAccountMenu.value = !showAccountMenu.value;
  } else {
    userActions.openLoginModal();
  }
}

function handleLogout() {
  userActions.logout();
  playerActions.clearLiked();
  showAccountMenu.value = false;
  api.logout();
}

function handleCoverError(e: Event) {
  const target = e.target as HTMLImageElement;
  if (target.src !== DEFAULT_COVER_URL) {
    target.src = DEFAULT_COVER_URL;
  }
}
</script>

<template>
  <aside class="app-sidebar w-[240px] h-full flex flex-col px-4 pt-4 pb-3.5 shrink-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] select-none relative z-30">
    <!-- Brand Logo & Slogan -->
    <div class="sidebar-brand flex items-center gap-3 px-1 mb-4">
      <span class="w-9 h-9 rounded-[10px] bg-[var(--accent-soft)] border border-[var(--accent-border)] flex items-center justify-center text-[var(--accent)] shadow-sm shrink-0">
        <Disc3 class="w-5 h-5 animate-spin-slow" :class="{ paused: !playerState.isPlaying }" :stroke-width="1.8" />
      </span>
      <span class="min-w-0">
        <strong class="block text-[14px] font-bold text-[var(--text-primary)] leading-tight tracking-tight">雾岛 FM</strong>
        <small class="block mt-0.5 text-[10px] text-[var(--text-muted)] leading-none font-medium">让音乐陪你慢下来</small>
      </span>
    </div>

    <!-- Search Input & Hot Keyword Dropdown -->
    <div class="sidebar-search-wrap relative z-20 mb-4">
      <div class="flex items-center gap-2 h-9 px-2.5 rounded-[10px] bg-[var(--card-bg)] border border-[var(--border)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-glow)] transition-all">
        <Search class="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" :stroke-width="1.8" />
        <input
          v-model="searchQuery"
          @keydown.enter="handleSearch()"
          @focus="showHotSearch = true"
          type="text"
          placeholder="搜索歌曲、艺人、歌单"
          class="w-full min-w-0 bg-transparent border-none outline-none text-xs text-[var(--text-primary)] placeholder-[var(--text-subtle)]"
          aria-label="搜索音乐"
        />
        <button v-if="searchQuery" @click="searchQuery = ''" class="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0" aria-label="清空搜索">
          <X class="w-3 h-3" />
        </button>
      </div>

      <!-- Hot Search Menu Popover -->
      <div
        v-if="showHotSearch && hotKeywords.length"
        @mouseleave="showHotSearch = false"
        class="absolute left-0 right-0 top-11 rounded-[12px] bg-[var(--popover-bg)] border border-[var(--border)] p-2 shadow-2xl z-50 backdrop-blur-md"
      >
        <div class="px-2 py-1 text-[10px] tracking-wider font-bold text-[var(--text-muted)] uppercase">热搜榜</div>
        <button
          v-for="(item, index) in hotKeywords.slice(0, 8)"
          :key="item.searchWord"
          @click="handleSearch(item.searchWord)"
          class="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-[7px] text-left text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-colors"
        >
          <span class="flex items-center gap-2 truncate">
            <span class="w-3.5 text-center text-[10px] font-bold" :class="index < 3 ? 'text-[#ec4141]' : 'text-[var(--text-subtle)]'">
              {{ index + 1 }}
            </span>
            <span class="truncate">{{ item.searchWord }}</span>
          </span>
          <span class="text-[10px] text-[var(--text-subtle)] font-mono">{{ item.score }}</span>
        </button>
      </div>
    </div>

    <!-- Navigation Menus -->
    <nav aria-label="主导航" class="sidebar-nav flex-1 space-y-5 overflow-y-auto pr-0.5">
      <!-- Section 1: Online Music -->
      <div>
        <div class="px-2 mb-1.5 text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider">在线音乐</div>
        <div class="space-y-0.5">
          <button
            v-for="item in mainNavItems"
            :key="item.id"
            @click="emit('navigate', item.id as NavView)"
            class="w-full flex items-center gap-2.5 px-3 py-2 rounded-[9px] text-xs font-medium transition-all"
            :class="[
              props.currentView === item.id
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)]'
            ]"
          >
            <component :is="item.icon" class="w-4 h-4 shrink-0" :stroke-width="1.8" />
            <span>{{ item.label }}</span>
          </button>
        </div>
      </div>

      <!-- Section 2: My Music Library -->
      <div>
        <div class="px-2 mb-1.5 text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider">我的音乐</div>
        <div class="space-y-0.5">
          <button
            v-for="item in musicNavItems"
            :key="item.id"
            @click="emit('navigate', item.id as NavView)"
            class="w-full flex items-center justify-between px-3 py-2 rounded-[9px] text-xs font-medium transition-all"
            :class="[
              props.currentView === item.id
                ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)]'
            ]"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <component
                :is="item.icon"
                class="w-4 h-4 shrink-0"
                :class="item.id === 'liked' && (playerState.likedSongs.length > 0 || playerState.likedIds.size > 0) ? 'text-[#ec4141] fill-[#ec4141]' : ''"
                :stroke-width="1.8"
              />
              <span class="truncate">{{ item.label }}</span>
            </div>
            <span
              v-if="item.id === 'liked' && (playerState.likedSongs.length > 0 || playerState.likedIds.size > 0)"
              class="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--card-hover)] text-[var(--text-muted)]"
            >
              {{ playerState.likedSongs.length || playerState.likedIds.size }}
            </span>
            <span
              v-else-if="item.id === 'history' && playerState.history.length > 0"
              class="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--card-hover)] text-[var(--text-muted)]"
            >
              {{ playerState.history.length }}
            </span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Sidebar Bottom: Now Playing Mini Card & Profile Bar -->
    <div class="sidebar-bottom mt-auto pt-3 border-t border-[var(--border)] space-y-2.5">
      <!-- Mini Playing Card -->
      <div
        v-if="playerState.currentSong"
        @click="playerState.isVinylOpen = true"
        class="w-full flex items-center gap-2.5 p-2 rounded-[11px] bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--card-hover)] transition-all cursor-pointer group"
        title="点击打开沉浸式黑胶唱机与全屏歌词"
      >
        <img
          :src="playerState.currentSong.al.picUrl || DEFAULT_COVER_URL"
          alt="album cover"
          @error="handleCoverError"
          class="w-10 h-10 object-cover rounded-[7px] shrink-0 border border-[var(--border-subtle)]"
        />
        <div class="min-w-0 flex-1">
          <span class="block truncate text-xs font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
            {{ playerState.currentSong.name }}
          </span>
          <span class="block truncate text-[10px] text-[var(--text-muted)] mt-0.5">
            {{ playerState.currentSong.ar.map((a) => a.name).join(" / ") }}
          </span>
        </div>
        <Disc3 class="w-3.5 h-3.5 shrink-0 text-[var(--text-muted)]" :class="playerState.isPlaying ? 'animate-spin-slow text-[var(--accent)]' : ''" />
      </div>

      <!-- User Account & Theme & Settings Bar -->
      <div class="flex items-center justify-between px-0.5">
        <button
          @click="handleAccountClick"
          class="flex items-center gap-2 min-w-0 text-left text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          :title="userState.isLoggedIn ? '点击查看账户菜单' : '点击登录网易云音乐'"
        >
          <img
            v-if="userState.isLoggedIn && userState.profile?.avatarUrl"
            :src="userState.profile.avatarUrl"
            alt="user avatar"
            class="w-7 h-7 rounded-full object-cover border border-[var(--border)] shrink-0"
          />
          <span v-else class="w-7 h-7 rounded-full bg-[var(--card-hover)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] shrink-0">
            <UserRound class="w-3.5 h-3.5" />
          </span>
          <span class="truncate text-xs font-medium max-w-[95px]">
            {{ userState.isLoggedIn ? userState.profile?.nickname : "点击登录" }}
          </span>
        </button>

        <div class="flex items-center gap-1 shrink-0">
          <button
            @click="themeActions.toggleTheme()"
            class="w-7 h-7 rounded-[7px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-colors"
            :title="themeState.mode === 'light' ? '切换为黑曜石深色模式' : '切换为和纸晨光亮色模式'"
          >
            <Sun v-if="themeState.mode === 'dark'" class="w-3.5 h-3.5 text-[#e5b546]" />
            <Moon v-else class="w-3.5 h-3.5 text-[#4f731d]" />
          </button>

          <button
            @click="playerState.isSettingsOpen = true"
            class="w-7 h-7 rounded-[7px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--card-hover)] transition-colors"
            title="系统设置"
          >
            <Settings class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <!-- Account Menu Popover -->
      <div
        v-if="showAccountMenu && userState.isLoggedIn"
        class="absolute bottom-16 left-4 right-4 p-2 rounded-[12px] bg-[var(--popover-bg)] border border-[var(--border)] shadow-2xl z-50 backdrop-blur-md"
      >
        <div class="px-2 py-1 mb-1 border-b border-[var(--border-subtle)]">
          <div class="text-xs font-bold text-[var(--text-primary)] truncate">{{ userState.profile?.nickname }}</div>
          <div class="text-[10px] text-[var(--text-muted)] font-mono">UID: {{ userState.profile?.userId }}</div>
        </div>
        <button
          @click="handleLogout"
          class="flex items-center gap-2 w-full p-2 rounded-[8px] text-xs text-[#ec4141] hover:bg-[#ec4141]/10 transition-colors"
        >
          <LogOut class="w-3.5 h-3.5" />
          <span>退出登录</span>
        </button>
      </div>
    </div>
  </aside>
</template>
