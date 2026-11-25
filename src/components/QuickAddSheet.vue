<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Loader2, Plus, Quote, Search, X } from 'lucide-vue-next'
import { useUiStore } from '@/stores/ui'
import { useLibraryStore } from '@/stores/library'
import { searchBooksOnline } from '@/services/bookSearch'
import BookCover from './BookCover.vue'
import type { BookFormat, BookOwnership, BookSearchResult, BookStatus } from '@/types/models'

const router = useRouter()
const ui = useUiStore()
const library = useLibraryStore()

const searchQuery = ref('')
const searching = ref(false)
const results = ref<BookSearchResult[]>([])
const searchError = ref('')
let debounceTimer: number | null = null

const manualForm = reactive({
  title: '',
  author: '',
  coverUrl: '',
  isbn: '',
  totalPages: 320,
  format: 'Paperback' as BookFormat,
  status: 'tbr' as BookStatus,
  ownership: 'owned' as BookOwnership,
  blurb: '',
  genresText: '',
  releaseDate: '',
  seriesId: '' as string,
  seriesOrder: '' as string,
})

const quoteForm = reactive({
  bookId: '',
  bookTitle: '',
  bookAuthor: '',
  text: '',
  page: '',
})

watch(
  () => ui.quickAddOpen,
  (open) => {
    if (open) {
      manualForm.seriesId = ui.quickAddPresetSeriesId || ''
      if (ui.quickAddPresetSeriesId) {
        const count = library.books.filter((b) => b.seriesId === ui.quickAddPresetSeriesId).length
        manualForm.seriesOrder = String(count + 1)
      }
      if (ui.quickAddPresetBookId) {
        quoteForm.bookId = ui.quickAddPresetBookId
      } else if (!quoteForm.bookId && library.books.length) {
        quoteForm.bookId = library.primaryReadingBook?.id || library.books[0].id
      }
    }
  },
)

watch(searchQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (val.trim().length < 2) {
    results.value = []
    searching.value = false
    return
  }
  searching.value = true
  debounceTimer = window.setTimeout(async () => {
    try {
      results.value = await searchBooksOnline(val)
      searchError.value = ''
    } catch {
      searchError.value = 'Could not reach book search right now.'
    } finally {
      searching.value = false
    }
  }, 420)
})

const selectedQuoteBook = computed(() =>
  quoteForm.bookId ? library.getBookById(quoteForm.bookId) : null,
)

function pickSearchResult(item: BookSearchResult) {
  manualForm.title = item.title
  manualForm.author = item.author
  manualForm.coverUrl = item.coverUrl
  manualForm.isbn = item.isbn
  manualForm.totalPages = item.totalPages || 320
  manualForm.blurb = item.blurb
  manualForm.genresText = item.genres.join(', ')
  if (item.releaseDate && item.releaseDate > new Date().toISOString().slice(0, 10)) {
    manualForm.releaseDate = item.releaseDate
    manualForm.status = 'wishlist'
    manualForm.ownership = 'wishlist'
  }
  ui.quickAddTab = 'manual'
}

async function quickSaveResult(item: BookSearchResult, status: BookStatus) {
  const isFuture = Boolean(item.releaseDate && item.releaseDate > new Date().toISOString().slice(0, 10))
  const finalStatus = isFuture ? 'wishlist' : status
  const seriesId = ui.quickAddPresetSeriesId || null
  const seriesOrder = seriesId
    ? library.books.filter((b) => b.seriesId === seriesId).length + 1
    : null

  const created = await library.addBook({
    title: item.title,
    author: item.author,
    coverUrl: item.coverUrl,
    isbn: item.isbn,
    format: 'Paperback',
    totalPages: item.totalPages || 320,
    currentPage: 0,
    status: finalStatus,
    ownership: finalStatus === 'wishlist' ? 'wishlist' : 'owned',
    rating: 0,
    spice: 0,
    isFavorite: false,
    blurb: item.blurb,
    genres: item.genres,
    moods: [],
    tropes: [],
    review: '',
    seriesId,
    seriesOrder,
    releaseDate: isFuture ? item.releaseDate : null,
    startedAt: finalStatus === 'reading' ? new Date().toISOString().slice(0, 10) : null,
    finishedAt: null,
  })
  ui.closeQuickAdd()
  ui.showToast(`Added "${created.title}"`)
  router.push(`/book/${created.id}`)
}

