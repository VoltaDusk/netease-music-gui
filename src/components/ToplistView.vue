<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Headphones, Play } from "lucide-vue-next";
import { api } from "../services/api";
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
  if (count >= 100000000) {
    return (count / 100000000).toFixed(1) + "亿";
  }
  if (count >= 10000) {
    return Math.floor(count / 10000) + "万";
  }
  return count.toString();
}
</script>

<template>
  <div class="p-8 space-y-6 select-none max-w-[1100px] mx-auto">
    <div class="flex items-center gap-2">
      <span class="text-xl text-[#d6f379] font-mono">〽</span>
      <h1 class="text-xl font-bold text-[#f1f0e9] tracking-tight">官方权威榜单</h1>
    </div>

    <!-- Grid of Toplists -->
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      <div
        v-for="item in toplists"
        :key="item.id"
        @click="emit('select-playlist', item)"
        class="flex flex-col group cursor-pointer"
      >
        <div class="relative w-full aspect-square rounded-[12px] overflow-hidden bg-[#171916] shadow-md border border-white/[0.08] transition-transform duration-200 group-hover:-translate-y-1 cover-ring">
          <img
            :src="item.coverImgUrl"
            alt="cover"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />

          <div
            class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-1 text-[9px] text-[#f1f0e9] font-mono"
          >
            <Headphones class="w-2.5 h-2.5 text-[#d6f379]" />
            <span>{{ formatPlayCount(item.playCount) }}</span>
          </div>

          <!-- Hover Play Overlay -->
          <div
            class="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <div
              class="w-10 h-10 rounded-full bg-[#d6f379] text-[#1a1d13] flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-200"
            >
              <Play class="w-4 h-4 fill-[#1a1d13] translate-x-0.5" />
            </div>
          </div>
        </div>

        <b
          class="text-xs text-[#f1f0e9] group-hover:text-[#d6f379] transition-colors mt-2.5 truncate"
        >
          {{ item.name }}
        </b>
        <span class="text-[10px] text-[#8d9188] truncate mt-0.5">
          实时更新
        </span>
      </div>
    </div>
  </div>
</template>
