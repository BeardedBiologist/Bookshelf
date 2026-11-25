<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    src?: string
    title: string
    author?: string
    radius?: string
    dimmed?: boolean
  }>(),
  {
    src: '',
    author: '',
    radius: '10px',
    dimmed: false,
  },
)

const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)

const showImg = computed(() => Boolean(props.src) && !failed.value)

const fallbackGradient = computed(() => {
  const palettes = [
    ['#3d2734', '#1a1118'],
    ['#21383c', '#101b1e'],
    ['#473226', '#1c130e'],
    ['#2d2b44', '#141320'],
    ['#344235', '#131a14'],
    ['#4d2c2c', '#1e1111'],
  ]
  let hash = 0
  for (let i = 0; i < props.title.length; i++) {
    hash = (hash * 31 + props.title.charCodeAt(i)) | 0
  }
  const [c1, c2] = palettes[Math.abs(hash) % palettes.length]
  return `linear-gradient(145deg, ${c1} 0%, ${c2} 100%)`
})
</script>

<template>
  <div
    class="book-cover"
    :class="{ 'is-dimmed': dimmed }"
    :style="{ borderRadius: radius }"
  >
    <img
      v-if="showImg"
      :src="src"
      :alt="title"
      loading="lazy"
      @error="failed = true"
    />
    <div v-else class="cover-fallback" :style="{ background: fallbackGradient }">
      <div class="cover-border">
        <span class="cover-title">{{ title }}</span>
        <span v-if="author" class="cover-author">{{ author }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.book-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 2 / 3;
  overflow: hidden;
  background: #1c1818;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.42);
  flex-shrink: 0;
}

.book-cover.is-dimmed img,
.book-cover.is-dimmed .cover-fallback {
  opacity: 0.48;
  filter: saturate(0.55);
}

.book-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  padding: 6px;
  display: flex;
}

.cover-border {
  flex: 1;
  border: 1px solid rgba(200, 150, 133, 0.35);
  border-radius: 6px;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  text-align: center;
}

.cover-title {
  font-family: var(--font-serif);
  font-size: 13px;
  line-height: 1.15;
  color: #f5f0ec;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.cover-author {
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--accent);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
