<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Calendar, ChevronRight, Flame, Plus, Quote } from 'lucide-vue-next'
import { useLibraryStore } from '@/stores/library'
import { useTimerStore } from '@/stores/timer'
import { useUiStore } from '@/stores/ui'
import { formatLongDate, formatShortReleaseDate, getTimeGreeting } from '@/utils/dates'
import BookCover from '@/components/BookCover.vue'
import ProgressRing from '@/components/ProgressRing.vue'

const router = useRouter()
const library = useLibraryStore()
const timer = useTimerStore()
const ui = useUiStore()

const greeting = computed(() => getTimeGreeting())
const todayLabel = computed(() => formatLongDate())

const primaryBook = computed(() => library.primaryReadingBook)
const primaryPercent = computed(() => {
  const b = primaryBook.value
  if (!b || !b.totalPages) return 0
  return Math.round((b.currentPage / b.totalPages) * 100)
})

const todaysQuote = computed(() => {
  if (!library.quotes.length) return null
  const daySeed = new Date().getDate() + new Date().getMonth() * 31
  return library.quotes[daySeed % library.quotes.length]
})

const upcomingPreview = computed(() => library.upcomingReleases.slice(0, 3))

function pct(current: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.round((current / total) * 100))
}

function continueReading() {
  if (primaryBook.value) {
    timer.startForBook(primaryBook.value.id)
  } else {
    ui.openQuickAdd('search')
  }
}
</script>

