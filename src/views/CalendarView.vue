<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronLeft, ChevronRight, Flame, Plus, Share2, Trash2, X } from 'lucide-vue-next'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'
import { buildMonthGrid } from '@/utils/dates'
import BookCover from '@/components/BookCover.vue'
import type { ReadingSession } from '@/types/models'

const router = useRouter()
const library = useLibraryStore()
const ui = useUiStore()

const cursorDate = ref(new Date())
const currentYear = computed(() => cursorDate.value.getFullYear())
const currentMonth = computed(() => cursorDate.value.getMonth())

const monthLabel = computed(() =>
  cursorDate.value.toLocaleDateString('en-US', { month: 'long' }),
)
const shortMonthLabel = computed(() =>
  cursorDate.value.toLocaleDateString('en-US', { month: 'short' }),
)
const monthPrefix = computed(
  () => `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}`,
)

const cells = computed(() => buildMonthGrid(currentYear.value, currentMonth.value))

const sessionsByDate = computed(() => {
  const map = new Map<string, ReadingSession[]>()
  for (const s of library.sessions) {
    const arr = map.get(s.date) || []
    arr.push(s)
    map.set(s.date, arr)
  }
  return map
})

const pagesInMonth = computed(() =>
  library.sessions
    .filter((s) => s.date.startsWith(monthPrefix.value))
    .reduce((sum, s) => sum + (s.pagesRead || 0), 0),
)

const booksReadInMonth = computed(
  () => library.books.filter((b) => b.status === 'finished' && b.finishedAt?.startsWith(monthPrefix.value)).length,
)

function shiftMonth(delta: number) {
  cursorDate.value = new Date(currentYear.value, currentMonth.value + delta, 1)
}

function primarySessionForDay(dateKey: string): ReadingSession | null {
  const list = sessionsByDate.value.get(dateKey)
  if (!list || !list.length) return null
  return list.slice().sort((a, b) => b.pagesRead - a.pagesRead)[0]
}

// Edit Goals Sheet
const goalsModalOpen = ref(false)
const goalForm = reactive({
  dailyPageGoal: 20,
  yearlyBookGoal: 50,
})

function openGoalsModal() {
  goalForm.dailyPageGoal = library.profile.dailyPageGoal
  goalForm.yearlyBookGoal = library.profile.yearlyBookGoal
  goalsModalOpen.value = true
}

async function saveGoals() {
  await library.updatePreferences({
    dailyPageGoal: Math.max(1, Number(goalForm.dailyPageGoal) || 20),
    yearlyBookGoal: Math.max(1, Number(goalForm.yearlyBookGoal) || 50),
  })
  goalsModalOpen.value = false
  ui.showToast('Reading goals updated')
}

// Day Detail & Log Session Sheet
const selectedDateKey = ref<string | null>(null)
const logForm = reactive({
  bookId: '',
  pagesRead: 25,
  minutes: 30,
})

const selectedDaySessions = computed(() =>
  selectedDateKey.value ? sessionsByDate.value.get(selectedDateKey.value) || [] : [],
)

function openDay(dateKey: string) {
  selectedDateKey.value = dateKey
  if (!logForm.bookId && library.books.length) {
    logForm.bookId = library.primaryReadingBook?.id || library.books[0].id
  }
}

async function addManualSessionForDay() {
  if (!selectedDateKey.value || !logForm.bookId) return
  const book = library.getBookById(logForm.bookId)
  if (!book) return
  const pages = Math.max(1, Number(logForm.pagesRead) || 1)
  const durationSeconds = Math.max(60, (Number(logForm.minutes) || 20) * 60)
  const now = Date.now()
  await library.addSession({
    bookId: book.id,
    bookTitle: book.title,
    bookCoverUrl: book.coverUrl,
    date: selectedDateKey.value,
    startPage: book.currentPage,
    endPage: Math.min(book.totalPages, book.currentPage + pages),
    pagesRead: pages,
    durationSeconds,
    startedAt: now - durationSeconds * 1000,
    endedAt: now,
  })
  ui.showToast(`Logged ${pages} pages for ${selectedDateKey.value}`)
}

