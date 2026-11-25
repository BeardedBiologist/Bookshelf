<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronDown,
  ChevronLeft,
  Heart,
  Layers,
  Pencil,
  Play,
  Plus,
  Quote,
  Trash2,
  X,
} from 'lucide-vue-next'
import { useLibraryStore } from '@/stores/library'
import { useTimerStore } from '@/stores/timer'
import { useUiStore } from '@/stores/ui'
import BookCover from '@/components/BookCover.vue'
import ProgressRing from '@/components/ProgressRing.vue'
import StarSpiceRating from '@/components/StarSpiceRating.vue'
import type { BookFormat, BookOwnership, BookStatus } from '@/types/models'

const route = useRoute()
const router = useRouter()
const library = useLibraryStore()
const timer = useTimerStore()
const ui = useUiStore()

const book = computed(() => library.getBookById(String(route.params.id)))

const percent = computed(() => {
  if (!book.value || !book.value.totalPages) return 0
  return Math.min(100, Math.round((book.value.currentPage / book.value.totalPages) * 100))
})

const linkedSeries = computed(() =>
  book.value?.seriesId ? library.series.find((s) => s.id === book.value!.seriesId) || null : null,
)

const bookQuotes = computed(() =>
  book.value ? library.quotes.filter((q) => q.bookId === book.value!.id) : [],
)

// Expand blurb
const blurbExpanded = ref(false)

// Inline sheets / modals
const progressModalOpen = ref(false)
const progressPage = ref(0)

const blurbModalOpen = ref(false)
const blurbDraft = ref('')

const reviewModalOpen = ref(false)
const reviewDraft = ref('')

const tagModalType = ref<'moods' | 'tropes' | 'genres' | null>(null)
const customTagInput = ref('')

const editMetaOpen = ref(false)
const metaForm = reactive({
  title: '',
  author: '',
  coverUrl: '',
  format: 'Paperback' as BookFormat,
  totalPages: 300,
  isbn: '',
  releaseDate: '',
  startedAt: '',
  finishedAt: '',
  seriesId: '',
  seriesOrder: '',
})

const confirmDeleteOpen = ref(false)

const MOOD_PRESETS = [
  'heartbreaking',
  'tense',
  'dark',
  'cozy',
  'romantic',
  'atmospheric',
  'hopeful',
  'witty',
  'emotional',
  'mysterious',
  'adventurous',
  'warm',
]

const TROPE_PRESETS = [
  'Found family',
  'Enemies to lovers',
  'Slow burn',
  'Morally grey',
  'Rivals to lovers',
  'Small town',
  'Secret library',
  'Grumpy x sunshine',
  'Second chance',
  'Heist',
  'Political intrigue',
  'Locked room',
  'Sci-Fi',
  'Gothic',
]

const GENRE_PRESETS = [
  'Fantasy',
  'Romance',
  'Sci-Fi',
  'Mystery',
  'Thriller',
  'Classic',
  'Historical',
  'Non-Fiction',
  'Cozy',
  'Literary',
  'Horror',
  'Young Adult',
]

const statusOptions: Array<{ value: BookStatus; label: string }> = [
  { value: 'reading', label: 'Reading' },
  { value: 'tbr', label: 'To Be Read' },
  { value: 'finished', label: 'Finished' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'dnf', label: 'DNF' },
]

const ownershipOptions: Array<{ value: BookOwnership; label: string }> = [
  { value: 'owned', label: 'Owned' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'library', label: 'Library' },
  { value: 'borrowed', label: 'Borrowed' },
  { value: 'kindle-unlimited', label: 'Kindle Unl.' },
]

async function onStatusChange(event: Event) {
  if (!book.value) return
  const status = (event.target as HTMLSelectElement).value as BookStatus
  if (status === 'finished') {
    await library.markBookFinished(book.value.id)
    ui.showToast('Marked as finished!')
  } else {
    await library.updateBook(book.value.id, { status })
  }
}

async function onOwnershipChange(event: Event) {
  if (!book.value) return
  const ownership = (event.target as HTMLSelectElement).value as BookOwnership
  await library.updateBook(book.value.id, { ownership })
}

async function toggleFavorite() {
  if (!book.value) return
  await library.updateBook(book.value.id, { isFavorite: !book.value.isFavorite })
}

