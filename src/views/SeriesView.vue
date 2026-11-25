<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Check, Layers, LibraryBig, Pencil, Plus, Search, Trash2, X } from 'lucide-vue-next'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'
import BookCover from '@/components/BookCover.vue'
import StarSpiceRating from '@/components/StarSpiceRating.vue'
import type { Book, BookSeries } from '@/types/models'

const router = useRouter()
const library = useLibraryStore()
const ui = useUiStore()

const modalOpen = ref(false)
const showSearch = ref(false)
const searchText = ref('')
const editingId = ref<string | null>(null)
const form = reactive({
  name: '',
  author: '',
  totalBooks: '' as string,
})

interface SeriesViewModel {
  series: BookSeries
  books: Book[]
  readCount: number
  displayTotal: number
  averageRating: number
}

const seriesList = computed<SeriesViewModel[]>(() =>
  library.series.map((s) => {
    const books = library.books
      .filter((b) => b.seriesId === s.id)
      .sort((a, b) => (a.seriesOrder ?? 999) - (b.seriesOrder ?? 999))
    const readCount = books.filter((b) => b.status === 'finished').length
    const rated = books.filter((b) => b.rating > 0)
    const averageRating = rated.length
      ? Number((rated.reduce((sum, b) => sum + b.rating, 0) / rated.length).toFixed(1))
      : 0
    return {
      series: s,
      books,
      readCount,
      displayTotal: s.totalBooks || books.length,
      averageRating,
    }
  }),
)

const filteredSeries = computed(() => {
  const q = searchText.value.trim().toLowerCase()
  if (!q) return seriesList.value
  return seriesList.value.filter(
    (item) =>
      item.series.name.toLowerCase().includes(q) ||
      item.series.author.toLowerCase().includes(q) ||
      item.books.some((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)),
  )
})

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (!showSearch.value) searchText.value = ''
}

function openCreateModal() {
  editingId.value = null
  form.name = ''
  form.author = ''
  form.totalBooks = ''
  modalOpen.value = true
}

function openEditModal(s: BookSeries) {
  editingId.value = s.id
  form.name = s.name
  form.author = s.author
  form.totalBooks = s.totalBooks ? String(s.totalBooks) : ''
  modalOpen.value = true
}

async function saveSeries() {
  if (!form.name.trim()) return
  const total = form.totalBooks ? Math.max(1, parseInt(form.totalBooks, 10)) : null
  if (editingId.value) {
    await library.updateSeries(editingId.value, {
      name: form.name.trim(),
      author: form.author.trim(),
      totalBooks: total,
    })
    ui.showToast('Series updated')
  } else {
    await library.addSeries(form.name, form.author, total)
    ui.showToast('Series created')
  }
  modalOpen.value = false
}

async function removeSeries() {
  if (!editingId.value) return
  await library.deleteSeries(editingId.value)
  modalOpen.value = false
  ui.showToast('Series deleted')
}
</script>

