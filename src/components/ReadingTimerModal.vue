<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Pause, Play, X } from 'lucide-vue-next'
import { useTimerStore } from '@/stores/timer'
import { useLibraryStore } from '@/stores/library'
import { useUiStore } from '@/stores/ui'
import { formatClockTime, formatTimerClock } from '@/utils/dates'
import BookCover from './BookCover.vue'

const timer = useTimerStore()
const library = useLibraryStore()
const ui = useUiStore()

const finishingStep = ref(false)
const endPageInput = ref(0)

const book = computed(() => (timer.bookId ? library.getBookById(timer.bookId) : null))

watch(
  () => timer.isOpen,
  (open) => {
    if (open && book.value) {
      finishingStep.value = false
      endPageInput.value = book.value.currentPage
    }
  },
)

function openFinishPrompt() {
  timer.pause()
  endPageInput.value = book.value?.currentPage || 0
  finishingStep.value = true
}

async function saveSession() {
  if (!book.value) {
    timer.discard()
    return
  }
  const duration = Math.max(1, timer.elapsedSeconds)
  const pagesDelta = Math.max(0, endPageInput.value - book.value.currentPage)
  await library.logReadingProgress(book.value.id, endPageInput.value, duration)
  timer.discard()
  finishingStep.value = false
  ui.showToast(
    pagesDelta > 0
      ? `Logged ${pagesDelta} pages (${formatTimerClock(duration)})`
      : `Logged ${formatTimerClock(duration)} reading session`,
  )
}

function discardTimer() {
  finishingStep.value = false
  timer.discard()
  ui.showToast('Timer discarded')
}
</script>

<template>
  <Transition name="fade">
    <div v-if="timer.isOpen && book" class="timer-overlay">
      <div class="timer-shell">
        <button
          type="button"
          class="close-btn"
          aria-label="Minimize timer"
          @click="timer.minimize()"
        >
          <X :size="20" />
        </button>

        <div class="timer-center">
          <div class="timer-cover">
            <BookCover :src="book.coverUrl" :title="book.title" :author="book.author" radius="12px" />
          </div>

          <h2 class="timer-book-title">{{ book.title }}</h2>

          <div class="timer-readout tabular">{{ formatTimerClock(timer.elapsedSeconds) }}</div>
          <div v-if="timer.startedAt" class="timer-started">
            started {{ formatClockTime(timer.startedAt) }}
          </div>

          <div v-if="!finishingStep" class="timer-controls">
            <button type="button" class="btn btn-outline" @click="timer.togglePause()">
              <Pause v-if="timer.isRunning" :size="16" />
              <Play v-else :size="16" />
              {{ timer.isRunning ? 'Pause' : 'Resume' }}
            </button>
            <button type="button" class="btn btn-accent" @click="openFinishPrompt()">
              Finish
            </button>
          </div>

          <form v-else class="finish-box" @submit.prevent="saveSession">
            <label class="finish-label">
              <span>What page did you reach?</span>
              <div class="page-row">
                <input
                  v-model.number="endPageInput"
                  type="number"
                  min="0"
                  :max="book.totalPages || 9999"
                  class="input page-input tabular"
                  autofocus
                />
                <span class="muted">/ {{ book.totalPages }}</span>
              </div>
              <small class="subtle">
                Started at p.{{ book.currentPage }} (+{{ Math.max(0, endPageInput - book.currentPage) }} pages)
              </small>
            </label>

            <div class="timer-controls">
              <button type="button" class="btn btn-outline" @click="finishingStep = false">
                Back
              </button>
              <button type="submit" class="btn btn-accent">Save Session</button>
            </div>
          </form>

          <button type="button" class="discard-link" @click="discardTimer()">
            Discard timer
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.timer-overlay {
  position: fixed;
  inset: 0;
  background: #0a0909;
  z-index: 120;
  display: flex;
  justify-content: center;
}

.timer-shell {
  width: 100%;
  max-width: 480px;
  min-height: 100dvh;
  padding: calc(18px + var(--safe-top)) 24px calc(32px + var(--safe-bottom));
  display: flex;
  flex-direction: column;
  position: relative;
  background: radial-gradient(circle at 50% 35%, rgba(200, 150, 133, 0.08), transparent 62%), #0b0a0a;
}

.close-btn {
  position: absolute;
  top: calc(18px + var(--safe-top));
  right: 20px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-center {
  margin: auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.timer-cover {
  width: 132px;
  margin-bottom: 20px;
}

.timer-book-title {
  margin: 0 0 18px;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-secondary);
}

.timer-readout {
  font-size: 56px;
  font-weight: 500;
  letter-spacing: -0.02em;
  line-height: 1.05;
  color: var(--text-primary);
}

.timer-started {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.timer-controls {
  width: 100%;
  max-width: 310px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 34px;
}

.btn-outline {
  border: 1px solid rgba(255, 245, 238, 0.22);
  background: transparent;
  color: var(--text-primary);
  border-radius: 12px;
}

.finish-box {
  width: 100%;
  max-width: 310px;
  margin-top: 26px;
  padding: 16px;
  border-radius: 18px;
  background: #181515;
  border: 1px solid var(--border-strong);
}

.finish-label {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
}

.page-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-input {
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.finish-box .timer-controls {
  margin-top: 16px;
}

.discard-link {
  margin-top: 26px;
  font-size: 13.5px;
  color: var(--text-secondary);
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