function openProgressSheet() {
  if (!book.value) return
  progressPage.value = book.value.currentPage
  progressModalOpen.value = true
}

async function saveProgress() {
  if (!book.value) return
  await library.logReadingProgress(book.value.id, progressPage.value, 0)
  progressModalOpen.value = false
  ui.showToast('Progress updated')
}

async function markFinished() {
  if (!book.value) return
  await library.markBookFinished(book.value.id)
  ui.showToast('Congrats on finishing!')
}

async function markDnf() {
  if (!book.value) return
  await library.updateBook(book.value.id, { status: 'dnf' })
  ui.showToast('Moved to DNF')
}

function openBlurbEditor() {
  if (!book.value) return
  blurbDraft.value = book.value.blurb
  blurbModalOpen.value = true
}

async function saveBlurb() {
  if (!book.value) return
  await library.updateBook(book.value.id, { blurb: blurbDraft.value.trim() })
  blurbModalOpen.value = false
  ui.showToast('Blurb updated')
}

function openReviewEditor() {
  if (!book.value) return
  reviewDraft.value = book.value.review
  reviewModalOpen.value = true
}

async function saveReview() {
  if (!book.value) return
  await library.updateBook(book.value.id, { review: reviewDraft.value.trim() })
  reviewModalOpen.value = false
  ui.showToast('Review saved')
}

function openTagModal(type: 'moods' | 'tropes' | 'genres') {
  tagModalType.value = type
  customTagInput.value = ''
}

const currentTagList = computed(() => {
  if (!book.value || !tagModalType.value) return []
  return book.value[tagModalType.value]
})

const currentPresets = computed(() => {
  if (tagModalType.value === 'moods') return MOOD_PRESETS
  if (tagModalType.value === 'tropes') return TROPE_PRESETS
  return GENRE_PRESETS
})

async function toggleTag(tag: string) {
  if (!book.value || !tagModalType.value) return
  const field = tagModalType.value
  const list = [...book.value[field]]
  const idx = list.findIndex((t) => t.toLowerCase() === tag.toLowerCase())
  if (idx >= 0) list.splice(idx, 1)
  else list.push(tag)
  await library.updateBook(book.value.id, { [field]: list })
}

async function addCustomTag() {
  const val = customTagInput.value.trim()
  if (!val || !book.value || !tagModalType.value) return
  const field = tagModalType.value
  const list = [...book.value[field]]
  if (!list.some((t) => t.toLowerCase() === val.toLowerCase())) {
    list.push(val)
    await library.updateBook(book.value.id, { [field]: list })
  }
  customTagInput.value = ''
}

function openMetaEditor() {
  if (!book.value) return
  metaForm.title = book.value.title
  metaForm.author = book.value.author
  metaForm.coverUrl = book.value.coverUrl
  metaForm.format = book.value.format
  metaForm.totalPages = book.value.totalPages
  metaForm.isbn = book.value.isbn
  metaForm.releaseDate = book.value.releaseDate || ''
  metaForm.startedAt = book.value.startedAt || ''
  metaForm.finishedAt = book.value.finishedAt || ''
  metaForm.seriesId = book.value.seriesId || ''
  metaForm.seriesOrder = book.value.seriesOrder != null ? String(book.value.seriesOrder) : ''
  editMetaOpen.value = true
}

async function saveMeta() {
  if (!book.value || !metaForm.title.trim()) return
  await library.updateBook(book.value.id, {
    title: metaForm.title.trim(),
    author: metaForm.author.trim() || 'Unknown Author',
    coverUrl: metaForm.coverUrl.trim(),
    format: metaForm.format,
    totalPages: Math.max(1, Number(metaForm.totalPages) || 300),
    isbn: metaForm.isbn.trim(),
    releaseDate: metaForm.releaseDate || null,
    startedAt: metaForm.startedAt || null,
    finishedAt: metaForm.finishedAt || null,
    seriesId: metaForm.seriesId || null,
    seriesOrder: metaForm.seriesOrder ? Number(metaForm.seriesOrder) : null,
  })
  editMetaOpen.value = false
  ui.showToast('Book details saved')
}

async function confirmDeleteBook() {
  if (!book.value) return
  await library.deleteBook(book.value.id)
  confirmDeleteOpen.value = false
  ui.showToast('Book removed from library')
  router.replace('/library')
}
</script>

