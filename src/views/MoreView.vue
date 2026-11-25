<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Calendar,
  CalendarClock,
  ChevronRight,
  Cloud,
  Download,
  Layers,
  LogOut,
  Palette,
  Quote,
  Smartphone,
  Sparkles,
  Upload,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'
import {
  downloadTextFile,
  exportBooksToCsv,
  parseGoodreadsCsv,
  type FullBackupPayload,
} from '@/services/csvUtils'
import type { AccentTheme, ShelfStyle } from '@/types/models'

const router = useRouter()
const auth = useAuthStore()
const library = useLibraryStore()
const ui = useUiStore()

const csvInputRef = ref<HTMLInputElement | null>(null)
const importing = ref(false)

const themes: Array<{ id: AccentTheme; label: string; color: string }> = [
  { id: 'rose-gold', label: 'Rose Gold', color: '#c89685' },
  { id: 'sage', label: 'Sage', color: '#8ead9b' },
  { id: 'lavender', label: 'Lavender', color: '#b7a1cf' },
  { id: 'amber', label: 'Amber', color: '#d4a66a' },
]

const shelfFinishes: Array<{ id: ShelfStyle; label: string }> = [
  { id: 'walnut', label: 'Walnut' },
  { id: 'oak', label: 'Warm Oak' },
  { id: 'espresso', label: 'Espresso' },
  { id: 'minimal', label: 'Slate' },
]

function triggerCsvImport() {
  csvInputRef.value?.click()
}

async function handleCsvFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  importing.value = true
  try {
    const text = await file.text()
    const parsed = parseGoodreadsCsv(text)
    if (!parsed.length) {
      ui.showToast('No books found in that CSV file')
    } else {
      const count = await library.importBooksBulk(parsed)
      ui.showToast(`Imported ${count} books into Folio!`)
    }
  } catch {
    ui.showToast('Could not parse CSV file')
  } finally {
    importing.value = false
    if (csvInputRef.value) csvInputRef.value.value = ''
  }
}

function handleExportCsv() {
  const csv = exportBooksToCsv(library.books)
  downloadTextFile(`folio-library-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv')
  ui.showToast('Exported CSV backup')
}

function handleExportJson() {
  const payload: FullBackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    books: library.books,
    series: library.series,
    sessions: library.sessions,
    quotes: library.quotes,
  }
  downloadTextFile(
    `folio-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  )
  ui.showToast('Exported full JSON backup')
}

async function seedDemoBooks() {
  await library.loadSampleLibrary()
  ui.showToast('Loaded starter sample books & sessions')
}
</script>

