import type { Book, BookSeries, BookStatus, ReadingSession, SavedQuote } from '@/types/models'

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function cleanIsbn(raw?: string): string {
  if (!raw) return ''
  return raw.replace(/^="?|"?$/g, '').replace(/[^0-9Xx]/g, '')
}

function mapGoodreadsShelf(shelf?: string): BookStatus {
  const s = (shelf || '').toLowerCase().trim()
  if (s === 'currently-reading' || s === 'reading') return 'reading'
  if (s === 'read' || s === 'finished') return 'finished'
  if (s === 'dnf' || s === 'did-not-finish') return 'dnf'
  if (s === 'wishlist' || s === 'to-buy') return 'wishlist'
  return 'tbr'
}

function parseDateValue(raw?: string): string | null {
  if (!raw || !raw.trim()) return null
  const normalized = raw.trim().replace(/\//g, '-')
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return null
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

export function parseGoodreadsCsv(csvText: string): Array<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>> {
  const lines = csvText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0)

  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const idx = (name: string) => headers.findIndex((h) => h === name || h.includes(name))

  const titleIdx = idx('title')
  const authorIdx = idx('author')
  const isbn13Idx = idx('isbn13')
  const isbnIdx = idx('isbn')
  const ratingIdx = idx('my rating') !== -1 ? idx('my rating') : idx('rating')
  const pagesIdx = idx('number of pages') !== -1 ? idx('number of pages') : idx('pages')
  const shelfIdx = idx('exclusive shelf') !== -1 ? idx('exclusive shelf') : idx('status')
  const dateReadIdx = idx('date read')
  const reviewIdx = idx('my review') !== -1 ? idx('my review') : idx('review')
  const bindingIdx = idx('binding')

  if (titleIdx === -1) return []

  const imported: Array<Omit<Book, 'id' | 'createdAt' | 'updatedAt'>> = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const title = cols[titleIdx]?.trim()
    if (!title) continue

    const author = (authorIdx !== -1 ? cols[authorIdx] : '') || 'Unknown Author'
    const isbn = cleanIsbn(isbn13Idx !== -1 ? cols[isbn13Idx] : '') || cleanIsbn(isbnIdx !== -1 ? cols[isbnIdx] : '')
    const status = mapGoodreadsShelf(shelfIdx !== -1 ? cols[shelfIdx] : 'tbr')
    const totalPages = Math.max(1, parseInt(pagesIdx !== -1 ? cols[pagesIdx] : '300', 10) || 300)
    const ratingRaw = parseFloat(ratingIdx !== -1 ? cols[ratingIdx] : '0') || 0
    const rating = Math.min(5, Math.max(0, Math.round(ratingRaw * 2) / 2))
    const finishedAt = status === 'finished' ? parseDateValue(dateReadIdx !== -1 ? cols[dateReadIdx] : '') : null
    const binding = (bindingIdx !== -1 ? cols[bindingIdx] : '').toLowerCase()
    const format = binding.includes('hard')
      ? 'Hardcover'
      : binding.includes('kindle') || binding.includes('ebook')
        ? 'eBook'
        : binding.includes('audio')
          ? 'Audiobook'
          : 'Paperback'

    imported.push({
      title,
      author,
      coverUrl: isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : '',
      isbn,
      format,
      totalPages,
      currentPage: status === 'finished' ? totalPages : 0,
      status,
      ownership: status === 'wishlist' ? 'wishlist' : 'owned',
      rating,
      spice: 0,
      isFavorite: rating >= 5,
      blurb: '',
      genres: [],
      moods: [],
      tropes: [],
      review: reviewIdx !== -1 ? cols[reviewIdx] || '' : '',
      seriesId: null,
      seriesOrder: null,
      releaseDate: null,
      startedAt: null,
      finishedAt,
    })
  }

  return imported
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = value == null ? '' : String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportBooksToCsv(books: Book[]): string {
  const headers = [
    'Title',
    'Author',
    'ISBN13',
    'Format',
    'Number of Pages',
    'Current Page',
    'Exclusive Shelf',
    'Ownership',
    'My Rating',
    'Spice',
    'Genres',
    'Moods',
    'Tropes',
    'Release Date',
    'Date Started',
    'Date Read',
    'My Review',
  ]

  const rows = books.map((b) =>
    [
      b.title,
      b.author,
      b.isbn,
      b.format,
      b.totalPages,
      b.currentPage,
      b.status,
      b.ownership,
      b.rating,
      b.spice,
      b.genres.join('; '),
      b.moods.join('; '),
      b.tropes.join('; '),
      b.releaseDate || '',
      b.startedAt || '',
      b.finishedAt || '',
      b.review,
    ]
      .map(escapeCsvCell)
      .join(','),
  )

  return [headers.join(','), ...rows].join('\n')
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export interface FullBackupPayload {
  version: 1
  exportedAt: string
  books: Book[]
  series: BookSeries[]
  sessions: ReadingSession[]
  quotes: SavedQuote[]
}