async function submitManualBook() {
  if (!manualForm.title.trim()) return
  const genres = manualForm.genresText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const created = await library.addBook({
    title: manualForm.title.trim(),
    author: manualForm.author.trim() || 'Unknown Author',
    coverUrl: manualForm.coverUrl.trim(),
    isbn: manualForm.isbn.trim(),
    format: manualForm.format,
    totalPages: Math.max(1, Number(manualForm.totalPages) || 300),
    currentPage: manualForm.status === 'finished' ? Math.max(1, Number(manualForm.totalPages) || 300) : 0,
    status: manualForm.status,
    ownership: manualForm.ownership,
    rating: 0,
    spice: 0,
    isFavorite: false,
    blurb: manualForm.blurb.trim(),
    genres,
    moods: [],
    tropes: [],
    review: '',
    seriesId: manualForm.seriesId || null,
    seriesOrder: manualForm.seriesOrder ? Number(manualForm.seriesOrder) : null,
    releaseDate: manualForm.releaseDate || null,
    startedAt: manualForm.status === 'reading' ? new Date().toISOString().slice(0, 10) : null,
    finishedAt: manualForm.status === 'finished' ? new Date().toISOString().slice(0, 10) : null,
  })

  manualForm.title = ''
  manualForm.author = ''
  manualForm.coverUrl = ''
  manualForm.isbn = ''
  manualForm.blurb = ''
  manualForm.genresText = ''
  manualForm.releaseDate = ''
  manualForm.seriesOrder = ''

  ui.closeQuickAdd()
  ui.showToast(`Added "${created.title}" to library`)
  router.push(`/book/${created.id}`)
}

async function submitQuote() {
  if (!quoteForm.text.trim()) return
  const book = selectedQuoteBook.value
  await library.addQuote({
    bookId: book?.id || null,
    bookTitle: book?.title || quoteForm.bookTitle.trim() || 'Untitled Book',
    bookAuthor: book?.author || quoteForm.bookAuthor.trim() || 'Unknown Author',
    bookCoverUrl: book?.coverUrl || '',
    text: quoteForm.text.trim(),
    page: quoteForm.page ? Number(quoteForm.page) : null,
    isFavorite: false,
  })
  quoteForm.text = ''
  quoteForm.page = ''
  ui.closeQuickAdd()
  ui.showToast('Quote saved')
}
</script>