<template>
  <div class="page-scroll more-page">
    <h1 class="page-title">MORE</h1>

    <!-- Feature Shortcuts -->
    <section class="shortcuts-grid">
      <button type="button" class="card shortcut-tile" @click="router.push('/calendar')">
        <Calendar :size="20" class="accent-ico" />
        <strong>Reading Calendar</strong>
        <span class="subtle">{{ library.streakInfo.currentStreak }} day streak</span>
      </button>

      <button type="button" class="card shortcut-tile" @click="router.push('/quotes')">
        <Quote :size="20" class="accent-ico" />
        <strong>Saved Quotes</strong>
        <span class="subtle">{{ library.quotes.length }} saved lines</span>
      </button>

      <button type="button" class="card shortcut-tile" @click="router.push('/series')">
        <Layers :size="20" class="accent-ico" />
        <strong>Series Tracker</strong>
        <span class="subtle">{{ library.series.length }} series</span>
      </button>

      <button type="button" class="card shortcut-tile" @click="router.push('/upcoming')">
        <CalendarClock :size="20" class="accent-ico" />
        <strong>Upcoming Releases</strong>
        <span class="subtle">{{ library.upcomingReleases.length }} coming soon</span>
      </button>
    </section>

    <!-- Personalization -->
    <section class="card pref-card">
      <div class="pref-head">
        <Palette :size="17" class="accent-ico" />
        <h2 class="section-title">Personalisation</h2>
      </div>

      <div class="pref-block">
        <span class="pref-label">Accent Theme</span>
        <div class="theme-grid">
          <button
            v-for="t in themes"
            :key="t.id"
            type="button"
            class="theme-chip"
            :class="{ active: library.profile.theme === t.id }"
            @click="library.setTheme(t.id)"
          >
            <span class="swatch" :style="{ background: t.color }" />
            {{ t.label }}
          </button>
        </div>
      </div>

      <div class="pref-block">
        <span class="pref-label">Cozy Shelf Finish</span>
        <div class="theme-grid">
          <button
            v-for="s in shelfFinishes"
            :key="s.id"
            type="button"
            class="theme-chip"
            :class="{ active: library.profile.shelfStyle === s.id }"
            @click="library.setShelfStyle(s.id)"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <label class="toggle-row">
        <div>
          <strong>Spice / Heat Rating</strong>
          <span class="subtle">Show chili rating alongside stars on Book Details</span>
        </div>
        <input
          type="checkbox"
          class="switch"
          :checked="library.profile.showSpiceRating"
          @change="library.updatePreferences({ showSpiceRating: !library.profile.showSpiceRating })"
        />
      </label>
    </section>

    <!-- Import & Export -->
    <section class="card pref-card">
      <h2 class="section-title">Library Data & Backups</h2>

      <input
        ref="csvInputRef"
        type="file"
        accept=".csv,text/csv"
        hidden
        @change="handleCsvFile"
      />

      <button type="button" class="row-btn" :disabled="importing" @click="triggerCsvImport()">
        <Upload :size="17" class="accent-ico" />
        <div class="row-text">
          <strong>Import Goodreads / CSV</strong>
          <span class="subtle">Bulk import books, ratings, shelves & reviews</span>
        </div>
        <ChevronRight :size="16" class="muted" />
      </button>

      <button type="button" class="row-btn" @click="handleExportCsv()">
        <Download :size="17" class="accent-ico" />
        <div class="row-text">
          <strong>Export Library CSV</strong>
          <span class="subtle">Spreadsheet & Goodreads-compatible export</span>
        </div>
        <ChevronRight :size="16" class="muted" />
      </button>

      <button type="button" class="row-btn" @click="handleExportJson()">
        <Download :size="17" class="accent-ico" />
        <div class="row-text">
          <strong>Export Full JSON Backup</strong>
          <span class="subtle">Books, series, reading sessions & quotes</span>
        </div>
        <ChevronRight :size="16" class="muted" />
      </button>

      <button
        v-if="library.books.length === 0"
        type="button"
        class="row-btn"
        @click="seedDemoBooks()"
      >
        <Sparkles :size="17" class="accent-ico" />
        <div class="row-text">
          <strong>Load Starter Sample Books</strong>
          <span class="subtle">Populate sample library, series, calendar & quotes</span>
        </div>
        <ChevronRight :size="16" class="muted" />
      </button>
    </section>

    <!-- iPhone PWA Install Card -->
    <section class="card pwa-card">
      <div class="pref-head">
        <Smartphone :size="17" class="accent-ico" />
        <h2 class="section-title">Install on iPhone</h2>
      </div>
      <p class="subtle pwa-copy">
        Open Folio in Safari, tap the <strong>Share</strong> icon, and choose
        <strong>Add to Home Screen</strong> for a full-screen standalone app with offline reading tracking.
      </p>
    </section>

    <!-- Account & Sync -->
    <section class="card pref-card">
      <div class="pref-head">
        <Cloud :size="17" class="accent-ico" />
        <h2 class="section-title">Account & Sync</h2>
      </div>
      <div class="account-row">
        <div>
          <strong>{{ auth.displayName }}</strong>
          <span class="subtle">
            {{ library.useCloud ? `Firebase Sync · ${auth.email}` : 'Local Offline Preview Mode' }}
          </span>
        </div>
        <button type="button" class="btn btn-surface btn-pill" @click="auth.logout()">
          <LogOut :size="14" /> Sign out
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.more-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.shortcut-tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
  text-align: left;
  padding: 15px 14px;
}

.shortcut-tile strong {
  font-size: 14px;
  margin-top: 3px;
}

.shortcut-tile span {
  font-size: 12px;
}

.accent-ico {
  color: var(--accent);
  flex-shrink: 0;
}

.pref-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pref-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pref-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pref-label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.theme-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.theme-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #161313;
  border: 1px solid var(--border-subtle);
  font-size: 13px;
  font-weight: 600;
}

.theme-chip.active {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 6px;
  border-top: 1px solid var(--border-subtle);
  cursor: pointer;
}

.toggle-row div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-row strong {
  font-size: 13.5px;
}

.toggle-row span {
  font-size: 12px;
}

.switch {
  width: 20px;
  height: 20px;
  accent-color: var(--accent);
}

.row-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
}

.row-btn:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.row-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.row-text strong {
  font-size: 13.5px;
}

.row-text span {
  font-size: 12px;
}

.pwa-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pwa-copy {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.account-row div {
  display: flex;
  flex-direction: column;
  font-size: 13px;
}
</style>
