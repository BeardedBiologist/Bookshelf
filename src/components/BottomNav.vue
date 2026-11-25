<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BarChart2, BookOpen, Home, MoreHorizontal, Plus, Timer } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { useTimerStore } from '@/stores/timer'
import { useLibraryStore } from '@/stores/library'
import { formatTimerClock } from '@/utils/dates'

const route = useRoute()
const router = useRouter()
const ui = useUiStore()
const timer = useTimerStore()
const library = useLibraryStore()

const activeSection = computed(() => {
  const name = String(route.name || 'home')
  if (name === 'home' || name === 'upcoming') return 'home'
  if (name === 'library' || name === 'series' || name === 'book-detail') return 'library'
  if (name === 'stats') return 'stats'
  return 'more'
})

const activeTimerBook = computed(() =>
  timer.bookId ? library.getBookById(timer.bookId) : null,
)

function go(path: string) {
  router.push(path)
}
</script>

<template>
  <div class="dock-container">
    <!-- Floating minimized timer pill -->
    <button
      v-if="timer.isActive && !timer.isOpen"
      type="button"
      class="timer-pill"
      @click="timer.openModal()"
    >
      <Timer :size="15" />
      <span class="timer-pill-title">{{ activeTimerBook?.title || 'Reading session' }}</span>
      <span class="timer-pill-clock tabular">{{ formatTimerClock(timer.elapsedSeconds) }}</span>
    </button>

    <nav class="bottom-dock" aria-label="Main navigation">
      <button
        type="button"
        class="nav-item"
        :class="{ active: activeSection === 'home' }"
        @click="go('/')"
      >
        <Home :size="20" :stroke-width="activeSection === 'home' ? 2.2 : 1.7" />
        <span>Home</span>
      </button>

      <button
        type="button"
        class="nav-item"
        :class="{ active: activeSection === 'library' }"
        @click="go('/library')"
      >
        <BookOpen :size="20" :stroke-width="activeSection === 'library' ? 2.2 : 1.7" />
        <span>Library</span>
      </button>

      <button
        type="button"
        class="fab-btn"
        aria-label="Add book or quote"
        @click="ui.openQuickAdd('search')"
      >
        <Plus :size="26" :stroke-width="2.4" />
      </button>

      <button
        type="button"
        class="nav-item"
        :class="{ active: activeSection === 'stats' }"
        @click="go('/stats')"
      >
        <BarChart2 :size="20" :stroke-width="activeSection === 'stats' ? 2.2 : 1.7" />
        <span>Stats</span>
      </button>

      <button
        type="button"
        class="nav-item"
        :class="{ active: activeSection === 'more' }"
        @click="go('/more')"
      >
        <MoreHorizontal :size="20" :stroke-width="activeSection === 'more' ? 2.2 : 1.7" />
        <span>More</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.dock-container {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  padding: 0 12px calc(10px + var(--safe-bottom));
  pointer-events: none;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.timer-pill {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: #231e1e;
  border: 1px solid var(--accent-border);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55), 0 0 14px var(--accent-glow);
}

.timer-pill-title {
  max-width: 170px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.timer-pill-clock {
  color: var(--accent);
  font-weight: 700;
}

.bottom-dock {
  pointer-events: auto;
  width: 100%;
  height: 62px;
  background: var(--bg-dock);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border: 1px solid var(--border-strong);
  border-radius: 999px;
  display: grid;
  grid-template-columns: 1fr 1fr 68px 1fr 1fr;
  align-items: center;
  padding: 0 8px;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.65);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  height: 48px;
  border-radius: 999px;
  color: var(--text-muted);
  font-size: 10.5px;
  font-weight: 600;
  transition: color 0.16s ease, background-color 0.16s ease;
}

.nav-item.active {
  color: var(--text-primary);
  background: rgba(255, 245, 238, 0.08);
}

.fab-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-on);
  display: flex;
  align-items: center;
  justify-content: center;
  justify-self: center;
  transform: translateY(-10px);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.5), 0 0 18px var(--accent-glow);
  transition: transform 0.14s ease, background-color 0.16s ease;
}

.fab-btn:active {
  transform: translateY(-10px) scale(0.93);
}
</style>
