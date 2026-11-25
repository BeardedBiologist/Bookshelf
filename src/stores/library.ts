import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/services/firebase'
import { computeStreaks, toLocalDateKey } from '@/utils/dates'
import { buildSampleDataset } from '@/utils/sampleData'
import type {
  AccentTheme,
  Book,
  BookSeries,
  ReadingSession,
  SavedQuote,
  ShelfStyle,
  UserProfile,
} from '@/types/models'

const LOCAL_STORAGE_KEY = 'folio_local_library_v1'

interface LocalPayload {
  profile: UserProfile
  books: Book[]
  series: BookSeries[]
  sessions: ReadingSession[]
  quotes: SavedQuote[]
}

function defaultProfile(uid: string, displayName = 'Reader', email = ''): UserProfile {
  const now = Date.now()
  return {
    uid,
    displayName,
    email,
    theme: 'rose-gold',
    shelfStyle: 'walnut',
    showSpiceRating: true,
    dailyPageGoal: 20,
    yearlyBookGoal: 50,
    createdAt: now,
    updatedAt: now,
  }
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export const useLibraryStore = defineStore('library', () => {
  const profile = ref<UserProfile>(defaultProfile('local-reader'))
  const books = ref<Book[]>([])
  const series = ref<BookSeries[]>([])
  const sessions = ref<ReadingSession[]>([])
  const quotes = ref<SavedQuote[]>([])
  const loading = ref(false)
  const activeUid = ref<string | null>(null)
  const useCloud = ref(false)

  let unsubs: Unsubscribe[] = []

  // Derived selectors
  const currentlyReading = computed(() =>
    books.value
      .filter((b) => b.status === 'reading')
      .sort((a, b) => b.updatedAt - a.updatedAt),
  )

  const primaryReadingBook = computed(() => currentlyReading.value[0] || null)

  const alsoReadingBooks = computed(() => currentlyReading.value.slice(1))

  const upcomingReleases = computed(() => {
    const todayKey = toLocalDateKey(new Date())
    return books.value
      .filter((b) => b.releaseDate && b.releaseDate >= todayKey && (b.status === 'wishlist' || b.status === 'tbr'))
      .sort((a, b) => (a.releaseDate || '').localeCompare(b.releaseDate || ''))
  })

  const finishedBooks = computed(() => books.value.filter((b) => b.status === 'finished'))

  const booksReadThisYear = computed(() => {
    const yearPrefix = `${new Date().getFullYear()}-`
    return finishedBooks.value.filter((b) =>
      b.finishedAt ? b.finishedAt.startsWith(yearPrefix) : new Date(b.updatedAt).getFullYear() === new Date().getFullYear(),
    )
  })

  const totalPagesReadThisYear = computed(() => {
    const yearPrefix = `${new Date().getFullYear()}-`
    const fromSessions = sessions.value
      .filter((s) => s.date.startsWith(yearPrefix))
      .reduce((sum, s) => sum + (s.pagesRead || 0), 0)
    return fromSessions
  })

  const streakInfo = computed(() => computeStreaks(sessions.value))

  const avgDaysToFinish = computed(() => {
    const durations: number[] = []
    for (const b of finishedBooks.value) {
      if (b.startedAt && b.finishedAt) {
        const start = new Date(b.startedAt).getTime()
        const end = new Date(b.finishedAt).getTime()
        if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
          durations.push(Math.max(1, Math.round((end - start) / 86400000)))
        }
      }
    }
    if (!durations.length) return 0
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
  })

  const readingPacePagesPerHour = computed(() => {
    let totalPages = 0
    let totalSeconds = 0
    for (const s of sessions.value) {
      if (s.pagesRead > 0 && s.durationSeconds > 60) {
        totalPages += s.pagesRead
        totalSeconds += s.durationSeconds
      }
    }
    if (totalSeconds === 0) return 0
    return Math.round((totalPages / totalSeconds) * 3600)
  })

  function persistLocal() {
    if (useCloud.value) return
    const payload: LocalPayload = {
      profile: profile.value,
      books: books.value,
      series: series.value,
      sessions: sessions.value,
      quotes: quotes.value,
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload))
  }

  function applyTheme(theme: AccentTheme) {
    document.documentElement.setAttribute('data-theme', theme)
  }

  function stopSync() {
    unsubs.forEach((fn) => fn())
    unsubs = []
  }

  function startSync(uid: string, cloudEnabled: boolean, userDisplayName?: string, userEmail?: string) {
    stopSync()
    activeUid.value = uid
    useCloud.value = cloudEnabled && isFirebaseConfigured && Boolean(db)

    if (!useCloud.value) {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as LocalPayload
          profile.value = { ...defaultProfile(uid, userDisplayName, userEmail), ...parsed.profile }
          books.value = parsed.books || []
          series.value = parsed.series || []
          sessions.value = parsed.sessions || []
          quotes.value = parsed.quotes || []
          applyTheme(profile.value.theme)
          return
        } catch {
          // fallback to sample data
        }
      }
      const sample = buildSampleDataset()
      profile.value = defaultProfile(uid, userDisplayName || 'Reader', userEmail || '')
      books.value = sample.books
      series.value = sample.series
      sessions.value = sample.sessions
      quotes.value = sample.quotes
      applyTheme(profile.value.theme)
      persistLocal()
      return
    }

    // Cloud real-time Firestore listeners (strictly scoped to users/{uid})
    loading.value = true
    const database = db!
    const userDocRef = doc(database, 'users', uid)

    unsubs.push(
      onSnapshot(userDocRef, (snap) => {
        if (snap.exists()) {
          profile.value = { ...defaultProfile(uid, userDisplayName, userEmail), ...(snap.data() as Partial<UserProfile>) }
          applyTheme(profile.value.theme)
        } else {
          const initProfile = defaultProfile(uid, userDisplayName, userEmail)
          profile.value = initProfile
          applyTheme(initProfile.theme)
          setDoc(userDocRef, initProfile, { merge: true }).catch(() => {})
        }
      }),
    )

    unsubs.push(
      onSnapshot(collection(database, 'users', uid, 'books'), (snap) => {
        books.value = snap.docs
          .map((d) => ({ ...(d.data() as Omit<Book, 'id'>), id: d.id }))
          .sort((a, b) => b.updatedAt - a.updatedAt)
        loading.value = false
      }),
    )

    unsubs.push(
      onSnapshot(collection(database, 'users', uid, 'series'), (snap) => {
        series.value = snap.docs
          .map((d) => ({ ...(d.data() as Omit<BookSeries, 'id'>), id: d.id }))
          .sort((a, b) => a.name.localeCompare(b.name))
      }),
    )

    unsubs.push(
      onSnapshot(collection(database, 'users', uid, 'sessions'), (snap) => {
        sessions.value = snap.docs
          .map((d) => ({ ...(d.data() as Omit<ReadingSession, 'id'>), id: d.id }))
          .sort((a, b) => b.endedAt - a.endedAt)
      }),
    )

    unsubs.push(
      onSnapshot(collection(database, 'users', uid, 'quotes'), (snap) => {
        quotes.value = snap.docs
          .map((d) => ({ ...(d.data() as Omit<SavedQuote, 'id'>), id: d.id }))
          .sort((a, b) => b.createdAt - a.createdAt)
      }),
    )
  }

  // Profile & preferences
  async function updatePreferences(partial: Partial<UserProfile>) {
    const updated: UserProfile = {
      ...profile.value,
      ...partial,
      updatedAt: Date.now(),
    }
    profile.value = updated
    if (partial.theme) applyTheme(partial.theme)

    if (useCloud.value && db && activeUid.value) {
      await setDoc(doc(db, 'users', activeUid.value), updated, { merge: true })
    } else {
      persistLocal()
    }
  }

  async function setTheme(theme: AccentTheme) {
    await updatePreferences({ theme })
  }

  async function setShelfStyle(shelfStyle: ShelfStyle) {
    await updatePreferences({ shelfStyle })
  }

  // Books CRUD
  function getBookById(id: string): Book | undefined {
    return books.value.find((b) => b.id === id)
  }

  async function addBook(data: Omit<Book, 'id' | 'createdAt' | 'updatedAt'>): Promise<Book> {
    const now = Date.now()
    const newBook: Book = {
      ...data,
      id: generateId('book'),
      createdAt: now,
      updatedAt: now,
    }
    if (useCloud.value && db && activeUid.value) {
      const { id, ...docBody } = newBook
      await setDoc(doc(db, 'users', activeUid.value, 'books', id), docBody)
    } else {
      books.value = [newBook, ...books.value]
      persistLocal()
    }
    return newBook
  }

  async function updateBook(bookId: string, patch: Partial<Omit<Book, 'id'>>) {
    const updatedFields = { ...patch, updatedAt: Date.now() }
    if (useCloud.value && db && activeUid.value) {
      await updateDoc(doc(db, 'users', activeUid.value, 'books', bookId), updatedFields)
    } else {
      books.value = books.value.map((b) => (b.id === bookId ? { ...b, ...updatedFields } : b))
      persistLocal()
    }
  }

  async function deleteBook(bookId: string) {
    if (useCloud.value && db && activeUid.value) {
      await deleteDoc(doc(db, 'users', activeUid.value, 'books', bookId))
    } else {
      books.value = books.value.filter((b) => b.id !== bookId)
      persistLocal()
    }
  }

  async function logReadingProgress(
    bookId: string,
    newPage: number,
    durationSeconds = 0,
    customDate?: string,
  ) {
    const book = getBookById(bookId)
    if (!book) return
    const clampedPage = Math.max(0, Math.min(book.totalPages || newPage, Math.round(newPage)))
    const delta = Math.max(0, clampedPage - book.currentPage)
    const todayKey = customDate || toLocalDateKey(new Date())
    const isNowFinished = book.totalPages > 0 && clampedPage >= book.totalPages

    const patch: Partial<Book> = {
      currentPage: clampedPage,
      status: isNowFinished ? 'finished' : book.status === 'tbr' || book.status === 'wishlist' ? 'reading' : book.status,
      startedAt: book.startedAt || todayKey,
      finishedAt: isNowFinished ? book.finishedAt || todayKey : book.finishedAt,
    }

    await updateBook(bookId, patch)

    if (delta > 0 || durationSeconds >= 30) {
      const now = Date.now()
      await addSession({
        bookId: book.id,
        bookTitle: book.title,
        bookCoverUrl: book.coverUrl,
        date: todayKey,
        startPage: book.currentPage,
        endPage: clampedPage,
        pagesRead: delta,
        durationSeconds,
        startedAt: now - durationSeconds * 1000,
        endedAt: now,
      })
    }
  }

  async function markBookFinished(bookId: string) {
    const book = getBookById(bookId)
    if (!book) return
    const todayKey = toLocalDateKey(new Date())
    const delta = Math.max(0, book.totalPages - book.currentPage)
    await updateBook(bookId, {
      status: 'finished',
      currentPage: book.totalPages,
      startedAt: book.startedAt || todayKey,
      finishedAt: todayKey,
    })
    if (delta > 0) {
      const now = Date.now()
      await addSession({
        bookId: book.id,
        bookTitle: book.title,
        bookCoverUrl: book.coverUrl,
        date: todayKey,
        startPage: book.currentPage,
        endPage: book.totalPages,
        pagesRead: delta,
        durationSeconds: Math.round((delta / 45) * 3600),
        startedAt: now - 1800000,
        endedAt: now,
      })
    }
  }

  // Series CRUD
  async function addSeries(name: string, author = '', totalBooks: number | null = null): Promise<BookSeries> {
    const now = Date.now()
    const item: BookSeries = {
      id: generateId('series'),
      name: name.trim(),
      author: author.trim(),
      totalBooks,
      notes: '',
      createdAt: now,
      updatedAt: now,
    }
    if (useCloud.value && db && activeUid.value) {
      const { id, ...docBody } = item
      await setDoc(doc(db, 'users', activeUid.value, 'series', id), docBody)
    } else {
      series.value = [...series.value, item].sort((a, b) => a.name.localeCompare(b.name))
      persistLocal()
    }
    return item
  }

  async function updateSeries(seriesId: string, patch: Partial<Omit<BookSeries, 'id'>>) {
    const updated = { ...patch, updatedAt: Date.now() }
    if (useCloud.value && db && activeUid.value) {
      await updateDoc(doc(db, 'users', activeUid.value, 'series', seriesId), updated)
    } else {
      series.value = series.value.map((s) => (s.id === seriesId ? { ...s, ...updated } : s))
      persistLocal()
    }
  }

  async function deleteSeries(seriesId: string) {
    // Unlink books in this series
    const linkedBooks = books.value.filter((b) => b.seriesId === seriesId)
    for (const b of linkedBooks) {
      await updateBook(b.id, { seriesId: null, seriesOrder: null })
    }
    if (useCloud.value && db && activeUid.value) {
      await deleteDoc(doc(db, 'users', activeUid.value, 'series', seriesId))
    } else {
      series.value = series.value.filter((s) => s.id !== seriesId)
      persistLocal()
    }
  }

  // Sessions CRUD
  async function addSession(data: Omit<ReadingSession, 'id'>): Promise<ReadingSession> {
    const session: ReadingSession = {
      ...data,
      id: generateId('session'),
    }
    if (useCloud.value && db && activeUid.value) {
      const { id, ...docBody } = session
      await setDoc(doc(db, 'users', activeUid.value, 'sessions', id), docBody)
    } else {
      sessions.value = [session, ...sessions.value]
      persistLocal()
    }
    return session
  }

  async function deleteSession(sessionId: string) {
    if (useCloud.value && db && activeUid.value) {
      await deleteDoc(doc(db, 'users', activeUid.value, 'sessions', sessionId))
    } else {
      sessions.value = sessions.value.filter((s) => s.id !== sessionId)
      persistLocal()
    }
  }

  // Quotes CRUD
  async function addQuote(data: Omit<SavedQuote, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedQuote> {
    const now = Date.now()
    const quote: SavedQuote = {
      ...data,
      id: generateId('quote'),
      createdAt: now,
      updatedAt: now,
    }
    if (useCloud.value && db && activeUid.value) {
      const { id, ...docBody } = quote
      await setDoc(doc(db, 'users', activeUid.value, 'quotes', id), docBody)
    } else {
      quotes.value = [quote, ...quotes.value]
      persistLocal()
    }
    return quote
  }

  async function updateQuote(quoteId: string, patch: Partial<Omit<SavedQuote, 'id'>>) {
    const updated = { ...patch, updatedAt: Date.now() }
    if (useCloud.value && db && activeUid.value) {
      await updateDoc(doc(db, 'users', activeUid.value, 'quotes', quoteId), updated)
    } else {
      quotes.value = quotes.value.map((q) => (q.id === quoteId ? { ...q, ...updated } : q))
      persistLocal()
    }
  }

  async function deleteQuote(quoteId: string) {
    if (useCloud.value && db && activeUid.value) {
      await deleteDoc(doc(db, 'users', activeUid.value, 'quotes', quoteId))
    } else {
      quotes.value = quotes.value.filter((q) => q.id !== quoteId)
      persistLocal()
    }
  }

  // Bulk import & sample data helpers
  async function importBooksBulk(items: Array<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> {
    const now = Date.now()
    const created: Book[] = items.map((item, idx) => ({
      ...item,
      id: generateId(`imp${idx}`),
      createdAt: now + idx,
      updatedAt: now + idx,
    }))

    if (useCloud.value && db && activeUid.value) {
      const database = db
      const uid = activeUid.value
      const chunkSize = 400
      for (let i = 0; i < created.length; i += chunkSize) {
        const batch = writeBatch(database)
        for (const item of created.slice(i, i + chunkSize)) {
          const { id, ...body } = item
          batch.set(doc(database, 'users', uid, 'books', id), body)
        }
        await batch.commit()
      }
    } else {
      books.value = [...created, ...books.value]
      persistLocal()
    }
    return created.length
  }

  async function loadSampleLibrary() {
    const sample = buildSampleDataset()
    if (useCloud.value && db && activeUid.value) {
      const database = db
      const uid = activeUid.value
      const batch = writeBatch(database)
      for (const s of sample.series) {
        const { id, ...body } = s
        batch.set(doc(database, 'users', uid, 'series', id), body)
      }
      for (const b of sample.books) {
        const { id, ...body } = b
        batch.set(doc(database, 'users', uid, 'books', id), body)
      }
      for (const sess of sample.sessions) {
        const { id, ...body } = sess
        batch.set(doc(database, 'users', uid, 'sessions', id), body)
      }
      for (const q of sample.quotes) {
        const { id, ...body } = q
        batch.set(doc(database, 'users', uid, 'quotes', id), body)
      }
      await batch.commit()
    } else {
      books.value = sample.books
      series.value = sample.series
      sessions.value = sample.sessions
      quotes.value = sample.quotes
      persistLocal()
    }
  }

  return {
    profile,
    books,
    series,
    sessions,
    quotes,
    loading,
    useCloud,
    currentlyReading,
    primaryReadingBook,
    alsoReadingBooks,
    upcomingReleases,
    finishedBooks,
    booksReadThisYear,
    totalPagesReadThisYear,
    streakInfo,
    avgDaysToFinish,
    readingPacePagesPerHour,
    startSync,
    stopSync,
    updatePreferences,
    setTheme,
    setShelfStyle,
    getBookById,
    addBook,
    updateBook,
    deleteBook,
    logReadingProgress,
    markBookFinished,
    addSeries,
    updateSeries,
    deleteSeries,
    addSession,
    deleteSession,
    addQuote,
    updateQuote,
    deleteQuote,
    importBooksBulk,
    loadSampleLibrary,
  }
})
