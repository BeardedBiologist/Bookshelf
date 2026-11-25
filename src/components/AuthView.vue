<script setup lang="ts">
import { ref } from 'vue'
import { BookOpen, Mail, Sparkles } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const isRegister = ref(false)
const name = ref('')
const email = ref('')
const password = ref('')

async function handleEmailSubmit() {
  if (isRegister.value) {
    await auth.registerWithEmail(name.value, email.value, password.value)
  } else {
    await auth.signInWithEmail(email.value, password.value)
  }
}
</script>

<template>
  <div class="auth-wrap">
    <div class="auth-card card-glow">
      <div class="brand-mark">
        <BookOpen :size="28" />
      </div>
      <h1 class="brand-title">FOLIO</h1>
      <p class="brand-sub">Your personal library, reading timer, series tracker, stats, and favorite quotes.</p>

      <button
        v-if="auth.isFirebaseConfigured"
        type="button"
        class="btn btn-cream full"
        :disabled="auth.loading"
        @click="auth.signInWithGoogle()"
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z"/>
          <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.2 0-5.9-2.1-6.8-5H1.2v3.1C3.2 21.3 7.3 24 12 24z"/>
          <path fill="#FBBC05" d="M5.2 14.2c-.3-.7-.4-1.5-.4-2.2s.1-1.5.4-2.2V6.7H1.2C.4 8.3 0 10.1 0 12s.4 3.7 1.2 5.3l4-3.1z"/>
          <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4C18 1.2 15.2 0 12 0 7.3 0 3.2 2.7 1.2 6.7l4 3.1c.9-2.9 3.6-5 6.8-5z"/>
        </svg>
        Continue with Google
      </button>

      <div v-if="auth.isFirebaseConfigured" class="or-sep"><span>or with email</span></div>

      <form v-if="auth.isFirebaseConfigured" class="auth-form" @submit.prevent="handleEmailSubmit">
        <input
          v-if="isRegister"
          v-model="name"
          type="text"
          class="input"
          placeholder="Your name"
          autocomplete="name"
        />
        <input
          v-model="email"
          type="email"
          class="input"
          placeholder="Email address"
          autocomplete="email"
          required
        />
        <input
          v-model="password"
          type="password"
          class="input"
          placeholder="Password"
          autocomplete="current-password"
          required
          minlength="6"
        />

        <p v-if="auth.error" class="auth-error">{{ auth.error }}</p>

        <button type="submit" class="btn btn-accent full" :disabled="auth.loading">
          <Mail :size="16" />
          {{ isRegister ? 'Create private library' : 'Sign in' }}
        </button>

        <button type="button" class="toggle-mode" @click="isRegister = !isRegister">
          {{ isRegister ? 'Already have an account? Sign in' : 'New here? Create an account' }}
        </button>
      </form>

      <button type="button" class="btn btn-surface full preview-btn" @click="auth.enterLocalPreview()">
        <Sparkles :size="15" />
        Explore local preview mode
      </button>
    </div>
  </div>
</template>

<style scoped>
.auth-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(24px + var(--safe-top)) 20px calc(24px + var(--safe-bottom));
}

.auth-card {
  width: 100%;
  padding: 28px 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.brand-mark {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  background: var(--accent-soft);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.brand-title {
  margin: 0;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.brand-sub {
  margin: 8px 0 22px;
  font-size: 13.5px;
  color: var(--text-secondary);
  max-width: 280px;
}

.full {
  width: 100%;
}

.or-sep {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 0;
  font-size: 12px;
  color: var(--text-muted);
}

.or-sep::before,
.or-sep::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-subtle);
}

.auth-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.auth-error {
  margin: 2px 0;
  font-size: 12.5px;
  color: #f08a7e;
}

.toggle-mode {
  margin-top: 6px;
  font-size: 13px;
  color: var(--accent);
}

.preview-btn {
  margin-top: 14px;
}
</style>