<template>
  <div class="page-scroll series-page">
    <header class="top-bar">
      <h1 class="page-title">SERIES</h1>

      <div class="header-actions">
        <button type="button" class="btn btn-surface btn-pill new-btn" @click="openCreateModal()">
          <Plus :size="15" /> New
        </button>

        <button type="button" class="icon-btn" aria-label="Library" @click="router.push('/library')">
          <LibraryBig :size="17" />
        </button>

        <button type="button" class="icon-btn icon-btn-accent" aria-label="Series tracker" aria-current="page">
          <Layers :size="17" />
        </button>

        <button
          type="button"
          class="icon-btn"
          :aria-label="showSearch ? 'Close search' : 'Search series'"
          @click="toggleSearch()"
        >
          <X v-if="showSearch" :size="17" />
          <Search v-else :size="17" />
        </button>
      </div>
    </header>

    <div v-if="showSearch" class="search-wrap">
      <input
        v-model="searchText"
        type="search"
        class="input"
        placeholder="Filter by series, author, or book title..."
        autofocus
      />
    </div>

    <p v-if="showSearch && searchText.trim() && seriesList.length && !filteredSeries.length" class="subtle">
      No series match "{{ searchText.trim() }}".
    </p>

    <div v-if="!seriesList.length" class="card empty-series">
      <p>Track multi-book sagas, trilogies, and companion sets all in one place.</p>
      <button type="button" class="btn btn-accent btn-pill" @click="openCreateModal()">
        <Plus :size="15" /> Create your first series
      </button>
    </div>

    <article v-for="item in filteredSeries" :key="item.series.id" class="card series-card">
      <div class="series-head">
        <div class="series-title-col">
          <div class="series-title-row">
            <h2>{{ item.series.name }}</h2>
            <button
              type="button"
              class="edit-ico"
              aria-label="Edit series"
              @click="openEditModal(item.series)"
            >
              <Pencil :size="13" />
            </button>
          </div>
          <div class="series-sub-row">
            <span class="read-count tabular">
              {{ item.readCount }} of {{ item.displayTotal || 0 }} read
            </span>
            <button type="button" class="total-pill" @click="openEditModal(item.series)">
              {{ item.series.totalBooks ? `Total of ${item.series.totalBooks}` : 'Total in series?' }}
            </button>
          </div>
        </div>

        <div class="series-rating-col">
          <StarSpiceRating :rating="item.averageRating" :size="13" />
          <span class="avg-label tabular">
            {{ item.averageRating ? `${item.averageRating.toFixed(1)} average` : 'Unrated' }}
          </span>
        </div>
      </div>

      <div class="h-scroll series-strip">
        <button
          v-for="(book, idx) in item.books"
          :key="book.id"
          type="button"
          class="series-book-tile"
          @click="router.push(`/book/${book.id}`)"
        >
          <div class="tile-cover-wrap">
            <BookCover
              :src="book.coverUrl"
              :title="book.title"
              :author="book.author"
              radius="7px"
              :dimmed="book.status === 'wishlist'"
            />
            <span v-if="book.status === 'finished'" class="tile-check">
              <Check :size="11" :stroke-width="3" />
            </span>
          </div>
          <span class="book-num">Book {{ book.seriesOrder ?? idx + 1 }}</span>
          <span v-if="book.status === 'wishlist'" class="book-wish">Wishlist</span>
        </button>

        <button
          type="button"
          class="add-book-slot"
          @click="ui.openQuickAdd('search', { seriesId: item.series.id })"
        >
          <Plus :size="20" />
        </button>
      </div>
    </article>

    <!-- Create / Edit Series Sheet -->
    <Transition name="fade">
      <div v-if="modalOpen" class="sheet-backdrop" @click.self="modalOpen = false">
        <div class="sheet-panel">
          <div class="sheet-handle" />
          <div class="modal-head">
            <h3>{{ editingId ? 'Edit Series' : 'New Series' }}</h3>
            <button type="button" class="icon-btn" @click="modalOpen = false">
              <X :size="18" />
            </button>
          </div>

          <form class="series-form" @submit.prevent="saveSeries">
            <label class="field">
              <span>Series Name *</span>
              <input v-model="form.name" class="input" required placeholder="e.g. The Starlight Archive" />
            </label>
            <label class="field">
              <span>Author</span>
              <input v-model="form.author" class="input" placeholder="Author name" />
            </label>
            <label class="field">
              <span>Total books in series (optional)</span>
              <input
                v-model="form.totalBooks"
                type="number"
                min="1"
                class="input"
                placeholder="Leave blank if ongoing"
              />
            </label>

            <div class="modal-actions">
              <button v-if="editingId" type="button" class="btn btn-dark delete-btn" @click="removeSeries()">
                <Trash2 :size="16" /> Delete
              </button>
              <button type="submit" class="btn btn-accent save-btn">Save Series</button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.series-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.top-bar {
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

.new-btn {
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.empty-series {
  padding: 30px 18px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--text-secondary);
}

.series-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.series-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.series-title-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.series-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.series-title-row h2 {
  margin: 0;
  font-size: 16.5px;
  font-weight: 700;
}

.edit-ico {
  color: var(--text-muted);
  display: inline-flex;
  padding: 3px;
}

.series-sub-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.read-count {
  font-size: 12.5px;
  color: var(--text-secondary);
}

.total-pill {
  padding: 3px 10px;
  border-radius: 999px;
  background: #141212;
  border: 1px solid var(--border-subtle);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.series-rating-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  flex-shrink: 0;
}

.avg-label {
  font-size: 11.5px;
  color: var(--text-secondary);
}

.series-strip {
  gap: 10px;
  padding-top: 4px;
}

.series-book-tile {
  width: 78px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: left;
}

.tile-cover-wrap {
  position: relative;
}

.tile-check {
  position: absolute;
  top: -5px;
  right: -5px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-on);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.book-num {
  font-size: 11.5px;
  color: var(--text-primary);
  font-weight: 500;
}

.book-wish {
  font-size: 10.5px;
  color: var(--text-secondary);
  margin-top: -3px;
}

.add-book-slot {
  width: 78px;
  aspect-ratio: 2 / 3;
  flex-shrink: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1.5px dashed var(--border-strong);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.modal-head h3 {
  margin: 0;
}

.series-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
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

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.delete-btn {
  color: #f08a7e;
}

.save-btn {
  flex: 1;
}
</style>