<template>
  <div v-if="book" class="page-scroll detail-page">
    <!-- Top Pill Header -->
    <header class="detail-top">
      <button type="button" class="icon-btn" @click="router.back()">
        <ChevronLeft :size="20" />
      </button>

      <div class="pill-selects">
        <label class="pill-select accent">
          <select :value="book.status" @change="onStatusChange">
            <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <ChevronDown :size="14" class="chev" />
        </label>

        <label class="pill-select dark">
          <select :value="book.ownership" @change="onOwnershipChange">
            <option v-for="opt in ownershipOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
          <ChevronDown :size="14" class="chev" />
        </label>
      </div>

      <button
        type="button"
        class="icon-btn icon-btn-accent"
        aria-label="Delete book"
        @click="confirmDeleteOpen = true"
      >
        <Trash2 :size="17" />
      </button>
    </header>

    <!-- Dotted Hero Section -->
    <section class="hero-card dotted-dark">
      <div class="cover-stage">
        <div class="hero-cover-wrap">
          <BookCover :src="book.coverUrl" :title="book.title" :author="book.author" radius="10px" />
          <button
            type="button"
            class="cover-badge-top"
            :class="{ active: book.isFavorite }"
            aria-label="Toggle favorite"
            @click="toggleFavorite()"
          >
            <Heart :size="16" :fill="book.isFavorite ? 'currentColor' : 'none'" />
          </button>
          <button
            type="button"
            class="cover-badge-bottom"
            aria-label="Edit book details"
            @click="openMetaEditor()"
          >
            <Pencil :size="14" />
          </button>
        </div>
      </div>

      <h1 class="book-title">{{ book.title }}</h1>
      <p class="book-subtitle">
        {{ book.author }} <span class="sep">|</span> {{ book.format }} · {{ book.totalPages }} pages
      </p>

      <div class="rating-center">
        <StarSpiceRating
          :rating="book.rating"
          :spice="book.spice"
          :show-spice="library.profile.showSpiceRating"
          interactive
          :size="19"
          @update:rating="(val) => library.updateBook(book!.id, { rating: val })"
          @update:spice="(val) => library.updateBook(book!.id, { spice: val })"
        />
      </div>

      <!-- Blurb Box -->
      <div class="blurb-box">
        <p class="blurb-text" :class="{ clamped: !blurbExpanded }">
          {{ book.blurb || 'No blurb added yet. Tap "Edit blurb" to add a synopsis.' }}
        </p>
        <div class="blurb-actions">
          <button
            v-if="book.blurb && book.blurb.length > 120"
            type="button"
            class="text-link"
            @click="blurbExpanded = !blurbExpanded"
          >
            {{ blurbExpanded ? 'less' : 'more' }}
          </button>
          <span v-else />
          <button type="button" class="text-link" @click="openBlurbEditor()">Edit blurb</button>
        </div>
      </div>
    </section>

    <!-- Progress + Timer Action Card -->
    <section class="card progress-card">
      <ProgressRing
        :percent="percent"
        :size="136"
        :stroke-width="11"
        :sublabel="`p.${book.currentPage} of ${book.totalPages}`"
      />

      <div class="progress-actions">
        <button type="button" class="btn btn-accent prog-btn" @click="openProgressSheet()">
          Update progress
        </button>
        <button type="button" class="btn btn-dark prog-btn" @click="timer.startForBook(book.id)">
          <Play :size="14" /> Start timer
        </button>
        <div class="two-mini">
          <button type="button" class="btn btn-surface mini-action" @click="markFinished()">
            Finished
          </button>
          <button type="button" class="btn btn-surface mini-action" @click="markDnf()">
            DNF
          </button>
        </div>
      </div>
    </section>

    <!-- Mood Card -->
    <section class="card tag-card">
      <div class="tag-head">
        <h2 class="section-title">Mood</h2>
        <button type="button" class="add-link" @click="openTagModal('moods')">+ Add</button>
      </div>
      <div v-if="book.moods.length" class="tag-list">
        <span v-for="m in book.moods" :key="m" class="chip">{{ m }}</span>
      </div>
      <p v-else class="subtle small-empty">Add how this book made you feel.</p>
    </section>

    <!-- Tropes & Tags Card -->
    <section class="card tag-card">
      <div class="tag-head">
        <h2 class="section-title">Tropes & tags</h2>
        <button type="button" class="add-link" @click="openTagModal('tropes')">+ Add</button>
      </div>
      <div v-if="book.tropes.length" class="tag-list">
        <span v-for="t in book.tropes" :key="t" class="chip">{{ t }}</span>
      </div>
      <p v-else class="subtle small-empty">Track your favorite tropes and themes.</p>
    </section>

    <!-- Genres Card -->
    <section class="card tag-card">
      <div class="tag-head">
        <h2 class="section-title">Genres</h2>
        <button type="button" class="add-link" @click="openTagModal('genres')">+ Add</button>
      </div>
      <div v-if="book.genres.length" class="tag-list">
        <span v-for="g in book.genres" :key="g" class="chip">{{ g }}</span>
      </div>
      <p v-else class="subtle small-empty">Add genres to power your Reading Stats donut chart.</p>
    </section>

    <!-- Review Card -->
    <section class="card tag-card">
      <div class="tag-head">
        <h2 class="section-title">Review</h2>
        <button type="button" class="add-link" @click="openReviewEditor()">
          {{ book.review ? 'Edit' : '+ Add' }}
        </button>
      </div>
      <p class="review-body" :class="{ muted: !book.review }">
        {{ book.review || 'First impressions so far?' }}
      </p>
    </section>

    <!-- Series Card -->
    <section class="card series-link-card" @click="linkedSeries ? router.push('/series') : openMetaEditor()">
      <div class="tag-head">
        <div class="series-line">
          <Layers :size="16" class="accent-ico" />
          <h2 class="section-title">
            Series: {{ linkedSeries ? linkedSeries.name : 'Standalone' }}
            <span v-if="linkedSeries && book.seriesOrder" class="muted">
              · Book {{ book.seriesOrder }}
            </span>
          </h2>
        </div>
        <button type="button" class="add-link" @click.stop="openMetaEditor()">Edit</button>
      </div>
      <p v-if="book.releaseDate" class="subtle small-empty">
        Release date: {{ book.releaseDate }}
      </p>
    </section>

    <!-- Book Quotes Card -->
    <section class="card tag-card">
      <div class="tag-head">
        <div class="series-line">
          <Quote :size="15" class="accent-ico" />
          <h2 class="section-title">Saved Quotes ({{ bookQuotes.length }})</h2>
        </div>
        <button
          type="button"
          class="add-link"
          @click="ui.openQuickAdd('quote', { bookId: book.id })"
        >
          + Add
        </button>
      </div>
      <div v-if="bookQuotes.length" class="mini-quotes">
        <div v-for="q in bookQuotes" :key="q.id" class="mini-quote-item">
          <p>“{{ q.text }}”</p>
          <span v-if="q.page" class="subtle">p. {{ q.page }}</span>
        </div>
      </div>
      <p v-else class="subtle small-empty">Save memorable lines from this book.</p>
    </section>

    <!-- Update Progress Sheet -->
    <Transition name="fade">
      <div v-if="progressModalOpen" class="sheet-backdrop" @click.self="progressModalOpen = false">
        <div class="sheet-panel">
          <div class="sheet-handle" />
          <div class="modal-head">
            <h3>Update Progress</h3>
            <button type="button" class="icon-btn" @click="progressModalOpen = false"><X :size="18" /></button>
          </div>
          <form class="sheet-form" @submit.prevent="saveProgress">
            <div class="big-page-display tabular">
              <strong>{{ progressPage }}</strong>
              <span class="muted">of {{ book.totalPages }} pages ({{ Math.round((progressPage / (book.totalPages || 1)) * 100) }}%)</span>
            </div>
            <input
              v-model.number="progressPage"
              type="range"
              min="0"
              :max="book.totalPages || 100"
              class="range-slider"
            />
            <input
              v-model.number="progressPage"
              type="number"
              min="0"
              :max="book.totalPages || 9999"
              class="input tabular"
            />
            <button type="submit" class="btn btn-accent full">Save Progress</button>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Edit Blurb Sheet -->
    <Transition name="fade">
      <div v-if="blurbModalOpen" class="sheet-backdrop" @click.self="blurbModalOpen = false">
        <div class="sheet-panel">
          <div class="sheet-handle" />
          <div class="modal-head">
            <h3>Edit Blurb</h3>
            <button type="button" class="icon-btn" @click="blurbModalOpen = false"><X :size="18" /></button>
          </div>
          <form class="sheet-form" @submit.prevent="saveBlurb">
            <textarea v-model="blurbDraft" class="textarea" rows="6" placeholder="Book synopsis..." />
            <button type="submit" class="btn btn-accent full">Save Blurb</button>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Edit Review Sheet -->
    <Transition name="fade">
      <div v-if="reviewModalOpen" class="sheet-backdrop" @click.self="reviewModalOpen = false">
        <div class="sheet-panel">
          <div class="sheet-handle" />
          <div class="modal-head">
            <h3>Your Review</h3>
            <button type="button" class="icon-btn" @click="reviewModalOpen = false"><X :size="18" /></button>
          </div>
          <form class="sheet-form" @submit.prevent="saveReview">
            <textarea
              v-model="reviewDraft"
              class="textarea"
              rows="6"
              placeholder="Write your thoughts, favorite moments, or review..."
            />
            <button type="submit" class="btn btn-accent full">Save Review</button>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Mood / Tropes / Genres Picker Sheet -->
    <Transition name="fade">
      <div v-if="tagModalType" class="sheet-backdrop" @click.self="tagModalType = null">
        <div class="sheet-panel">
          <div class="sheet-handle" />
          <div class="modal-head">
            <h3>
              {{ tagModalType === 'moods' ? 'Moods' : tagModalType === 'tropes' ? 'Tropes & Tags' : 'Genres' }}
            </h3>
            <button type="button" class="icon-btn" @click="tagModalType = null"><X :size="18" /></button>
          </div>

          <form class="custom-tag-row" @submit.prevent="addCustomTag">
            <input v-model="customTagInput" class="input" placeholder="Add custom tag..." />
            <button type="submit" class="btn btn-accent btn-pill"><Plus :size="16" /> Add</button>
          </form>

          <div class="tag-picker-grid">
            <button
              v-for="tag in Array.from(new Set([...currentPresets, ...currentTagList]))"
              :key="tag"
              type="button"
              class="chip"
              :class="{ 'chip-active': currentTagList.some((x) => x.toLowerCase() === tag.toLowerCase()) }"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Edit Metadata Sheet -->
    <Transition name="fade">
      <div v-if="editMetaOpen" class="sheet-backdrop" @click.self="editMetaOpen = false">
        <div class="sheet-panel">
          <div class="sheet-handle" />
          <div class="modal-head">
            <h3>Edit Book Details</h3>
            <button type="button" class="icon-btn" @click="editMetaOpen = false"><X :size="18" /></button>
          </div>

          <form class="sheet-form" @submit.prevent="saveMeta">
            <label class="field"><span>Title</span><input v-model="metaForm.title" class="input" required /></label>
            <label class="field"><span>Author</span><input v-model="metaForm.author" class="input" /></label>
            <div class="two-col">
              <label class="field">
                <span>Format</span>
                <select v-model="metaForm.format" class="select">
                  <option value="Paperback">Paperback</option>
                  <option value="Hardcover">Hardcover</option>
                  <option value="eBook">eBook</option>
                  <option value="Audiobook">Audiobook</option>
                </select>
              </label>
              <label class="field">
                <span>Total Pages</span>
                <input v-model.number="metaForm.totalPages" type="number" min="1" class="input" />
              </label>
            </div>
            <div class="two-col">
              <label class="field">
                <span>Series</span>
                <select v-model="metaForm.seriesId" class="select">
                  <option value="">None</option>
                  <option v-for="s in library.series" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </label>
              <label class="field">
                <span>Book #</span>
                <input v-model="metaForm.seriesOrder" type="number" step="0.5" class="input" />
              </label>
            </div>
            <label class="field">
              <span>Release Date (Upcoming Releases)</span>
              <input v-model="metaForm.releaseDate" type="date" class="input" />
            </label>
            <div class="two-col">
              <label class="field"><span>Date Started</span><input v-model="metaForm.startedAt" type="date" class="input" /></label>
              <label class="field"><span>Date Finished</span><input v-model="metaForm.finishedAt" type="date" class="input" /></label>
            </div>
            <label class="field"><span>Cover URL</span><input v-model="metaForm.coverUrl" class="input" /></label>
            <button type="submit" class="btn btn-accent full">Save Changes</button>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Delete Confirmation Sheet -->
    <Transition name="fade">
      <div v-if="confirmDeleteOpen" class="sheet-backdrop" @click.self="confirmDeleteOpen = false">
        <div class="sheet-panel">
          <div class="sheet-handle" />
          <h3 style="margin: 0 0 8px">Remove book?</h3>
          <p class="muted" style="margin: 0 0 18px">
            “{{ book.title }}” will be permanently removed from your library.
          </p>
          <div class="two-col">
            <button type="button" class="btn btn-surface" @click="confirmDeleteOpen = false">Cancel</button>
            <button type="button" class="btn btn-accent" @click="confirmDeleteBook()">Delete</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>

  <div v-else class="page-scroll not-found">
    <p class="muted">Book not found.</p>
    <button type="button" class="btn btn-accent btn-pill" @click="router.push('/library')">
      Back to Library
    </button>
  </div>
