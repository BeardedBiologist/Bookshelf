<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, Copy, Heart, MoreHorizontal, Plus, Search, Share2, Trash2 } from 'lucide-vue-next'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'
import BookCover from '@/components/BookCover.vue'
import type { SavedQuote } from '@/types/models'

const router = useRouter()
const library = useLibraryStore()
const ui = useUiStore()

const searchQuery = ref('')
const filterMode = ref<'all' | 'favorites' | 'by-book'>('all')
const featuredIndex = ref(0)
const activeMenuId = ref<string | null>(null)

const distinctBookCount = computed(() => {
  const keys = new Set(library.quotes.map((q) => q.bookId || q.bookTitle))
  return keys.size
})

const featuredQuote = computed<SavedQuote | null>(() => {
  if (!library.quotes.length) return null
  return library.quotes[featuredIndex.value % library.quotes.length]
})

const filteredQuotes = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return library.quotes.filter((item) => {
    if (filterMode.value === 'favorites' && !item.isFavorite) return false
    if (!q) return true
    return (
      item.text.toLowerCase().includes(q) ||
      item.bookTitle.toLowerCase().includes(q) ||
      item.bookAuthor.toLowerCase().includes(q)
    )
  })
})

const groupedByBook = computed(() => {
  const groups = new Map<string, { title: string; author: string; coverUrl: string; quotes: SavedQuote[] }>()
  for (const q of filteredQuotes.value) {
    const key = q.bookId || q.bookTitle
    if (!groups.has(key)) {
      groups.set(key, {
        title: q.bookTitle,
        author: q.bookAuthor,
        coverUrl: q.bookCoverUrl,
        quotes: [],
      })
    }
    groups.get(key)!.quotes.push(q)
  }
  return Array.from(groups.values())
})

function surpriseMe() {
  if (library.quotes.length <= 1) return
  let next = featuredIndex.value
  while (next === featuredIndex.value) {
    next = Math.floor(Math.random() * library.quotes.length)
  }
  featuredIndex.value = next
}

async function shareQuote(quote: SavedQuote) {
  const text = `“${quote.text}”\n— ${quote.bookTitle}, ${quote.bookAuthor}${quote.page ? ` (p. ${quote.page})` : ''}`
  if (navigator.share) {
    try {
      await navigator.share({ title: quote.bookTitle, text })
      return
    } catch {
      // fallback
    }
  }
  await navigator.clipboard?.writeText(text)
  ui.showToast('Quote copied to clipboard')
}

async function toggleFav(quote: SavedQuote) {
  await library.updateQuote(quote.id, { isFavorite: !quote.isFavorite })
}

async function removeQuote(id: string) {
  activeMenuId.value = null
  await library.deleteQuote(id)
  ui.showToast('Quote deleted')
}
</script>

