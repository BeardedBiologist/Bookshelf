import type { BookSearchResult } from '@/types/models'

function normalizeCoverUrl(url?: string): string {
  if (!url) return ''
  return url.replace(/^http:\/\//i, 'https://').replace('&edge=curl', '')
}

function normalizeReleaseDate(raw?: string | number): string | null {
  if (!raw) return null
  const str = String(raw).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  if (/^\d{4}-\d{2}$/.test(str)) return `${str}-01`
  if (/^\d{4}$/.test(str)) return `${str}-01-01`
  const parsed = new Date(str)
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const d = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return null
}

async function searchGoogleBooks(query: string): Promise<BookSearchResult[]> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&printType=books`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data.items)) return []

    return data.items.map((item: any): BookSearchResult => {
      const info = item.volumeInfo || {}
      const identifiers: Array<{ type: string; identifier: string }> = info.industryIdentifiers || []
      const isbn13 = identifiers.find((i) => i.type === 'ISBN_13')?.identifier
      const isbn10 = identifiers.find((i) => i.type === 'ISBN_10')?.identifier
      const thumb =
        info.imageLinks?.large ||
        info.imageLinks?.medium ||
        info.imageLinks?.thumbnail ||
        info.imageLinks?.smallThumbnail ||
        ''

      return {
        key: `gb-${item.id}`,
        title: String(info.title || 'Untitled').slice(0, 280),
        author: (Array.isArray(info.authors) ? info.authors.join(', ') : 'Unknown Author').slice(0, 280),
        coverUrl: normalizeCoverUrl(thumb).slice(0, 2000),
        isbn: (isbn13 || isbn10 || '').slice(0, 36),
        totalPages: Math.min(50000, Math.max(1, Number(info.pageCount) || 320)),
        blurb: (typeof info.description === 'string' ? info.description.replace(/<[^>]+>/g, '') : '').slice(0, 9500),
        genres: Array.isArray(info.categories)
          ? info.categories
              .flatMap((c: string) => c.split('/').map((s) => s.trim()))
              .filter(Boolean)
              .slice(0, 3)
          : [],
        releaseDate: normalizeReleaseDate(info.publishedDate),
        source: 'googlebooks',
      }
    })
  } catch {
    return []
  }
}

async function searchOpenLibrary(query: string): Promise<BookSearchResult[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,isbn,number_of_pages_median,first_publish_year,subject,first_sentence`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data.docs)) return []

    return data.docs.map((doc: any): BookSearchResult => {
      const coverUrl = doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : ''
      const isbn = Array.isArray(doc.isbn)
        ? doc.isbn.find((i: string) => i.length === 13) || doc.isbn[0] || ''
        : ''
      const sentence = Array.isArray(doc.first_sentence)
        ? doc.first_sentence[0]
        : typeof doc.first_sentence === 'string'
          ? doc.first_sentence
          : ''

      return {
        key: `ol-${doc.key || Math.random()}`,
        title: doc.title || 'Untitled',
        author: Array.isArray(doc.author_name) ? doc.author_name.join(', ') : 'Unknown Author',
        coverUrl,
        isbn,
        totalPages: Number(doc.number_of_pages_median) || 320,
        blurb: sentence || '',
        genres: Array.isArray(doc.subject)
          ? doc.subject.filter((s: string) => s.length < 24).slice(0, 3)
          : [],
        releaseDate: normalizeReleaseDate(doc.first_publish_year),
        source: 'openlibrary',
      }
    })
  } catch {
    return []
  }
}

export async function searchBooksOnline(query: string): Promise<BookSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  const [gbResults, olResults] = await Promise.all([
    searchGoogleBooks(trimmed),
    searchOpenLibrary(trimmed),
  ])

  const combined = [...gbResults, ...olResults]
  const seen = new Set<string>()
  const deduped: BookSearchResult[] = []

  for (const item of combined) {
    const fingerprint = `${item.title.toLowerCase().trim()}::${item.author.toLowerCase().split(',')[0]?.trim()}`
    if (seen.has(fingerprint)) continue
    seen.add(fingerprint)
    deduped.push(item)
  }

  return deduped.sort((a, b) => Number(Boolean(b.coverUrl)) - Number(Boolean(a.coverUrl))).slice(0, 14)
}
