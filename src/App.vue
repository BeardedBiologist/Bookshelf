<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useLibraryStore } from '@/stores/library'
import { useTimerStore } from '@/stores/timer'
import { useUiStore } from '@/stores/ui'
import AuthView from '@/components/AuthView.vue'
import BottomNav from '@/components/BottomNav.vue'
import QuickAddSheet from '@/components/QuickAddSheet.vue'
import ReadingTimerModal from '@/components/ReadingTimerModal.vue'

const auth = useAuthStore()
const library = useLibraryStore()
const timer = useTimerStore()
const ui = useUiStore()

onMounted(async () => {
  timer.restore()
  await auth.init()
})

onUnmounted(() => {
  library.stopSync()
  auth.cleanup()
})

watch(
  [() => auth.initialized, () => auth.uid, () => auth.isLocalMode],
  ([ready, uid, localMode]) => {
    if (!ready) return
    if (uid) {
      library.startSync(uid, !localMode, auth.displayName, auth.email)
    } else {
      library.stopSync()
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="app-frame">
    <div v-if="!auth.initialized" class="splash">
      <span class="splash-word">FOLIO</span>
    </div>

    <AuthView v-else-if="!auth.isAuthenticated" />

    <template v-else>
      <router-view />
      <BottomNav />
      <QuickAddSheet />
      <ReadingTimerModal />
    </template>

    <Transition name="fade">
      <div v-if="ui.toastMessage" class="toast-banner">
        {{ ui.toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.splash {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.splash-word {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0.24em;
  color: var(--accent);
}

.toast-banner {
  position: fixed;
  top: calc(16px + var(--safe-top));
  left: 50%;
  transform: translateX(-50%);
  max-width: 90vw;
  background: #221d1d;
  color: var(--text-primary);
  border: 1px solid var(--accent-border);
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.55);
  z-index: 200;
  text-align: center;
}
</style>
