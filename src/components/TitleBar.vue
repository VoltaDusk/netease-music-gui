<script setup lang="ts">
import { ref, onMounted } from "vue";
import { invoke } from "@tauri-apps/api/core";
import {
  Minus,
  Square,
  X,
  Settings,
  LogOut,
  Heart,
  History,
  Sun,
  Moon,
} from "lucide-vue-next";
import { api } from "../services/api";
import { playerState, playerActions } from "../store/player";
import { userState, userActions } from "../store/user";
import { themeState, themeActions } from "../store/theme";
import type { NavView } from "../types";

const props = defineProps<{
  currentView: NavView;
}>();

const emit = defineEmits<{
  (e: "navigate", view: NavView): void;
  (e: "search", keyword: string): void;
}>();

const isConnected = ref(false);
const searchQuery = ref("");
const showHotSearch = ref(false);
const showProfileMenu = ref(false);
const hotKeywords = ref<{ searchWord: string; score: number }[]>([]);

onMounted(async () => {
  isConnected.value = await api.checkConnection();
  hotKeywords.value = await api.getHotSearch();
});

function handleSearch(keyword?: string) {
  const q = keyword || searchQuery.value;
  if (!q.trim()) return;
  searchQuery.value = q;
  showHotSearch.value = false;
  emit("search", q);
  emit("navigate", "search");
}

function handleAvatarClick() {
  if (userState.isLoggedIn) {
    showProfileMenu.value = !showProfileMenu.value;
  } else {
    userActions.openLoginModal();
  }
}

function handleLogout() {
  userActions.logout();
  playerActions.clearLiked();
  showProfileMenu.value = false;
  api.logout();
}

function startDrag(e: MouseEvent) {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement;
  if (target.closest("button, input, textarea, a, select, [role='button'], .no-drag")) {
    return;
  }
  invoke("drag_window").catch((err) => {
    console.warn("drag_window error:", err);
  });
}

function handleHeaderDblClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target.closest("button, input, textarea, a, select, [role='button'], .no-drag")) {
    return;
  }
  toggleMaximize();
}

function navigateFromProfile(view: NavView) {
  showProfileMenu.value = false;
  emit("navigate", view);
}

function minimize() {
  invoke("minimize_window").catch(console.error);
}

function toggleMaximize() {
  invoke("toggle_maximize_window").catch(console.error);
}

function closeWindow() {
  invoke("close_window").catch(console.error);
}

function openSettings() {
  playerState.isSettingsOpen = true;
}
</script>

