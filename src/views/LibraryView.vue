<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check, Grid3X3, Layers, Library as LibraryIcon, Search, X } from 'lucide-vue-next'
import { useLibraryStore } from '@/stores/library'
import BookCover from '@/components/BookCover.vue'
import StarSpiceRating from '@/components/StarSpiceRating.vue'
import type { Book, BookStatus, ShelfStyle } from '@/types/models'

const router = useRouter()
const library = useLibraryStore()

const viewMode = ref<'grid' | 'shelf'>('grid')
const filterStatus = ref<'all' | BookStatus>('all')
const showSearch = ref(false)
const searchText = ref('')

const statusFilters: Array<{ value: 'all' | BookStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'reading', label: 'Reading' },
  { value: 'tbr', label: 'To Be Read' },
  { value: 'finished', label: 'Finished' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'dnf', label: 'DNF' },
]

const shelfStyles: Array<{ value: ShelfStyle; label: string }> = [
  { value: 'walnut', label: 'Walnut' },
  { value: 'oak', label: 'Warm Oak' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'minimal', label: 'Slate' },
]

const filteredBooks = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  return library.books.filter((b) => {
    if (filterStatus.value !== 'all' && b.status !== filterStatus.value) return false
    if (!q) return true
    return (
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      b.genres.some((g) => g.toLowerCase().includes(q)) ||
      b.tropes.some((t) => t.toLowerCase().includes(q)) ||
      b.moods.some((m) => m.toLowerCase().includes(q))
    )
  })
})

const shelfRows = computed(() => {
  const rows: Book[][] = []
  const chunk = 4
  for (let i = 0; i < filteredBooks.value.length; i += chunk) {
    rows.push(filteredBooks.value.slice(i, i + chunk))
  }
  return rows
})

function pct(b: Book) {
  if (!b.totalPages) return 0
  return Math.min(100, Math.round((b.currentPage / b.totalPages) * 100))
}
</script>

<template>
  <div class="page-scroll library-page">
    <header class="lib-header">
      <h1 class="page-title">LIBRARY</h1>

      <div class="header-actions">
        <div class="mode-switch">
          <button
            type="button"
            class="mode-btn"
            :class="{ active: viewMode === 'grid' }"
            aria-label="Grid view"
            @click="viewMode = 'grid'"
          >
            <Grid3X3 :size="15" />
          </button>
          <button
            type="button"
            class="mode-btn"
            :class="{ active: viewMode === 'shelf' }"
            aria-label="Cozy shelf view"
            @click="viewMode = 'shelf'"
          >
            <LibraryIcon :size="15" />
          </button>
          <button
            type="button"
            class="mode-btn"
            aria-label="Series tracker"
            @click="router.push('/series')"
          >
            <Layers :size="15" />
          </button>
        </div>

        <button type="button" class="icon-btn" @click="showSearch = !showSearch">
          <X v-if="showSearch" :size="17" />
          <Search v-else :size="17" />
        </button>
      </div>
    </header>

    <!-- Search input -->
    <div v-if="showSearch" class="search-wrap">
      <input
        v-model="searchText"
        type="search"
        class="input"
        placeholder="Filter by title, author, genre, mood, trope..."
        autofocus
      />
    </div>

    <!-- Filter chips + Quick Series link -->
    <div class="h-scroll filter-strip">
      <button
        v-for="item in statusFilters"
        :key="item.value"
        type="button"
        class="chip"
        :class="{ 'chip-active': filterStatus === item.value }"
        @click="filterStatus = item.value"
      >
        {{ item.label }}
      </button>
      <button type="button" class="chip chip-muted" @click="router.push('/series')">
        Series ({{ library.series.length }})
      </button>
    </div>

    <!-- Shelf wood style picker when in Cozy Shelf mode -->
    <div v-if="viewMode === 'shelf'" class="shelf-style-bar">
      <span class="subtle shelf-style-label">Shelf finish:</span>
      <div class="h-scroll">
        <button
          v-for="style in shelfStyles"
          :key="style.value"
          type="button"
          class="chip"
          :class="{ 'chip-active': library.profile.shelfStyle === style.value }"
          @click="library.setShelfStyle(style.value)"
        >
          {{ style.label }}
        </button>
      </div>
    </div>

    <!-- EMPTY STATE -->
    <div v-if="!filteredBooks.length" class="card empty-lib">
      No books match this filter yet. Tap the + button below to search or add one.
    </div>

    <!-- MODE 1: 3-COLUMN GRID (matching screenshot) -->
    <div v-else-if="viewMode === 'grid'" class="book-grid">
      <button
        v-for="book in filteredBooks"
        :key="book.id"
        type="button"
        class="grid-card"
        @click="router.push(`/book/${book.id}`)"
      >
        <div class="cover-box">
          <BookCover
            :src="book.coverUrl"
            :title="book.title"
            :author="book.author"
            radius="8px"
            :dimmed="book.status === 'wishlist'"
          />

          <span v-if="book.status === 'finished'" class="badge-check" aria-label="Finished">
            <Check :size="12" :stroke-width="3" />
          </span>

          <span v-else-if="book.status === 'dnf'" class="badge-dnf">DNF</span>
        </div>

        <div class="card-footer">
          <div v-if="book.status === 'finished'" class="stars-wrap">
            <StarSpiceRating :rating="book.rating" :size="13" />
          </div>

          <div v-else-if="book.status === 'reading' || book.status === 'dnf'" class="prog-row">
            <div class="progress-track">
              <div class="progress-fill" :style="{ width: `${pct(book)}%` }" />
            </div>
            <span class="prog-pct tabular">{{ pct(book) }}%</span>
          </div>

          <span v-else-if="book.status === 'wishlist'" class="status-label muted">Wishlist</span>
          <span v-else class="status-label">To Be Read</span>
        </div>
      </button>
    </div>

    <!-- MODE 2: COZY WOODEN BOOKSHELF VIEW -->
    <div v-else class="cozy-shelf-case" :data-shelf="library.profile.shelfStyle">
      <div v-for="(row, rowIdx) in shelfRows" :key="rowIdx" class="shelf-tier">
        <div class="shelf-books">
          <button
            v-for="book in row"
            :key="book.id"
            type="button"
            class="shelf-book"
            @click="router.push(`/book/${book.id}`)"
          >
            <BookCover :src="book.coverUrl" :title="book.title" :author="book.author" radius="5px" />
            <span v-if="book.status === 'finished'" class="shelf-dot" />
          </button>

          <!-- Cozy shelf trinket when row isn't full -->
          <div v-if="row.length < 4" class="shelf-decor" aria-hidden="true">
            <div class="candle-jar">
              <span class="candle-flame" />
            </div>
          </div>
        </div>
        <div class="shelf-plank" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.library-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.lib-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-switch {
  display: inline-flex;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  padding: 3px;
  gap: 2px;
}

