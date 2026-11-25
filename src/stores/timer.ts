import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

const TIMER_STORAGE_KEY = 'folio_active_timer_v1'

interface PersistedTimer {
  bookId: string
  startedAt: number
  accumulatedSeconds: number
  runningSince: number | null
}

export const useTimerStore = defineStore('timer', () => {
  const isOpen = ref(false)
  const bookId = ref<string | null>(null)
  const startedAt = ref<number | null>(null)
  const accumulatedSeconds = ref(0)
  const runningSince = ref<number | null>(null)
  const nowTick = ref(Date.now())

  let intervalId: number | null = null

  const isActive = computed(() => Boolean(bookId.value))
  const isRunning = computed(() => Boolean(runningSince.value))

  const elapsedSeconds = computed(() => {
    if (!bookId.value) return 0
    if (runningSince.value) {
      const liveDelta = Math.max(0, Math.floor((nowTick.value - runningSince.value) / 1000))
      return accumulatedSeconds.value + liveDelta
    }
    return accumulatedSeconds.value
  })

  function ensureTicker() {
    if (intervalId !== null) return
    intervalId = window.setInterval(() => {
      nowTick.value = Date.now()
    }, 1000)
  }

  function clearTicker() {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  function saveState() {
    if (!bookId.value || !startedAt.value) {
      localStorage.removeItem(TIMER_STORAGE_KEY)
      return
    }
    const payload: PersistedTimer = {
      bookId: bookId.value,
      startedAt: startedAt.value,
      accumulatedSeconds: accumulatedSeconds.value,
      runningSince: runningSince.value,
    }
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(payload))
  }

  function restore() {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as PersistedTimer
      if (parsed.bookId && parsed.startedAt) {
        bookId.value = parsed.bookId
        startedAt.value = parsed.startedAt
        accumulatedSeconds.value = parsed.accumulatedSeconds || 0
        runningSince.value = parsed.runningSince
        nowTick.value = Date.now()
        if (runningSince.value) ensureTicker()
      }
    } catch {
      localStorage.removeItem(TIMER_STORAGE_KEY)
    }
  }

  function startForBook(targetBookId: string) {
    if (bookId.value === targetBookId) {
      isOpen.value = true
      if (!runningSince.value) resume()
      return
    }
    const now = Date.now()
    bookId.value = targetBookId
    startedAt.value = now
    accumulatedSeconds.value = 0
    runningSince.value = now
    nowTick.value = now
    isOpen.value = true
    ensureTicker()
    saveState()
  }

  function pause() {
    if (!runningSince.value) return
    const now = Date.now()
    accumulatedSeconds.value += Math.max(0, Math.floor((now - runningSince.value) / 1000))
    runningSince.value = null
    clearTicker()
    saveState()
  }

  function resume() {
    if (!bookId.value || runningSince.value) return
    const now = Date.now()
    runningSince.value = now
    nowTick.value = now
    ensureTicker()
    saveState()
  }

  function togglePause() {
    if (isRunning.value) pause()
    else resume()
  }

  function minimize() {
    isOpen.value = false
  }

  function openModal() {
    if (bookId.value) isOpen.value = true
  }

  function discard() {
    clearTicker()
    isOpen.value = false
    bookId.value = null
    startedAt.value = null
    accumulatedSeconds.value = 0
    runningSince.value = null
    localStorage.removeItem(TIMER_STORAGE_KEY)
  }

  return {
    isOpen,
    bookId,
    startedAt,
    elapsedSeconds,
    isActive,
    isRunning,
    restore,
    startForBook,
    pause,
    resume,
    togglePause,
    minimize,
    openModal,
    discard,
  }
})
