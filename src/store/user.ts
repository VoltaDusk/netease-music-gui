import { reactive } from "vue";
import type { Playlist } from "../types";

export interface UserProfile {
  userId: number;
  nickname: string;
  avatarUrl: string;
  signature?: string;
  vipType?: number;
  follows?: number;
  followeds?: number;
  level?: number;
}

const STORAGE_KEY_USER = "cloudmusic_user_profile";
const STORAGE_KEY_COOKIE = "cloudmusic_user_cookie";

function loadSavedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadSavedCookie(): string {
  return localStorage.getItem(STORAGE_KEY_COOKIE) || "";
}

const initialProfile = loadSavedProfile();
const initialCookie = loadSavedCookie();

export const userState = reactive({
  isLoggedIn: !!initialProfile,
  profile: initialProfile,
  cookie: initialCookie,
  isLoginModalOpen: false,
  userPlaylists: [] as Playlist[],
});

export const userActions = {
  loginSuccess(profile: UserProfile, cookie: string) {
    userState.isLoggedIn = true;
    userState.profile = profile;
    userState.cookie = cookie;
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(profile));
    localStorage.setItem(STORAGE_KEY_COOKIE, cookie);
    userState.isLoginModalOpen = false;
  },

  logout() {
    userState.isLoggedIn = false;
    userState.profile = null;
    userState.cookie = "";
    userState.userPlaylists = [];
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_COOKIE);
  },

  openLoginModal() {
    userState.isLoginModalOpen = true;
  },

  closeLoginModal() {
    userState.isLoginModalOpen = false;
  },

  setUserPlaylists(playlists: Playlist[]) {
    userState.userPlaylists = playlists;
  },
};