<template>
  <div class="page-scroll home-page">
    <!-- Top Bar -->
    <header class="today-header">
      <h1 class="page-title">TODAY</h1>
      <div class="greeting-block">
        <span class="greeting-accent">{{ greeting }}</span>
        <span class="greeting-date">{{ todayLabel }}</span>
      </div>
    </header>

    <!-- Currently Reading Hero -->
    <section class="section">
      <h2 class="section-title">Currently reading</h2>

      <div v-if="primaryBook" class="current-card dotted-surface">
        <div class="current-left">
          <ProgressRing :percent="primaryPercent" :size="136" :stroke-width="11" />
          <button type="button" class="btn btn-cream continue-btn" @click="continueReading()">
            Continue reading
          </button>
        </div>

        <div class="current-right" @click="router.push(`/book/${primaryBook.id}`)">
          <div class="hero-cover">
            <BookCover
              :src="primaryBook.coverUrl"
              :title="primaryBook.title"
              :author="primaryBook.author"
              radius="10px"
            />
          </div>
          <span class="page-caption tabular">
            p.{{ primaryBook.currentPage }} of {{ primaryBook.totalPages }}
          </span>
        </div>
      </div>

      <div v-else class="card dotted-surface empty-reading">
        <p class="muted">No book currently on your nightstand.</p>
        <button type="button" class="btn btn-accent btn-pill" @click="ui.openQuickAdd('search')">
          <Plus :size="15" /> Start a book
        </button>
      </div>
    </section>

    <!-- Also on the go -->
    <section v-if="library.alsoReadingBooks.length" class="section">
      <h2 class="section-title">Also on the go</h2>
      <div class="h-scroll also-row">
        <button
          v-for="book in library.alsoReadingBooks"
          :key="book.id"
          type="button"
          class="also-tile"
          @click="router.push(`/book/${book.id}`)"
        >
          <BookCover :src="book.coverUrl" :title="book.title" :author="book.author" radius="8px" />
          <div class="also-prog">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${pct(book.currentPage, book.totalPages)}%` }" />
            </div>
            <span class="also-pct tabular">{{ pct(book.currentPage, book.totalPages) }}%</span>
          </div>
        </button>
      </div>
    </section>

    <!-- Streak Strip Card -->
    <section class="section">
      <button type="button" class="card streak-card" @click="router.push('/calendar')">
        <div class="streak-left">
          <div class="streak-top">
            <Flame :size="24" class="flame-ico" fill="currentColor" />
            <span class="streak-num tabular">{{ library.streakInfo.currentStreak }}</span>
          </div>
          <span class="streak-sub">days streak</span>
        </div>

        <div class="week-strip">
          <div v-for="day in library.streakInfo.weekDays" :key="day.dateKey" class="week-col">
            <span class="week-label" :class="{ today: day.isToday }">{{ day.label }}</span>
            <span class="week-dot" :class="{ active: day.active, today: day.isToday }">
              <span v-if="day.active" class="week-dot-core" />
            </span>
          </div>
        </div>
      </button>
    </section>

    <!-- Today's Quote Card -->
    <section class="section">
      <button type="button" class="card quote-preview" @click="router.push('/quotes')">
        <div class="quote-preview-head">
          <div class="quote-title-row">
            <Quote :size="16" class="quote-ico" />
            <span class="section-title">Today's quote</span>
          </div>
          <ChevronRight :size="18" class="muted" />
        </div>

        <template v-if="todaysQuote">
          <p class="quote-text">“{{ todaysQuote.text }}”</p>
          <div class="quote-meta">
            <span>{{ todaysQuote.bookTitle }}</span>
            <span v-if="todaysQuote.page"> · p.{{ todaysQuote.page }}</span>
          </div>
        </template>
        <p v-else class="quote-empty">Save memorable passages as you read.</p>
      </button>
    </section>

    <!-- Coming Soon Preview -->
    <section class="section">
      <div class="section-head">
        <div class="quote-title-row">
          <Calendar :size="16" class="accent-ico" />
          <h2 class="section-title">Coming soon</h2>
        </div>
        <button type="button" class="see-all-btn" @click="router.push('/upcoming')">
          See all <ChevronRight :size="15" />
        </button>
      </div>

      <div v-if="upcomingPreview.length" class="card upcoming-mini-list">
        <button
          v-for="book in upcomingPreview"
          :key="book.id"
          type="button"
          class="upcoming-row"
          @click="router.push(`/book/${book.id}`)"
        >
          <div class="upcoming-thumb">
            <BookCover :src="book.coverUrl" :title="book.title" :author="book.author" radius="5px" />
          </div>
          <div class="upcoming-info">
            <span class="upcoming-title">{{ book.title }}</span>
            <span class="upcoming-author">{{ book.author }}</span>
          </div>
          <span v-if="book.releaseDate" class="upcoming-date tabular">
            {{ formatShortReleaseDate(book.releaseDate) }}
          </span>
        </button>
      </div>
      <button v-else type="button" class="card upcoming-empty" @click="router.push('/upcoming')">
        Track upcoming book releases by adding release dates on Wishlist books.
      </button>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.today-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.greeting-block {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.25;
}

.greeting-accent {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
}

.greeting-date {
  font-size: 13.5px;
  color: var(--text-primary);
  font-weight: 500;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.current-card {
  border-radius: var(--radius-lg);
  padding: 20px 16px;
  border: 1px solid var(--border-subtle);
  display: grid;
  grid-template-columns: 1fr 122px;
  align-items: center;
  gap: 14px;
}

.current-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.continue-btn {
  height: 36px;
  padding: 0 18px;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}

.current-right {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.hero-cover {
  width: 112px;
}

.page-caption {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-reading {
  text-align: center;
  padding: 28px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.also-tile {
  width: 104px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
  text-align: left;
}

.also-prog {
  display: flex;
  align-items: center;
  gap: 6px;
}

.also-pct {
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.streak-card {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-align: left;
  padding: 16px 18px;
}

.streak-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.streak-top {
  display: flex;
  align-items: center;
  gap: 6px;
}

.flame-ico {
  color: #f08a4b;
}

.streak-num {
  font-size: 28px;
  font-weight: 800;
  line-height: 1;
}

.streak-sub {
  font-size: 12px;
  color: var(--text-secondary);
}

.week-strip {
  display: flex;
  align-items: center;
  gap: 8px;
}

.week-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.week-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
}

.week-label.today {
  color: var(--accent);
}

.week-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 245, 238, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
}

.week-dot.active {
  background: var(--sage);
  border-color: var(--sage);
}

.week-dot.today:not(.active) {
  border-color: var(--accent);
}

.week-dot-core {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #141212;
}

.quote-preview {
  width: 100%;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quote-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quote-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.quote-ico,
.accent-ico {
  color: var(--accent);
}

.quote-text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}

.quote-meta {
  font-size: 12px;
  color: var(--text-secondary);
}

.quote-empty {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.see-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--accent);
}

.upcoming-mini-list {
  padding: 6px 14px;
}

.upcoming-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
}

.upcoming-row:last-child {
  border-bottom: none;
}

.upcoming-thumb {
  width: 34px;
  flex-shrink: 0;
}

.upcoming-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.upcoming-title {
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.upcoming-author {
  font-size: 12px;
  color: var(--text-secondary);
}

.upcoming-date {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.upcoming-empty {
  width: 100%;
  text-align: left;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
