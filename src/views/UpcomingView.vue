<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ChevronLeft, Plus } from 'lucide-vue-next'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'
import { formatShortReleaseDate, parseLocalDateKey } from '@/utils/dates'
import BookCover from '@/components/BookCover.vue'

const router = useRouter()
const library = useLibraryStore()
const ui = useUiStore()

function daysUntil(isoDate: string): string {
  const target = parseLocalDateKey(isoDate).getTime()
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diff = Math.ceil((target - now.getTime()) / 86400000)
  if (diff <= 0) return 'Out today'
  if (diff === 1) return 'Tomorrow'
  return `in ${diff}d`
}
</script>

<template>
  <div class="page-scroll upcoming-page">
    <header class="top-bar">
      <button type="button" class="icon-btn" @click="router.back()">
        <ChevronLeft :size="20" />
      </button>
      <h1 class="upcoming-heading">Coming soon</h1>
      <button type="button" class="icon-btn icon-btn-accent" @click="ui.openQuickAdd('manual')">
        <Plus :size="18" />
      </button>
    </header>

    <div class="card upcoming-card">
      <div v-if="library.upcomingReleases.length" class="release-list">
        <button
          v-for="book in library.upcomingReleases"
          :key="book.id"
          type="button"
          class="release-row"
          @click="router.push(`/book/${book.id}`)"
        >
          <div class="release-cover">
            <BookCover :src="book.coverUrl" :title="book.title" :author="book.author" radius="6px" />
          </div>

          <div class="release-info">
            <span class="release-title">{{ book.title }}</span>
            <span class="release-author">{{ book.author }}</span>
          </div>

          <div v-if="book.releaseDate" class="release-date-col">
            <span class="release-date tabular">{{ formatShortReleaseDate(book.releaseDate) }}</span>
            <span class="release-countdown">{{ daysUntil(book.releaseDate) }}</span>
          </div>
        </button>
      </div>

      <div v-else class="empty-upcoming">
        No upcoming releases tracked yet.
      </div>

      <p class="upcoming-tip">
        Waiting on an upcoming release? Add it to your Wishlist (or move it from TBR) and enter its
        release date on the book's details page.
      </p>
    </div>
  </div>
</template>

<style scoped>
.upcoming-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.upcoming-heading {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  flex: 1;
}

.upcoming-card {
  padding: 8px 16px 18px;
}

.release-list {
  display: flex;
  flex-direction: column;
}

.release-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 0;
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
}

.release-cover {
  width: 42px;
  flex-shrink: 0;
}

.release-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.release-title {
  font-size: 14.5px;
  font-weight: 700;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.release-author {
  font-size: 12.5px;
  color: var(--text-secondary);
}

.release-date-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.release-date {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.release-countdown {
  font-size: 11px;
  color: var(--accent);
  font-weight: 600;
}

.empty-upcoming {
  padding: 32px 12px;
  text-align: center;
  color: var(--text-muted);
}

.upcoming-tip {
  margin: 16px 0 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-secondary);
}
</style>