.mode-btn {
  width: 32px;
  height: 30px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.mode-btn.active {
  background: var(--accent);
  color: var(--accent-on);
}

.filter-strip {
  gap: 8px;
}

.filter-strip .chip {
  flex-shrink: 0;
}

.shelf-style-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.shelf-style-label {
  font-size: 12px;
  white-space: nowrap;
}

.empty-lib {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-secondary);
  font-size: 13.5px;
}

/* 3-col Grid */
.book-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 10px;
}

.grid-card {
  display: flex;
  flex-direction: column;
  gap: 7px;
  text-align: left;
  min-width: 0;
}

.cover-box {
  position: relative;
}

.badge-check {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-on);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
}

.badge-dnf {
  position: absolute;
  top: -4px;
  right: -4px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-on);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.5);
}

.card-footer {
  min-height: 18px;
  display: flex;
  align-items: center;
}

.stars-wrap {
  display: flex;
  align-items: center;
}

.prog-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 6px;
}

.prog-pct {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-primary);
}

.status-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}

/* Cozy Wooden Bookshelf */
.cozy-shelf-case {
  border-radius: var(--radius-lg);
  padding: 18px 14px 10px;
  background: linear-gradient(180deg, #1b1512 0%, #14100e 100%);
  border: 1px solid rgba(255, 232, 214, 0.09);
  box-shadow: inset 0 18px 36px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.shelf-tier {
  display: flex;
  flex-direction: column;
}

.shelf-books {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: end;
  gap: 10px;
  padding: 0 6px;
}

.shelf-book {
  position: relative;
  transform-origin: bottom center;
  transition: transform 0.18s ease;
}

.shelf-book:hover {
  transform: translateY(-4px);
}

.shelf-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}

.shelf-plank {
  height: 14px;
  margin-top: -2px;
  border-radius: 4px;
  background: linear-gradient(180deg, #593b2a 0%, #3a2419 60%, #24150e 100%);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 224, 198, 0.22);
}

.cozy-shelf-case[data-shelf='oak'] .shelf-plank {
  background: linear-gradient(180deg, #8c6642 0%, #634529 65%, #3d2a18 100%);
}

.cozy-shelf-case[data-shelf='espresso'] .shelf-plank {
  background: linear-gradient(180deg, #322420 0%, #1d1412 65%, #110c0b 100%);
}

.cozy-shelf-case[data-shelf='minimal'] .shelf-plank {
  background: linear-gradient(180deg, #3d393a 0%, #262324 70%, #181617 100%);
}

.shelf-decor {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 2px;
}

.candle-jar {
  width: 26px;
  height: 30px;
  border-radius: 6px 6px 4px 4px;
  background: linear-gradient(180deg, rgba(200, 150, 133, 0.55), rgba(112, 74, 62, 0.85));
  position: relative;
  border: 1px solid rgba(255, 240, 226, 0.2);
}

.candle-flame {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 7px;
  height: 11px;
  border-radius: 50% 50% 50% 50% / 65% 65% 35% 35%;
  background: radial-gradient(circle at 50% 70%, #fff7d6 0%, #f59e42 75%, transparent 100%);
  box-shadow: 0 0 14px 4px rgba(245, 165, 80, 0.55);
}
</style>