</template>

<style scoped>
.detail-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.pill-selects {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pill-select {
  position: relative;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  height: 34px;
  padding: 0 26px 0 14px;
  font-size: 13px;
  font-weight: 700;
}

.pill-select.accent {
  background: var(--accent);
  color: var(--accent-on);
}

.pill-select.dark {
  background: var(--bg-surface-elevated);
  color: var(--text-primary);
  border: 1px solid var(--border-subtle);
}

.pill-select select {
  appearance: none;
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  outline: none;
  cursor: pointer;
}

.pill-select .chev {
  position: absolute;
  right: 9px;
  pointer-events: none;
}

.hero-card {
  border-radius: var(--radius-lg);
  padding: 20px 16px 16px;
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.cover-stage {
  margin-bottom: 14px;
}

.hero-cover-wrap {
  width: 146px;
  position: relative;
}

.cover-badge-top {
  position: absolute;
  top: -8px;
  right: -10px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-on);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.cover-badge-bottom {
  position: absolute;
  bottom: -6px;
  right: -8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #3d3737;
  border: 1px solid var(--border-strong);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.book-title {
  margin: 0;
  font-size: 21px;
  font-weight: 700;
  line-height: 1.2;
}

.book-subtitle {
  margin: 5px 0 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.sep {
  opacity: 0.4;
  margin: 0 4px;
}

.rating-center {
  margin-bottom: 14px;
}

.blurb-box {
  width: 100%;
  background: rgba(255, 245, 238, 0.04);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 12px 14px;
  text-align: left;
}

.blurb-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary);
}

.blurb-text.clamped {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.blurb-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
}

.text-link {
  font-size: 12.5px;
  color: var(--text-secondary);
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Progress Card */
.progress-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #403a3a;
}

.progress-actions {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prog-btn {
  width: 100%;
  height: 40px;
  border-radius: 12px;
  font-size: 13.5px;
}

.two-mini {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.mini-action {
  height: 36px;
  border-radius: 10px;
  font-size: 12.5px;
  background: rgba(255, 255, 255, 0.08);
}

/* Tag / Review / Series cards */
.tag-card,
.series-link-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.series-link-card {
  cursor: pointer;
}

.tag-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.add-link {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.small-empty {
  margin: 0;
  font-size: 13px;
}

.review-body {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.series-line {
  display: flex;
  align-items: center;
  gap: 7px;
}

.accent-ico {
  color: var(--accent);
}

.mini-quotes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-quote-item {
  padding: 10px 12px;
  border-radius: 12px;
  background: #171414;
  border: 1px solid var(--border-subtle);
}

.mini-quote-item p {
  margin: 0 0 4px;
  font-size: 13px;
}

/* Sheets */
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.modal-head h3 {
  margin: 0;
}

.sheet-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.big-page-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.big-page-display strong {
  font-size: 40px;
  color: var(--accent);
}

.range-slider {
  width: 100%;
  accent-color: var(--accent);
}

.custom-tag-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.tag-picker-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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

.full {
  width: 100%;
}

.not-found {
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
}
</style>
