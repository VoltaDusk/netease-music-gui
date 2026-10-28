<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import {
  X,
  QrCode,
  RefreshCw,
  CheckCircle2,
  Smartphone,
  KeyRound,
  Sparkles,
} from "lucide-vue-next";
import { api, DEMO_SONGS, DEFAULT_AVATAR_URL } from "../services/api";
import { userState, userActions, type UserProfile } from "../store/user";
import { playerActions, playerState } from "../store/player";

const activeTab = ref<"qr" | "cookie">("qr");
const qrKey = ref("");
const qrImg = ref("");
const qrStatus = ref<"loading" | "waiting" | "scanned" | "success" | "expired" | "error">("loading");
const statusText = ref("正在生成登录二维码...");
const customCookie = ref("");
const isVerifyingCookie = ref(false);
const cookieError = ref("");

let pollTimer: any = null;

async function generateQrCode() {
  stopPolling();
  qrStatus.value = "loading";
  statusText.value = "正在向网易云服务器申请授权码...";

  try {
    const key = await api.getQrKey();
    if (!key) {
      throw new Error("未能获取到授权 Key");
    }
    qrKey.value = key;
    const img = await api.getQrImg(key);
    qrImg.value = img;
    qrStatus.value = "waiting";
    statusText.value = "请使用网易云音乐 APP 扫码登录";

    startPolling(key);
  } catch (err) {
    console.warn("QR generation error:", err);
    qrStatus.value = "error";
    statusText.value = "生成二维码失败，可尝试一键体验登录或配置 API";
  }
}

function startPolling(key: string) {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      const res = await api.checkQrStatus(key);
      if (res.code === 800) {
        qrStatus.value = "expired";
        statusText.value = "二维码已失效，点击刷新";
        stopPolling();
      } else if (res.code === 801) {
        qrStatus.value = "waiting";
        statusText.value = "请使用网易云音乐 APP 扫码登录";
      } else if (res.code === 802) {
        qrStatus.value = "scanned";
        statusText.value = "扫描成功，请在手机上点击确认";
      } else if (res.code === 803) {
        qrStatus.value = "success";
        statusText.value = "授权成功！正在同步账户信息...";
        stopPolling();

        const cookie = res.cookie || "";
        await syncUserProfile(cookie);
      }
    } catch {
      // ignore transient poll error
    }
  }, 2500);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function syncUserProfile(cookie: string) {
  try {
    const accountRes = await api.getUserAccount(cookie);
    if (accountRes && (accountRes.profile || accountRes.account)) {
      const profile = accountRes.profile || {};
      const userProfile: UserProfile = {
        userId: profile.userId || accountRes.account?.id || 10001,
        nickname: profile.nickname || accountRes.account?.userName || "云音乐用户",
        avatarUrl: profile.avatarUrl || DEFAULT_AVATAR_URL,
        signature: profile.signature,
        vipType: profile.vipType,
        follows: profile.follows,
        followeds: profile.followeds,
      };
      userActions.loginSuccess(userProfile, cookie);

      // Fetch user playlists
      api.getUserPlaylists(userProfile.userId).then((list) => {
        userActions.setUserPlaylists(list);
      });

      // 立即触发云端红心喜欢的音乐同步
      playerActions.syncLikedFromCloud(userProfile.userId);
      return;
    }
  } catch (err) {
    console.warn("Failed to fetch user profile:", err);
  }

  // Fallback demo profile if account endpoint fails
  useDemoLogin();
}

function useDemoLogin() {
  const demoProfile: UserProfile = {
    userId: 888888,
    nickname: "雾岛极客",
    avatarUrl: "https://p1.music.126.net/rV3F8j6v6vO2n7Q1b8XmQw==/109951165431875189.jpg",
    signature: "让音乐，陪你慢下来 · 极简主义爱好者",
    vipType: 11,
    follows: 42,
    followeds: 128,
  };
  userActions.loginSuccess(demoProfile, "DEMO_MUSIC_U_COOKIE_TOKEN");
  playerState.likedSongs = [...DEMO_SONGS];
  DEMO_SONGS.forEach((s) => playerState.likedIds.add(s.id));
  localStorage.setItem("cloudmusic_liked_ids", JSON.stringify(Array.from(playerState.likedIds)));
  localStorage.setItem("cloudmusic_liked_songs_cache", JSON.stringify(playerState.likedSongs));
}

async function handleCookieLogin() {
  if (!customCookie.value.trim()) {
    cookieError.value = "请输入有效的 Cookie 字符串";
    return;
  }
  isVerifyingCookie.value = true;
  cookieError.value = "";

  try {
    await syncUserProfile(customCookie.value.trim());
  } catch (err) {
    cookieError.value = "Cookie 校验失败，请检查格式或网络";
  } finally {
    isVerifyingCookie.value = false;
  }
}

watch(
  () => userState.isLoginModalOpen,
  (open) => {
    if (open) {
      generateQrCode();
    } else {
      stopPolling();
    }
  }
);

onUnmounted(() => {
  stopPolling();
});

function close() {
  userActions.closeLoginModal();
}
</script>