async function shareCalendarSummary() {
  const text = `My ${monthLabel.value} reading recap on Folio:\n🔥 ${library.streakInfo.currentStreak}-day streak (longest: ${library.streakInfo.longestStreak} days)\n📖 ${pagesInMonth.value.toLocaleString()} pages read\n📚 ${booksReadInMonth.value} books finished`
  if (navigator.share) {
    try {
      await navigator.share({ title: `${monthLabel.value} Reading Calendar`, text })
      return
    } catch {
      // fallback to clipboard
    }
  }
  await navigator.clipboard?.writeText(text)
  ui.showToast('Monthly summary copied to clipboard')
}
</script>

<template>
  <div class="page-scroll calendar-page">
    <header class="cal-header">
      <button type="button" class="icon-btn" @click="router.back()">
        <ChevronLeft :size="20" />
      </button>
      <h1 class="page-title">READING CALENDAR</h1>
      <span style="width: 38px" />
    </header>

    <!-- Bento Top Grid -->
    <div class="bento-grid">
      <div class="card-glow streak-hero">
        <span class="hero-label">Streak</span>
        <div class="hero-num-row">
          <Flame :size="30" fill="#f08a4b" color="#f08a4b" />
          <span class="hero-num tabular">{{ library.streakInfo.currentStreak }}</span>
        </div>
        <span class="hero-days">days</span>
        <span class="hero-longest tabular">Longest {{ library.streakInfo.longestStreak }} days</span>
      </div>

      <div class="bento-right">
        <div class="card stat-tile">
          <span class="tile-label">Pages read in {{ shortMonthLabel }}</span>
          <strong class="tile-val tabular">{{ pagesInMonth.toLocaleString() }}</strong>
        </div>

        <div class="card stat-tile">
          <span class="tile-label">Books read in {{ shortMonthLabel }}</span>
          <strong class="tile-val tabular">{{ booksReadInMonth }}</strong>
        </div>
      </div>
    </div>

    <!-- Goal Strip -->
    <div class="card goal-strip">
      <span class="goal-text tabular">
        <strong>Goal:</strong> {{ library.profile.dailyPageGoal }} pages/day ·
        {{ library.profile.yearlyBookGoal }} books/year
      </span>
      <button type="button" class="btn btn-accent goal-edit-btn" @click="openGoalsModal()">
        Edit
      </button>
    </div>

    <!-- Calendar Card -->
    <section class="card calendar-card">
      <div class="cal-nav-row">
        <div class="month-controls">
          <h2 class="month-name">{{ monthLabel }}</h2>
          <span v-if="currentYear !== new Date().getFullYear()" class="subtle">{{ currentYear }}</span>
          <button type="button" class="arrow-btn" aria-label="Previous month" @click="shiftMonth(-1)">
            <ChevronLeft :size="16" />
          </button>
          <button type="button" class="arrow-btn" aria-label="Next month" @click="shiftMonth(1)">
            <ChevronRight :size="16" />
          </button>
        </div>

        <button type="button" class="btn btn-accent share-pill" @click="shareCalendarSummary()">
          <Share2 :size="13" /> Share
        </button>
      </div>

      <div class="dow-row">
        <span v-for="d in ['M', 'T', 'W', 'T', 'F', 'S', 'S']" :key="d">{{ d }}</span>
      </div>

      <div class="days-grid">
        <button
          v-for="cell in cells"
          :key="cell.dateKey"
          type="button"
          class="day-cell"
          :class="{
            'is-out': !cell.inCurrentMonth,
            'is-active': Boolean(primarySessionForDay(cell.dateKey)),
            'is-today': cell.isToday,
          }"
          @click="openDay(cell.dateKey)"
        >
          <span class="day-num tabular">{{ cell.dayNumber }}</span>
          <div v-if="primarySessionForDay(cell.dateKey)" class="day-cover">
            <BookCover
              :src="primarySessionForDay(cell.dateKey)!.bookCoverUrl"
              :title="primarySessionForDay(cell.dateKey)!.bookTitle"
              radius="3px"
            />
          </div>
        </button>
      </div>
    </section>

    <!-- Edit Goals Sheet -->
    <Transition name="fade">
      <div v-if="goalsModalOpen" class="sheet-backdrop" @click.self="goalsModalOpen = false">
        <div class="sheet-panel">
          <div class="sheet-handle" />
          <div class="modal-head">
            <h3>Reading Goals</h3>
            <button type="button" class="icon-btn" @click="goalsModalOpen = false"><X :size="18" /></button>
          </div>
          <form class="sheet-form" @submit.prevent="saveGoals">
            <label class="field">
              <span>Daily pages goal</span>
              <input v-model.number="goalForm.dailyPageGoal" type="number" min="1" class="input" />
            </label>
            <label class="field">
              <span>Yearly books goal</span>
              <input v-model.number="goalForm.yearlyBookGoal" type="number" min="1" class="input" />
            </label>
            <button type="submit" class="btn btn-accent full">Save Goals</button>
          </form>
        </div>
      </div>
    </Transition>

    <!-- Day Sessions Sheet -->
    <Transition name="fade">
      <div v-if="selectedDateKey" class="sheet-backdrop" @click.self="selectedDateKey = null">
        <div class="sheet-panel">
          <div class="sheet-handle" />
          <div class="modal-head">
            <h3>{{ selectedDateKey }}</h3>
            <button type="button" class="icon-btn" @click="selectedDateKey = null"><X :size="18" /></button>
          </div>

          <div v-if="selectedDaySessions.length" class="day-sessions-list">
            <div v-for="s in selectedDaySessions" :key="s.id" class="session-row">
              <div class="session-thumb">
                <BookCover :src="s.bookCoverUrl" :title="s.bookTitle" radius="4px" />
              </div>
              <div class="session-meta">
                <strong>{{ s.bookTitle }}</strong>
                <span class="muted tabular">
                  {{ s.pagesRead }} pages · {{ Math.max(1, Math.round(s.durationSeconds / 60)) }} min
                </span>
              </div>
              <button
                type="button"
                class="icon-btn"
                aria-label="Delete session"
                @click="library.deleteSession(s.id)"
              >
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
          <p v-else class="subtle" style="margin: 0 0 14px">No sessions logged for this day yet.</p>

          <form v-if="library.books.length" class="sheet-form" @submit.prevent="addManualSessionForDay">
            <h4 class="log-sub">Log reading for this day</h4>
            <select v-model="logForm.bookId" class="select">
              <option v-for="b in library.books" :key="b.id" :value="b.id">{{ b.title }}</option>
            </select>
            <div class="two-col">
              <label class="field">
                <span>Pages read</span>
                <input v-model.number="logForm.pagesRead" type="number" min="1" class="input" />
              </label>
              <label class="field">
                <span>Minutes</span>
                <input v-model.number="logForm.minutes" type="number" min="1" class="input" />
              </label>
            </div>
            <button type="submit" class="btn btn-accent full">
              <Plus :size="15" /> Log Session
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.calendar-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bento-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.streak-hero {
  padding: 18px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 2px;
}

