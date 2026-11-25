import { defineStore } from 'pinia'
import { ref } from 'vue'

export type QuickActionTab = 'search' | 'manual' | 'quote'

export const useUiStore = defineStore('ui', () => {
  const quickAddOpen = ref(false)
  const quickAddTab = ref<QuickActionTab>('search')
  const quickAddPresetSeriesId = ref<string | null>(null)
  const quickAddPresetBookId = ref<string | null>(null)
  const toastMessage = ref<string | null>(null)
  let toastTimer: number | null = null

  function openQuickAdd(
    tab: QuickActionTab = 'search',
    options?: { seriesId?: string | null; bookId?: string | null },
  ) {
    quickAddTab.value = tab
    quickAddPresetSeriesId.value = options?.seriesId ?? null
    quickAddPresetBookId.value = options?.bookId ?? null
    quickAddOpen.value = true
  }

  function closeQuickAdd() {
    quickAddOpen.value = false
    quickAddPresetSeriesId.value = null
    quickAddPresetBookId.value = null
  }

  function showToast(msg: string, duration = 2600) {
    toastMessage.value = msg
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = window.setTimeout(() => {
      toastMessage.value = null
    }, duration)
  }

  return {
    quickAddOpen,
    quickAddTab,
    quickAddPresetSeriesId,
    quickAddPresetBookId,
    toastMessage,
    openQuickAdd,
    closeQuickAdd,
    showToast,
  }
})