<template>
  <div
    v-if="userState.isLoginModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none animate-in fade-in duration-200"
  >
    <div
      class="w-full max-w-sm bg-[#171916] border border-white/[0.08] rounded-[16px] shadow-2xl overflow-hidden flex flex-col"
    >
      <!-- Header -->
      <header class="h-14 px-5 flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02]">
        <div class="flex items-center gap-2">
          <div class="w-6 h-6 rounded-[7px] bg-[#d6f379] flex items-center justify-center">
            <QrCode class="w-3.5 h-3.5 text-[#1a1d13]" />
          </div>
          <h2 class="text-xs font-bold text-[#f1f0e9] tracking-wide">登录网易云音乐</h2>
        </div>
        <button
          @click="close"
          class="p-1.5 text-[#8d9188] hover:text-[#f1f0e9] rounded-[7px] transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </header>

      <!-- Tabs Switcher -->
      <div class="flex items-center border-b border-white/[0.08] text-xs font-medium">
        <button
          @click="activeTab = 'qr'"
          class="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors relative"
          :class="activeTab === 'qr' ? 'text-[#d6f379] font-bold' : 'text-[#8d9188] hover:text-[#f1f0e9]'"
        >
          <Smartphone class="w-3.5 h-3.5" />
          <span>扫码登录</span>
          <div
            v-if="activeTab === 'qr'"
            class="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[#d6f379] rounded-full"
          ></div>
        </button>

        <button
          @click="activeTab = 'cookie'"
          class="flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-colors relative"
          :class="activeTab === 'cookie' ? 'text-[#d6f379] font-bold' : 'text-[#8d9188] hover:text-[#f1f0e9]'"
        >
          <KeyRound class="w-3.5 h-3.5" />
          <span>Cookie 凭据</span>
          <div
            v-if="activeTab === 'cookie'"
            class="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-[#d6f379] rounded-full"
          ></div>
        </button>
      </div>

      <!-- Tab Content: QR Code Scan -->
      <main v-if="activeTab === 'qr'" class="p-6 flex flex-col items-center justify-center space-y-4">
        <!-- QR Code Container -->
        <div class="relative w-44 h-44 rounded-[14px] bg-white p-3 shadow-xl flex items-center justify-center overflow-hidden border border-white/[0.08]">
          <!-- Real QR Image -->
          <img
            v-if="qrImg"
            :src="qrImg"
            alt="login qr code"
            class="w-full h-full object-contain"
          />

          <!-- Loading Spinner -->
          <div
            v-else-if="qrStatus === 'loading'"
            class="flex flex-col items-center justify-center gap-2 text-gray-700"
          >
            <RefreshCw class="w-6 h-6 animate-spin text-[#d6f379]" />
            <span class="text-[11px] font-mono">生成中...</span>
          </div>

          <!-- Expired / Error Overlay -->
          <div
            v-if="qrStatus === 'expired' || qrStatus === 'error'"
            @click="generateQrCode"
            class="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 text-white cursor-pointer hover:bg-black/80 transition-colors p-4 text-center"
          >
            <RefreshCw class="w-6 h-6 text-[#d6f379]" />
            <span class="text-xs font-semibold">点击刷新二维码</span>
          </div>

          <!-- Scanned Overlay -->
          <div
            v-else-if="qrStatus === 'scanned'"
            class="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 text-white p-4 text-center"
          >
            <CheckCircle2 class="w-8 h-8 text-[#d6f379] animate-pulse" />
            <span class="text-xs font-bold">扫描成功</span>
            <span class="text-[10px] text-gray-300">请在手机端确认授权</span>
          </div>
        </div>

        <!-- Status Tip Text -->
        <p class="text-xs text-[#a8aca3] text-center font-medium leading-relaxed">
          {{ statusText }}
        </p>

        <!-- Fast Demo Login Button -->
        <div class="w-full pt-2 border-t border-white/[0.08] flex flex-col items-center gap-2">
          <button
            @click="useDemoLogin"
            class="w-full py-2 px-3 rounded-[9px] bg-[#23261f] hover:bg-[#2c3027] border border-[#d6f379]/30 text-[#d6f379] text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Sparkles class="w-3.5 h-3.5" />
            <span>一键快捷体验登录 (体验黑胶身份)</span>
          </button>
          <span class="text-[10px] text-[#686d65] text-center">
            无需手机扫码，即可在无服务状态下体验个人主页与VIP标识
          </span>
        </div>
      </main>

      <!-- Tab Content: Manual Cookie Login -->
      <main v-else class="p-6 space-y-4">
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-[#f1f0e9]">
            网易云音乐 Cookie (MUSIC_U)
          </label>
          <textarea
            v-model="customCookie"
            placeholder="粘贴 MUSIC_U=... 或完整 Cookie 字符串"
            rows="4"
            class="w-full p-2.5 rounded-[9px] bg-[#141612] border border-white/[0.08] text-[#f1f0e9] text-xs outline-none focus:border-[#d6f379]/60 font-mono transition-colors resize-none placeholder-[#686d65]"
          ></textarea>
          <p v-if="cookieError" class="text-[11px] text-[#ff6b6b]">
            {{ cookieError }}
          </p>
        </div>

        <button
          @click="handleCookieLogin"
          :disabled="isVerifyingCookie"
          class="w-full py-2.5 rounded-[9px] bg-[#d6f379] hover:bg-[#e4f796] text-[#1a1d13] text-xs font-bold shadow-md hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 transition-all"
        >
          {{ isVerifyingCookie ? "正在校验登录凭证..." : "登录" }}
        </button>

        <p class="text-[10px] text-[#686d65] leading-relaxed">
          提示：可在浏览器打开 music.163.com 登录后，从开发者工具 Application -> Cookies 中复制 MUSIC_U 的值。
        </p>
      </main>
    </div>
  </div>
</template>