<template>
  <div class="page-scroll quotes-page" @click="activeMenuId = null">
    <header class="quotes-header">
      <button type="button" class="icon-btn" @click="router.back()">
        <ChevronLeft :size="20" />
      </button>

      <div class="header-titles">
        <h1 class="page-title">QUOTES</h1>
        <span class="subtle header-sub">
          {{ library.quotes.length }} {{ library.quotes.length === 1 ? 'line' : 'lines' }} from
          {{ distinctBookCount }} {{ distinctBookCount === 1 ? 'book' : 'books' }}
        </span>
      </div>

      <button
        type="button"
        class="icon-btn icon-btn-accent"
        aria-label="Add quote"
        @click="ui.openQuickAdd('quote')"
      >
        <Plus :size="18" />
      </button>
    </header>

    <!-- Today's Quote Glow Card -->
    <section v-if="featuredQuote" class="card-glow featured-card">
      <span class="featured-label">Today's quote</span>
      <p class="featured-text">“{{ featuredQuote.text }}”</p>

      <div class="featured-book-row">
        <div class="quote-cover-sm">
          <BookCover :src="featuredQuote.bookCoverUrl" :title="featuredQuote.bookTitle" radius="4px" />
        </div>
        <div class="quote-book-info">
          <strong>{{ featuredQuote.bookTitle }}</strong>
          <span class="muted">
            {{ featuredQuote.bookAuthor }}<template v-if="featuredQuote.page"> · p. {{ featuredQuote.page }}</template>
          </span>
        </div>
      </div>

      <div class="featured-actions">
        <button type="button" class="btn btn-cream feat-btn" @click="surpriseMe()">
          Surprise me
        </button>
        <button type="button" class="btn btn-bronze feat-btn" @click="shareQuote(featuredQuote)">
          <Share2 :size="14" /> Share
        </button>
      </div>
    </section>

    <!-- Search -->
    <div class="search-wrap">
      <Search :size="16" class="search-ico" />
      <input v-model="searchQuery" type="search" class="input search-inp" placeholder="Search your quotes" />
    </div>

    <!-- Filter Pills -->
    <div class="filter-row">
      <button
        type="button"
        class="chip"
        :class="{ 'chip-active': filterMode === 'all' }"
        @click="filterMode = 'all'"
      >
        All
      </button>
      <button
        type="button"
        class="chip"
        :class="{ 'chip-active': filterMode === 'favorites' }"
        @click="filterMode = 'favorites'"
      >
        Favorites
      </button>
      <button
        type="button"
        class="chip"
        :class="{ 'chip-active': filterMode === 'by-book' }"
        @click="filterMode = 'by-book'"
      >
        By book
      </button>
    </div>

    <!-- Empty -->
    <div v-if="!filteredQuotes.length" class="card empty-quotes">
      No quotes yet. Tap + to capture your favorite book passages.
    </div>

    <!-- Grouped By Book -->
    <div v-else-if="filterMode === 'by-book'" class="group-list">
      <section v-for="grp in groupedByBook" :key="grp.title" class="book-group">
        <h3 class="group-heading">{{ grp.title }} <span class="subtle">· {{ grp.author }}</span></h3>
        <article v-for="q in grp.quotes" :key="q.id" class="card quote-card">
          <p class="q-text">“{{ q.text }}”</p>
          <div class="q-footer">
            <span class="subtle">{{ q.page ? `p. ${q.page}` : 'Saved passage' }}</span>
            <div class="q-actions">
              <button type="button" class="heart-btn" :class="{ fav: q.isFavorite }" @click="toggleFav(q)">
                <Heart :size="17" :fill="q.isFavorite ? 'currentColor' : 'none'" />
              </button>
              <button type="button" class="more-btn" @click.stop="shareQuote(q)">
                <Copy :size="15" />
              </button>
              <button type="button" class="more-btn" @click.stop="removeQuote(q.id)">
                <Trash2 :size="15" />
              </button>
            </div>
          </div>
        </article>
      </section>
    </div>

    <!-- Flat List -->
    <div v-else class="quote-list">
      <article v-for="q in filteredQuotes" :key="q.id" class="card quote-card">
        <p class="q-text">“{{ q.text }}”</p>
        <div class="q-footer">
          <div class="q-book-mini">
            <div class="quote-cover-xs">
              <BookCover :src="q.bookCoverUrl" :title="q.bookTitle" radius="4px" />
            </div>
            <div class="quote-book-info">
              <strong>{{ q.bookTitle }}</strong>
              <span class="muted">
                {{ q.bookAuthor }}<template v-if="q.page"> · p. {{ q.page }}</template>
              </span>
            </div>
          </div>

          <div class="q-actions">
            <button
              type="button"
              class="heart-btn"
              :class="{ fav: q.isFavorite }"
              aria-label="Favorite quote"
              @click="toggleFav(q)"
            >
              <Heart :size="17" :fill="q.isFavorite ? 'currentColor' : 'none'" />
            </button>

            <div class="menu-anchor" @click.stop>
              <button
                type="button"
                class="more-btn"
                aria-label="Quote options"
                @click="activeMenuId = activeMenuId === q.id ? null : q.id"
              >
                <MoreHorizontal :size="17" />
              </button>
              <div v-if="activeMenuId === q.id" class="popover">
                <button type="button" @click="shareQuote(q); activeMenuId = null">
                  <Share2 :size="13" /> Share / Copy
                </button>
                <button type="button" class="danger" @click="removeQuote(q.id)">
                  <Trash2 :size="13" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.quotes-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.quotes-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-titles {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.header-sub {
  font-size: 12.5px;
}

.featured-card {
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.featured-label {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--accent);
}

.featured-text {
  margin: 0;
  font-size: 15.5px;
  line-height: 1.48;
  color: var(--text-primary);
}

.featured-book-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.quote-cover-sm {
  width: 28px;
}

.quote-cover-xs {
  width: 26px;
  flex-shrink: 0;
}

.quote-book-info {
  display: flex;
  flex-direction: column;
  font-size: 12px;
  line-height: 1.3;
  min-width: 0;
}

.quote-book-info strong {
  color: var(--text-primary);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.featured-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 2px;
}

.feat-btn {
  height: 38px;
  border-radius: 10px;
  font-size: 13.5px;
}

.search-wrap {
  position: relative;
}

.search-ico {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-inp {
  padding-left: 40px;
}

.filter-row {
  display: flex;
  gap: 8px;
}

.empty-quotes {
  text-align: center;
  padding: 28px 16px;
  color: var(--text-secondary);
}

.quote-list,
.group-list,
.book-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-heading {
  margin: 6px 2px 0;
  font-size: 14px;
  font-weight: 700;
}

.quote-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.q-text {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.5;
}

.q-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.q-book-mini {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}

.q-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.heart-btn {
  color: var(--text-secondary);
  display: inline-flex;
  padding: 4px;
}

.heart-btn.fav {
  color: var(--accent);
}

.more-btn {
  color: var(--text-secondary);
  display: inline-flex;
  padding: 4px;
}

.menu-anchor {
  position: relative;
}

.popover {
  position: absolute;
  right: 0;
  bottom: 30px;
  min-width: 144px;
  background: #171414;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  padding: 5px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6);
  z-index: 20;
}

.popover button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12.5px;
  text-align: left;
}

.popover button:hover {
  background: rgba(255, 255, 255, 0.06);
}

.popover button.danger {
  color: #f08a7e;
}
</style>
