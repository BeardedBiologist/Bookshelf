export type BookStatus = 'reading' | 'tbr' | 'finished' | 'dnf' | 'wishlist'

export type BookOwnership = 'owned' | 'wishlist' | 'borrowed' | 'library' | 'kindle-unlimited'

export type BookFormat = 'Paperback' | 'Hardcover' | 'eBook' | 'Audiobook'

export type AccentTheme = 'rose-gold' | 'sage' | 'lavender' | 'amber'

export type ShelfStyle = 'walnut' | 'oak' | 'espresso' | 'minimal'

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  theme: AccentTheme
  shelfStyle: ShelfStyle
  showSpiceRating: boolean
  dailyPageGoal: number
  yearlyBookGoal: number
  createdAt: number
  updatedAt: number
}

export interface Book {
  id: string
  title: string
  author: string
  coverUrl: string
  isbn: string
  format: BookFormat
  totalPages: number
  currentPage: number
  status: BookStatus
  ownership: BookOwnership
  rating: number // 0 - 5 in 0.5 increments
  spice: number // 0 - 5 integers
  isFavorite: boolean
  blurb: string
  genres: string[]
  moods: string[]
  tropes: string[]
  review: string
  seriesId: string | null
  seriesOrder: number | null
  releaseDate: string | null // YYYY-MM-DD
  startedAt: string | null // YYYY-MM-DD
  finishedAt: string | null // YYYY-MM-DD
  createdAt: number
  updatedAt: number
}

export interface BookSeries {
  id: string
  name: string
  author: string
  totalBooks: number | null
  notes: string
  createdAt: number
  updatedAt: number
}

export interface ReadingSession {
  id: string
  bookId: string
  bookTitle: string
  bookCoverUrl: string
  date: string // YYYY-MM-DD local date
  startPage: number
  endPage: number
  pagesRead: number
  durationSeconds: number
  startedAt: number
  endedAt: number
}

export interface SavedQuote {
  id: string
  bookId: string | null
  bookTitle: string
  bookAuthor: string
  bookCoverUrl: string
  text: string
  page: number | null
  isFavorite: boolean
  createdAt: number
  updatedAt: number
}

export interface BookSearchResult {
  key: string
  title: string
  author: string
  coverUrl: string
  isbn: string
  totalPages: number
  blurb: string
  genres: string[]
  releaseDate: string | null
  source: 'openlibrary' | 'googlebooks'
}

export type StatsRange = 'day' | 'week' | 'month'
