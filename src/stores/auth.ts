import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '@/services/firebase'

const LOCAL_MODE_KEY = 'folio_local_preview_mode'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const initialized = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const isLocalMode = ref<boolean>(localStorage.getItem(LOCAL_MODE_KEY) === 'true')

  const isAuthenticated = computed(() => Boolean(user.value) || isLocalMode.value)
  const uid = computed(() => user.value?.uid || (isLocalMode.value ? 'local-reader' : null))
  const displayName = computed(
    () => user.value?.displayName || user.value?.email?.split('@')[0] || 'Reader',
  )
  const email = computed(() => user.value?.email || (isLocalMode.value ? 'Offline local mode' : ''))
  const photoURL = computed(() => user.value?.photoURL || '')

  let unsubAuth: (() => void) | null = null

  function init(): Promise<void> {
    if (initialized.value) return Promise.resolve()

    if (!isFirebaseConfigured || !auth) {
      isLocalMode.value = true
      initialized.value = true
      return Promise.resolve()
    }

    // Complete any pending redirect sign-in (important for iOS standalone PWA)
    getRedirectResult(auth).catch((err: any) => {
      if (err?.code) {
        error.value = friendlyAuthError(err.code, err.message)
      }
    })

    return new Promise((resolve) => {
      unsubAuth = onAuthStateChanged(auth!, (firebaseUser) => {
        user.value = firebaseUser
        if (firebaseUser) {
          isLocalMode.value = false
          localStorage.removeItem(LOCAL_MODE_KEY)
        }
        if (!initialized.value) {
          initialized.value = true
          resolve()
        }
      })
    })
  }

  async function signInWithGoogle() {
    if (!auth) {
      error.value = 'Firebase is not configured yet.'
      return false
    }
    loading.value = true
    error.value = null
    try {
      const isIosStandalone =
        typeof window !== 'undefined' &&
        Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)

      if (isIosStandalone) {
        await signInWithRedirect(auth, googleProvider)
        return true
      }

      await signInWithPopup(auth, googleProvider)
      return true
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment') {
        try {
          await signInWithRedirect(auth, googleProvider)
          return true
        } catch (redirErr: any) {
          error.value = friendlyAuthError(redirErr?.code, redirErr?.message)
          return false
        }
      }
      error.value = friendlyAuthError(err?.code, err?.message)
      return false
    } finally {
      loading.value = false
    }
  }

  async function signInWithEmail(emailInput: string, passwordInput: string) {
    if (!auth) {
      error.value = 'Firebase is not configured yet.'
      return false
    }
    loading.value = true
    error.value = null
    try {
      await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput)
      return true
    } catch (err: any) {
      error.value = friendlyAuthError(err?.code, err?.message)
      return false
    } finally {
      loading.value = false
    }
  }

  async function registerWithEmail(nameInput: string, emailInput: string, passwordInput: string) {
    if (!auth) {
      error.value = 'Firebase is not configured yet.'
      return false
    }
    loading.value = true
    error.value = null
    try {
      const cred = await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput)
      if (nameInput.trim()) {
        await updateProfile(cred.user, { displayName: nameInput.trim() })
      }
      return true
    } catch (err: any) {
      error.value = friendlyAuthError(err?.code, err?.message)
      return false
    } finally {
      loading.value = false
    }
  }

  function enterLocalPreview() {
    isLocalMode.value = true
    localStorage.setItem(LOCAL_MODE_KEY, 'true')
    error.value = null
  }

  async function logout() {
    error.value = null
    if (isLocalMode.value) {
      isLocalMode.value = false
      localStorage.removeItem(LOCAL_MODE_KEY)
      return
    }
    if (auth) {
      await signOut(auth)
    }
  }

  function cleanup() {
    if (unsubAuth) {
      unsubAuth()
      unsubAuth = null
    }
  }

  return {
    user,
    initialized,
    loading,
    error,
    isLocalMode,
    isFirebaseConfigured,
    isAuthenticated,
    uid,
    displayName,
    email,
    photoURL,
    init,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    enterLocalPreview,
    logout,
    cleanup,
  }
})

function friendlyAuthError(code?: string, fallback?: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please try again.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.'
    case 'auth/weak-password':
      return 'Please choose a password with at least 6 characters.'
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before finishing.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase Authentication settings.'
    default:
      return fallback || 'Authentication failed. Please try again.'
  }
}