<template>
  <header
    @mousedown="startDrag"
    @dblclick="handleHeaderDblClick"
    data-tauri-drag-region
    class="h-12 w-full flex items-center justify-between px-5 select-none border-b border-white/[0.08] bg-[#10110f] z-40 relative cursor-default"
  >
    <!-- Left: Navigation Arrows & API Badge -->
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-2 text-sm text-[#8d9188] select-none font-mono">
        <button
          @click="emit('navigate', 'discover')"
          class="hover:text-[#f1f0e9] transition-colors px-1"
          title="发现首页"
        >
          ‹
        </button>
        <button
          @click="emit('navigate', 'toplist')"
          class="hover:text-[#f1f0e9] transition-colors px-1"
          title="榜单"
        >
          ›
        </button>
      </div>

      <!-- API Status Badge -->
      <button
        @click="openSettings"
        class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[7px] text-[10px] transition-all font-mono"
        :class="
          isConnected
            ? 'bg-[#1b2318] text-[#d6f379] border border-[#d6f379]/30 hover:bg-[#222d1e]'
            : 'bg-[#1e1c16] text-[#e0bb78] border border-[#e0bb78]/30 hover:bg-[#28251c]'
        "
        :title="isConnected ? 'API 接口已连通 (3000端口)' : '未检测到本地 API 服务，已启用内置体验数据模式，点击设置'"
      >
        <span class="w-1.5 h-1.5 rounded-full" :class="isConnected ? 'bg-[#d6f379]' : 'bg-[#e0bb78]'"></span>
        <span>{{ isConnected ? "API 在线" : "体验模式" }}</span>
      </button>
    </div>

    <!-- Center: Search Input Bar -->
    <div class="relative w-72">
      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#171916] border border-white/[0.08] hover:border-white/[0.16] focus-within:border-[#d6f379]/60 transition-all text-xs"
      >
        <span class="text-[#8d9188] text-xs font-mono">⌕</span>
        <input
          v-model="searchQuery"
          @keydown.enter="handleSearch()"
          @focus="showHotSearch = true"
          type="text"
          placeholder="搜索歌曲、艺人、专辑..."
          class="bg-transparent border-none outline-none text-[#f1f0e9] placeholder-[#8d9188] text-xs w-full"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="text-[#8d9188] hover:text-[#f1f0e9]"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Hot Search Dropdown -->
      <div
        v-if="showHotSearch"
        @mouseleave="showHotSearch = false"
        class="no-drag absolute left-0 top-10 w-72 bg-[#171916] border border-white/[0.08] rounded-[12px] shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
      >
        <div class="text-[10px] font-bold text-[#686d65] tracking-[1.5px] uppercase mb-2 px-1">
          热 搜 榜 单
        </div>
        <div class="space-y-1 max-h-56 overflow-y-auto">
          <button
            v-for="(item, idx) in hotKeywords"
            :key="item.searchWord"
            @click="handleSearch(item.searchWord)"
            class="w-full text-left px-2 py-1.5 rounded-[8px] flex items-center justify-between text-xs text-[#a8aca3] hover:bg-[#20231d] hover:text-[#f1f0e9] transition-colors"
          >
            <div class="flex items-center gap-2">
              <span
                class="font-mono text-xs w-4"
                :class="idx < 3 ? 'text-[#d6f379] font-bold' : 'text-[#686d65]'"
              >
                {{ idx + 1 }}
              </span>
              <span>{{ item.searchWord }}</span>
            </div>
            <span class="text-[10px] text-[#686d65] font-mono">{{ item.score }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Right: User Avatar & Settings & Window Controls -->
    <div class="flex items-center gap-2">
      <!-- User Avatar / Login Button -->
      <div class="relative">
        <button
          @click="handleAvatarClick"
          class="flex items-center gap-2 p-1 pr-2 rounded-full hover:bg-[#1b1e19] transition-all border border-transparent hover:border-white/[0.08] group"
          :title="userState.isLoggedIn ? userState.profile?.nickname : '点击登录网易云音乐'"
        >
          <!-- Avatar Icon or Image -->
          <div
            class="relative w-[28px] h-[28px] rounded-full overflow-hidden flex items-center justify-center border border-white/[0.1] shadow-sm flex-shrink-0"
            style="background: linear-gradient(135deg, #c68863, #563b34)"
          >
            <img
              v-if="userState.isLoggedIn && userState.profile?.avatarUrl"
              :src="userState.profile.avatarUrl"
              alt="avatar"
              class="w-full h-full object-cover"
            />
            <span v-else class="text-xs text-[#f1f0e9] font-bold">
              林
            </span>

            <!-- Online Indicator Dot -->
            <div
              v-if="userState.isLoggedIn"
              class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#d6f379] border border-[#10110f]"
            ></div>
          </div>

          <!-- Nickname / Login Label -->
          <span class="text-xs text-[#a8aca3] group-hover:text-[#f1f0e9] truncate max-w-[70px]">
            {{ userState.isLoggedIn ? userState.profile?.nickname : "登录" }}
          </span>
        </button>

        <!-- User Profile Dropdown Card -->
        <div
          v-if="showProfileMenu && userState.isLoggedIn"
          @mouseleave="showProfileMenu = false"
          class="no-drag absolute right-0 top-10 w-64 bg-[#171916] border border-white/[0.08] rounded-[16px] shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <!-- User Info Banner -->
          <div class="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
            <div class="relative w-10 h-10 rounded-full overflow-hidden border border-white/[0.15] flex-shrink-0">
              <img :src="userState.profile?.avatarUrl" alt="avatar" class="w-full h-full object-cover" />
            </div>
            <div class="truncate">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-[#f1f0e9] truncate">{{ userState.profile?.nickname }}</span>
                <span
                  v-if="userState.profile?.vipType"
                  class="px-1.5 py-0.2 rounded bg-[#d6f379]/15 text-[#d6f379] text-[9px] font-bold border border-[#d6f379]/30"
                >
                  VIP
                </span>
              </div>
              <p class="text-[10px] text-[#8d9188] truncate mt-0.5">
                {{ userState.profile?.signature || "网易云音乐个人主页" }}
              </p>
            </div>
          </div>

          <!-- Stats: Follows / Followeds -->
          <div class="grid grid-cols-2 py-2.5 border-b border-white/[0.08] text-center text-xs">
            <div>
              <span class="font-bold text-[#f1f0e9] font-mono">{{ userState.profile?.follows || 0 }}</span>
              <span class="text-[10px] text-[#686d65] block">关注</span>
            </div>
            <div>
              <span class="font-bold text-[#f1f0e9] font-mono">{{ userState.profile?.followeds || 0 }}</span>
              <span class="text-[10px] text-[#686d65] block">粉丝</span>
            </div>
          </div>

          <!-- Action Shortcuts -->
          <div class="py-2 space-y-1">
            <button
              @click="navigateFromProfile('liked')"
              class="w-full flex items-center justify-between px-2 py-1.5 rounded-[8px] text-xs text-[#a8aca3] hover:text-[#f1f0e9] hover:bg-[#20231d] transition-colors"
            >
              <div class="flex items-center gap-2">
                <Heart class="w-3.5 h-3.5 text-[#d6f379]" />
                <span>我喜欢的音乐</span>
              </div>
              <span class="text-[10px] text-[#686d65] font-mono">
                {{ playerState.likedSongs.length || playerState.likedIds.size }} 首
              </span>
            </button>
            <button
              @click="navigateFromProfile('history')"
              class="w-full flex items-center gap-2 px-2 py-1.5 rounded-[8px] text-xs text-[#a8aca3] hover:text-[#f1f0e9] hover:bg-[#20231d] transition-colors"
            >
              <History class="w-3.5 h-3.5 text-[#8d9188]" />
              <span>最近播放记录</span>
            </button>
          </div>

          <!-- Logout Button -->
          <div class="pt-2 border-t border-white/[0.08]">
            <button
              @click="handleLogout"
              class="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-[8px] bg-white/[0.02] hover:bg-[#2b1f1f] text-[#8d9188] hover:text-[#ff6b6b] text-xs transition-colors"
            >
              <LogOut class="w-3.5 h-3.5" />
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Theme Toggle (Dark / Light) -->
      <button
        @click="themeActions.toggleTheme()"
        class="p-1.5 text-[#8d9188] hover:text-[#f1f0e9] hover:bg-[#1b1e19] rounded-[8px] transition-colors"
        :title="themeState.mode === 'dark' ? '切换为和纸晨光亮色主题' : '切换为极夜暗色主题'"
      >
        <Sun v-if="themeState.mode === 'light'" class="w-3.5 h-3.5 text-[#d97706]" />
        <Moon v-else class="w-3.5 h-3.5" />
      </button>

      <!-- Settings Button -->
      <button
        @click="openSettings"
        class="p-1.5 text-[#8d9188] hover:text-[#f1f0e9] hover:bg-[#1b1e19] rounded-[8px] transition-colors"
        title="设置 API 服务器"
      >
        <Settings class="w-3.5 h-3.5" />
      </button>

      <div class="h-3 w-[1px] bg-white/[0.08] mx-0.5"></div>

      <!-- Window Controls -->
      <button
        @click="minimize"
        class="p-1.5 text-[#8d9188] hover:text-[#f1f0e9] hover:bg-[#1b1e19] rounded-[8px] transition-colors"
        title="最小化"
      >
        <Minus class="w-3.5 h-3.5" />
      </button>
      <button
        @click="toggleMaximize"
        class="p-1.5 text-[#8d9188] hover:text-[#f1f0e9] hover:bg-[#1b1e19] rounded-[8px] transition-colors"
        title="最大化 / 还原"
      >
        <Square class="w-3 h-3" />
      </button>
      <button
        @click="closeWindow"
        class="p-1.5 text-[#8d9188] hover:text-white hover:bg-red-500/80 rounded-[8px] transition-colors"
        title="关闭"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>
  </header>
</template>