<template>
  <Transition name="fade">
    <div v-if="ui.quickAddOpen" class="sheet-backdrop" @click.self="ui.closeQuickAdd()">
      <div class="sheet-panel">
        <div class="sheet-handle" />

        <div class="sheet-header">
          <h3>Add to Folio</h3>
          <button type="button" class="icon-btn" @click="ui.closeQuickAdd()">
            <X :size="18" />
          </button>
        </div>

        <div class="tab-bar">
          <button
            type="button"
            class="tab-pill"
            :class="{ active: ui.quickAddTab === 'search' }"
            @click="ui.quickAddTab = 'search'"
          >
            <Search :size="14" />
            Search Book
          </button>
          <button
            type="button"
            class="tab-pill"
            :class="{ active: ui.quickAddTab === 'manual' }"
            @click="ui.quickAddTab = 'manual'"
          >
            <Plus :size="14" />
            Manual
          </button>
          <button
            type="button"
            class="tab-pill"
            :class="{ active: ui.quickAddTab === 'quote' }"
            @click="ui.quickAddTab = 'quote'"
          >
            <Quote :size="14" />
            Quote
          </button>
        </div>

        <!-- TAB 1: SEARCH -->
        <div v-if="ui.quickAddTab === 'search'" class="tab-body">
          <div class="search-box">
            <Search :size="16" class="search-ico" />
            <input
              v-model="searchQuery"
              type="search"
              class="input search-input"
              placeholder="Search title, author, or ISBN..."
              autofocus
            />
          </div>

          <div v-if="searching" class="search-status">
            <Loader2 :size="18" class="spin" />
            <span>Searching Google Books & Open Library...</span>
          </div>

          <p v-else-if="searchError" class="search-status muted">{{ searchError }}</p>

          <div v-else-if="results.length" class="results-list">
            <div v-for="item in results" :key="item.key" class="result-row">
              <div class="result-cover">
                <BookCover :src="item.coverUrl" :title="item.title" :author="item.author" radius="7px" />
              </div>
              <div class="result-meta" @click="pickSearchResult(item)">
                <div class="result-title">{{ item.title }}</div>
                <div class="result-author">{{ item.author }}</div>
                <div class="result-sub">
                  {{ item.totalPages }} pages
                  <span v-if="item.genres[0]"> · {{ item.genres[0] }}</span>
                </div>
              </div>
              <div class="result-actions">
                <button
                  type="button"
                  class="mini-btn accent"
                  @click="quickSaveResult(item, 'tbr')"
                >
                  + TBR
                </button>
                <button
                  type="button"
                  class="mini-btn"
                  @click="pickSearchResult(item)"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>

          <div v-else class="empty-hint">
            Type any book title, author, or ISBN to auto-fill covers, page count, blurb, and genres.
          </div>
        </div>

        <!-- TAB 2: MANUAL -->
        <form v-else-if="ui.quickAddTab === 'manual'" class="tab-body form-grid" @submit.prevent="submitManualBook">
          <label class="field">
            <span>Title *</span>
            <input v-model="manualForm.title" class="input" required placeholder="Book title" />
          </label>

          <label class="field">
            <span>Author</span>
            <input v-model="manualForm.author" class="input" placeholder="Author name" />
          </label>

          <div class="two-col">
            <label class="field">
              <span>Status</span>
              <select v-model="manualForm.status" class="select">
                <option value="reading">Reading</option>
                <option value="tbr">To Be Read</option>
                <option value="finished">Finished</option>
                <option value="wishlist">Wishlist</option>
                <option value="dnf">DNF</option>
              </select>
            </label>
            <label class="field">
              <span>Ownership</span>
              <select v-model="manualForm.ownership" class="select">
                <option value="owned">Owned</option>
                <option value="wishlist">Wishlist</option>
                <option value="library">Library</option>
                <option value="borrowed">Borrowed</option>
                <option value="kindle-unlimited">Kindle Unlimited</option>
              </select>
            </label>
          </div>

          <div class="two-col">
            <label class="field">
              <span>Format</span>
              <select v-model="manualForm.format" class="select">
                <option value="Paperback">Paperback</option>
                <option value="Hardcover">Hardcover</option>
                <option value="eBook">eBook</option>
                <option value="Audiobook">Audiobook</option>
              </select>
            </label>
            <label class="field">
              <span>Total Pages</span>
              <input v-model.number="manualForm.totalPages" type="number" min="1" class="input" />
            </label>
          </div>

          <div class="two-col">
            <label class="field">
              <span>Series (optional)</span>
              <select v-model="manualForm.seriesId" class="select">
                <option value="">None</option>
                <option v-for="s in library.series" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </label>
            <label class="field">
              <span>Book # in Series</span>
              <input v-model="manualForm.seriesOrder" type="number" step="0.5" min="0" class="input" placeholder="e.g. 1" />
            </label>
          </div>

          <div class="two-col">
            <label class="field">
              <span>Release Date (Upcoming)</span>
              <input v-model="manualForm.releaseDate" type="date" class="input" />
            </label>
            <label class="field">
              <span>Genres (comma separated)</span>
              <input v-model="manualForm.genresText" class="input" placeholder="Fantasy, Romance" />
            </label>
          </div>

          <label class="field">
            <span>Cover Image URL</span>
            <input v-model="manualForm.coverUrl" class="input" placeholder="https://..." />
          </label>

          <label class="field">
            <span>Blurb</span>
            <textarea v-model="manualForm.blurb" class="textarea" placeholder="Short description..." />
          </label>

          <button type="submit" class="btn btn-accent full-width">Save Book to Library</button>
        </form>

        <!-- TAB 3: QUOTE -->
        <form v-else class="tab-body form-grid" @submit.prevent="submitQuote">
          <label class="field">
            <span>Book</span>
            <select v-model="quoteForm.bookId" class="select">
              <option value="">Other / Manual</option>
              <option v-for="b in library.books" :key="b.id" :value="b.id">
                {{ b.title }} — {{ b.author }}
              </option>
            </select>
          </label>

          <div v-if="!quoteForm.bookId" class="two-col">
            <label class="field">
              <span>Book Title</span>
              <input v-model="quoteForm.bookTitle" class="input" placeholder="Title" />
            </label>
            <label class="field">
              <span>Author</span>
              <input v-model="quoteForm.bookAuthor" class="input" placeholder="Author" />
            </label>
          </div>

          <label class="field">
            <span>Quote *</span>
            <textarea
              v-model="quoteForm.text"
              class="textarea"
              required
              placeholder="Write or paste a favorite line..."
            />
          </label>

          <label class="field">
            <span>Page number (optional)</span>
            <input v-model="quoteForm.page" type="number" min="1" class="input" placeholder="e.g. 203" />
          </label>

          <button type="submit" class="btn btn-accent full-width">Save Quote</button>
        </form>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.sheet-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
}

.tab-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 4px;
  border-radius: 14px;
  background: #121010;
  margin-bottom: 16px;
}

.tab-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  border-radius: 10px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.tab-pill.active {
  background: var(--accent);
  color: var(--accent-on);
}

.search-box {
  position: relative;
  margin-bottom: 12px;
}

.search-ico {
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-input {
  padding-left: 38px;
}

.search-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 52dvh;
  overflow-y: auto;
}

.result-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: var(--bg-surface);
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
}

.result-cover {
  width: 44px;
  flex-shrink: 0;
}

.result-meta {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.result-title {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-author {
  font-size: 12.5px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-sub {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.result-actions {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.mini-btn {
  padding: 5px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  background: var(--bg-surface-elevated);
  color: var(--text-primary);
}

.mini-btn.accent {
  background: var(--accent);
  color: var(--accent-on);
}

.empty-hint {
  text-align: center;
  padding: 26px 12px;
  font-size: 13px;
  color: var(--text-muted);
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field span {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.full-width {
  width: 100%;
  margin-top: 4px;
}
</style>