.hero-label {
  align-self: flex-start;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.hero-num-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hero-num {
  font-size: 46px;
  font-weight: 800;
  line-height: 1;
  color: var(--accent);
}

.hero-days {
  font-size: 13px;
  color: var(--text-primary);
  font-weight: 600;
}

.hero-longest {
  margin-top: 6px;
  font-size: 11.5px;
  color: var(--text-secondary);
}

.bento-right {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-tile {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
}

.tile-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.tile-val {
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
}

.goal-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 999px;
}

.goal-text {
  font-size: 12.5px;
  color: var(--text-secondary);
}

.goal-text strong {
  color: var(--text-primary);
}

.goal-edit-btn {
  height: 30px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12px;
}

.calendar-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 12px;
}

.cal-nav-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.month-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.month-name {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
}

.arrow-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.share-pill {
  height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 12.5px;
}

.dow-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-secondary);
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.day-cell {
  min-height: 62px;
  border-radius: 9px;
  background: #1c1919;
  border: 1px solid rgba(255, 245, 238, 0.05);
  padding: 4px 3px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.day-cell.is-out {
  opacity: 0.42;
}

.day-cell.is-active {
  background: var(--sage-tile);
  border-color: rgba(255, 255, 255, 0.14);
}

.day-cell.is-today {
  box-shadow: inset 0 0 0 1.5px var(--accent);
}

.day-num {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-primary);
}

.day-cover {
  width: 28px;
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

.sheet-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.day-sessions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.session-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  background: var(--bg-surface);
}

.session-thumb {
  width: 30px;
}

.session-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  font-size: 13px;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field span {
  font-size: 12px;
  color: var(--text-secondary);
}

.full {
  width: 100%;
}
</style>
