import type { Book, BookSeries, ReadingSession, SavedQuote } from '@/types/models'
import { toLocalDateKey } from './dates'

// Creates an original & classic public-domain starter kit so users can explore
// every screen (Today, Series, Calendar, Stats, Quotes, Upcoming) immediately.
function makeSvgCover(title: string, author: string, bg1: string, bg2: string, accent: string): string {
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const safeAuthor = author.replace(/&/g, '&amp;').replace(/</g, '&lt;')
  const words = safeTitle.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 14 && line) {
      lines.push(line)
      line = w
    } else {
      line = (line + ' ' + w).trim()
    }
  }
  if (line) lines.push(line)

  const titleSvg = lines
    .slice(0, 4)
    .map(
      (l, i) =>
        `<text x="150" y="${155 + i * 38}" text-anchor="middle" fill="#F8F3EE" font-family="Georgia,serif" font-size="30" font-weight="700">${l}</text>`,
    )
    .join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="300" height="450" fill="url(#g)"/>
    <rect x="18" y="18" width="264" height="414" fill="none" stroke="${accent}" stroke-opacity="0.55" stroke-width="2"/>
    <circle cx="150" cy="82" r="26" fill="none" stroke="${accent}" stroke-width="2.5" stroke-opacity="0.8"/>
    <circle cx="150" cy="82" r="8" fill="${accent}" fill-opacity="0.85"/>
    ${titleSvg}
    <line x1="90" y1="348" x2="210" y2="348" stroke="${accent}" stroke-opacity="0.6" stroke-width="1.5"/>
    <text x="150" y="388" text-anchor="middle" fill="${accent}" font-family="sans-serif" font-size="16" letter-spacing="2" font-weight="600">${safeAuthor.toUpperCase()}</text>
  </svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

export function buildSampleDataset(): {
  books: Book[]
  series: BookSeries[]
  sessions: ReadingSession[]
  quotes: SavedQuote[]
} {
  const now = Date.now()
  const today = new Date()
  const daysAgo = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() - n)
    return toLocalDateKey(d)
  }
  const daysFromNow = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return toLocalDateKey(d)
  }

  const series: BookSeries[] = [
    {
      id: 'series-starlight',
      name: 'The Starlight Archive',
      author: 'Clara Vance',
      totalBooks: 4,
      notes: 'Atmospheric celestial fantasy quartet.',
      createdAt: now - 90 * 86400000,
      updatedAt: now - 2 * 86400000,
    },
    {
      id: 'series-harbor',
      name: 'Lantern Harbor',
      author: 'Maren Holloway',
      totalBooks: 3,
      notes: 'Cozy coastal mysteries and slow-burn romance.',
      createdAt: now - 60 * 86400000,
      updatedAt: now - 5 * 86400000,
    },
  ]

  const books: Book[] = [
    {
      id: 'book-1',
      title: 'The Glass Observatory',
      author: 'Clara Vance',
      coverUrl: makeSvgCover('The Glass Observatory', 'Clara Vance', '#3c253d', '#15101b', '#e2b197'),
      isbn: '9780000001003',
      format: 'Paperback',
      totalPages: 412,
      currentPage: 294,
      status: 'reading',
      ownership: 'owned',
      rating: 4.5,
      spice: 2,
      isFavorite: true,
      blurb:
        'High above the fog-draped canals of Velmere, an apprentice cartographer uncovers a brass star map whose constellations rewrite themselves each midnight.',
      genres: ['Fantasy', 'Mystery'],
      moods: ['atmospheric', 'tense', 'hopeful'],
      tropes: ['Found family', 'Secret library', 'Slow burn'],
      review: 'Lush worldbuilding and a clockwork mystery that keeps accelerating.',
      seriesId: 'series-starlight',
      seriesOrder: 3,
      releaseDate: null,
      startedAt: daysAgo(6),
      finishedAt: null,
      createdAt: now - 20 * 86400000,
      updatedAt: now - 3600000,
    },
    {
      id: 'book-2',
      title: 'Letters from the Winter Sea',
      author: 'Maren Holloway',
      coverUrl: makeSvgCover('Letters from the Winter Sea', 'Maren Holloway', '#1e3a4c', '#0e1b26', '#9dc6bc'),
      isbn: '9780000002002',
      format: 'Hardcover',
      totalPages: 340,
      currentPage: 162,
      status: 'reading',
      ownership: 'owned',
      rating: 4,
      spice: 3,
      isFavorite: false,
      blurb:
        'Two rival bookshop owners on a windswept island trade anonymous margin notes inside rare editions until a winter storm traps them in the same lighthouse.',
      genres: ['Romance', 'Fiction'],
      moods: ['cozy', 'romantic', 'warm'],
      tropes: ['Rivals to lovers', 'Small town', 'Epistolary'],
      review: '',
      seriesId: 'series-harbor',
      seriesOrder: 2,
      releaseDate: null,
      startedAt: daysAgo(9),
      finishedAt: null,
      createdAt: now - 25 * 86400000,
      updatedAt: now - 86400000,
    },
    {
      id: 'book-3',
      title: 'Cinders of the First Dawn',
      author: 'Clara Vance',
      coverUrl: makeSvgCover('Cinders of the First Dawn', 'Clara Vance', '#5e2c24', '#1d0e0c', '#efb694'),
      isbn: '9780000001001',
      format: 'Paperback',
      totalPages: 384,
      currentPage: 384,
      status: 'finished',
      ownership: 'owned',
      rating: 5,
      spice: 2,
      isFavorite: true,
      blurb: 'Book one of The Starlight Archive, where an archivist steals an unlit lantern from the sunken citadel.',
      genres: ['Fantasy'],
      moods: ['tense', 'heartbreaking', 'adventurous'],
      tropes: ['Found family', 'Morally grey', 'Heist'],
      review: 'Unforgettable opening to the series. Couldn’t put the final third down.',
      seriesId: 'series-starlight',
      seriesOrder: 1,
      releaseDate: null,
      startedAt: daysAgo(45),
      finishedAt: daysAgo(39),
      createdAt: now - 55 * 86400000,
      updatedAt: now - 39 * 86400000,
    },
    {
      id: 'book-4',
      title: 'Tides of Copper & Ash',
      author: 'Clara Vance',
      coverUrl: makeSvgCover('Tides of Copper & Ash', 'Clara Vance', '#21403b', '#0d1a18', '#d7a88e'),
      isbn: '9780000001002',
      format: 'Paperback',
      totalPages: 428,
      currentPage: 428,
      status: 'finished',
      ownership: 'owned',
      rating: 4.5,
      spice: 2,
      isFavorite: true,
      blurb: 'As the archive fractures, old alliances are tested across the salt plains.',
      genres: ['Fantasy', 'Adventure'],
      moods: ['dark', 'tense'],
      tropes: ['Political intrigue', 'Found family'],
      review: 'Even higher stakes than book one.',
      seriesId: 'series-starlight',
      seriesOrder: 2,
      releaseDate: null,
      startedAt: daysAgo(28),
      finishedAt: daysAgo(21),
      createdAt: now - 40 * 86400000,
      updatedAt: now - 21 * 86400000,
    },
    {
      id: 'book-5',
      title: 'The Saltwater Bookshop',
      author: 'Maren Holloway',
      coverUrl: makeSvgCover('The Saltwater Bookshop', 'Maren Holloway', '#394b3e', '#141d17', '#e5c4a1'),
      isbn: '9780000002001',
      format: 'eBook',
      totalPages: 312,
      currentPage: 312,
      status: 'finished',
      ownership: 'owned',
      rating: 4,
      spice: 3,
      isFavorite: false,
      blurb: 'An heirloom bookshop perched above crashing cliffs becomes the unlikely heart of Lantern Harbor.',
      genres: ['Romance', 'Cozy'],
      moods: ['romantic', 'cozy'],
      tropes: ['Small town', 'Grumpy x sunshine'],
      review: 'Pure comfort reading on a rainy weekend.',
      seriesId: 'series-harbor',
      seriesOrder: 1,
      releaseDate: null,
      startedAt: daysAgo(18),
      finishedAt: daysAgo(12),
      createdAt: now - 30 * 86400000,
      updatedAt: now - 12 * 86400000,
    },
    {
      id: 'book-6',
      title: 'Pride and Prejudice',
      author: 'Jane Austen',
      coverUrl: makeSvgCover('Pride and Prejudice', 'Jane Austen', '#4a3538', '#1d1416', '#e0b7a4'),
      isbn: '9780141439518',
      format: 'Hardcover',
      totalPages: 432,
      currentPage: 432,
      status: 'finished',
      ownership: 'owned',
      rating: 5,
      spice: 1,
      isFavorite: true,
      blurb: 'Wit, manners, and enduring affection collide in Regency England as Elizabeth Bennet crosses paths with Mr. Darcy.',
      genres: ['Classic', 'Romance'],
      moods: ['witty', 'romantic'],
      tropes: ['Enemies to lovers', 'Slow burn'],
      review: 'Timeless prose and sparkling dialogue on every reread.',
      seriesId: null,
      seriesOrder: null,
      releaseDate: null,
      startedAt: daysAgo(11),
      finishedAt: daysAgo(4),
      createdAt: now - 15 * 86400000,
      updatedAt: now - 4 * 86400000,
    },
    {
      id: 'book-7',
      title: 'Frankenstein',
      author: 'Mary Shelley',
      coverUrl: makeSvgCover('Frankenstein', 'Mary Shelley', '#2a2e38', '#0f1218', '#9eb8b1'),
      isbn: '9780141439471',
      format: 'Paperback',
      totalPages: 280,
      currentPage: 0,
      status: 'tbr',
      ownership: 'owned',
      rating: 0,
      spice: 0,
      isFavorite: false,
      blurb: 'Ambition, creation, and solitude unfold across alpine glaciers and arctic seas.',
      genres: ['Classic', 'Sci-Fi'],
      moods: ['dark', 'atmospheric'],
      tropes: ['Gothic', 'Morally grey'],
      review: '',
      seriesId: null,
      seriesOrder: null,
      releaseDate: null,
      startedAt: null,
      finishedAt: null,
      createdAt: now - 10 * 86400000,
      updatedAt: now - 10 * 86400000,
    },
    {
      id: 'book-8',
      title: 'A Crown of Quiet Stars',
      author: 'Clara Vance',
      coverUrl: makeSvgCover('A Crown of Quiet Stars', 'Clara Vance', '#282342', '#110e1c', '#d8a594'),
      isbn: '9780000001004',
      format: 'Hardcover',
      totalPages: 480,
      currentPage: 0,
      status: 'wishlist',
      ownership: 'wishlist',
      rating: 0,
      spice: 0,
      isFavorite: false,
      blurb: 'The anticipated finale to The Starlight Archive.',
      genres: ['Fantasy'],
      moods: ['tense', 'heartbreaking'],
      tropes: ['Found family'],
      review: '',
      seriesId: 'series-starlight',
      seriesOrder: 4,
      releaseDate: daysFromNow(28),
      startedAt: null,
      finishedAt: null,
      createdAt: now - 8 * 86400000,
      updatedAt: now - 8 * 86400000,
    },
    {
      id: 'book-9',
      title: 'Midsummer at Lantern Point',
      author: 'Maren Holloway',
      coverUrl: makeSvgCover('Midsummer at Lantern Point', 'Maren Holloway', '#4c3a25', '#1d150c', '#e6c38d'),
      isbn: '9780000002003',
      format: 'Paperback',
      totalPages: 356,
      currentPage: 0,
      status: 'wishlist',
      ownership: 'wishlist',
      rating: 0,
      spice: 0,
      isFavorite: false,
      blurb: 'A summer festival brings old secrets ashore in the third Lantern Harbor novel.',
      genres: ['Romance', 'Cozy'],
      moods: ['warm', 'romantic'],
      tropes: ['Small town', 'Second chance'],
      review: '',
      seriesId: 'series-harbor',
      seriesOrder: 3,
      releaseDate: daysFromNow(64),
      startedAt: null,
      finishedAt: null,
      createdAt: now - 6 * 86400000,
      updatedAt: now - 6 * 86400000,
    },
    {
      id: 'book-10',
      title: 'The Clockmaker’s Labyrinth',
      author: 'Julian Mercer',
      coverUrl: makeSvgCover('Clockmakers Labyrinth', 'Julian Mercer', '#3d2a24', '#160f0d', '#c89685'),
      isbn: '9780000003001',
      format: 'Hardcover',
      totalPages: 390,
      currentPage: 0,
      status: 'wishlist',
      ownership: 'wishlist',
      rating: 0,
      spice: 0,
      isFavorite: false,
      blurb: 'An underground horological city ticks toward an impossible thirteenth hour.',
      genres: ['Sci-Fi', 'Mystery'],
      moods: ['tense', 'atmospheric'],
      tropes: ['Locked room', 'Time loop'],
      review: '',
      seriesId: null,
      seriesOrder: null,
      releaseDate: daysFromNow(105),
      startedAt: null,
      finishedAt: null,
      createdAt: now - 4 * 86400000,
      updatedAt: now - 4 * 86400000,
    },
    {
      id: 'book-11',
      title: 'The Iron Albatross',
      author: 'E. K. Sterling',
      coverUrl: makeSvgCover('The Iron Albatross', 'E. K. Sterling', '#383232', '#171414', '#b59d94'),
      isbn: '9780000004001',
      format: 'eBook',
      totalPages: 410,
      currentPage: 138,
      status: 'dnf',
      ownership: 'library',
      rating: 2,
      spice: 0,
      isFavorite: false,
      blurb: 'An airship expedition across the frost dunes.',
      genres: ['Sci-Fi', 'Adventure'],
      moods: ['dark'],
      tropes: ['Steampunk'],
      review: 'Great setting, just wasn’t in the right mood for the pacing.',
      seriesId: null,
      seriesOrder: null,
      releaseDate: null,
      startedAt: daysAgo(34),
      finishedAt: null,
      createdAt: now - 35 * 86400000,
      updatedAt: now - 31 * 86400000,
    },
  ]

  // Generate 14 consecutive days of reading sessions for rich calendar + stats + streaks
  const sessions: ReadingSession[] = []
  const readingCycle = [books[0], books[1], books[5], books[4], books[3]]
  for (let i = 13; i >= 0; i--) {
    const book = readingCycle[i % readingCycle.length]
    const pages = 28 + ((i * 17) % 45)
    const durationSeconds = Math.round((pages / 48) * 3600)
    const endedAt = now - i * 86400000
    sessions.push({
      id: `session-${i}`,
      bookId: book.id,
      bookTitle: book.title,
      bookCoverUrl: book.coverUrl,
      date: daysAgo(i),
      startPage: Math.max(0, book.currentPage - pages),
      endPage: book.currentPage,
      pagesRead: pages,
      durationSeconds,
      startedAt: endedAt - durationSeconds * 1000,
      endedAt,
    })
  }

  // Add earlier monthly history sessions across the current year for the monthly chart
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth()
  for (let m = 0; m < currentMonth; m++) {
    const sampleDate = `${currentYear}-${String(m + 1).padStart(2, '0')}-14`
    const book = books[m % 6]
    const pages = 180 + ((m * 93) % 240)
    const durationSeconds = Math.round((pages / 50) * 3600)
    const ts = new Date(currentYear, m, 14, 20, 0).getTime()
    sessions.push({
      id: `session-month-${m}`,
      bookId: book.id,
      bookTitle: book.title,
      bookCoverUrl: book.coverUrl,
      date: sampleDate,
      startPage: 0,
      endPage: pages,
      pagesRead: pages,
      durationSeconds,
      startedAt: ts - durationSeconds * 1000,
      endedAt: ts,
    })
  }

  const quotes: SavedQuote[] = [
    {
      id: 'quote-1',
      bookId: 'book-6',
      bookTitle: 'Pride and Prejudice',
      bookAuthor: 'Jane Austen',
      bookCoverUrl: books[5].coverUrl,
      text: 'I declare after all there is no enjoyment like reading! How much sooner one tires of any thing than of a book!',
      page: 55,
      isFavorite: true,
      createdAt: now - 5 * 86400000,
      updatedAt: now - 5 * 86400000,
    },
    {
      id: 'quote-2',
      bookId: 'book-1',
      bookTitle: 'The Glass Observatory',
      bookAuthor: 'Clara Vance',
      bookCoverUrl: books[0].coverUrl,
      text: 'Every map is a quiet promise that someone walked into the dark first and left a lantern behind.',
      page: 184,
      isFavorite: true,
      createdAt: now - 3 * 86400000,
      updatedAt: now - 3 * 86400000,
    },
    {
      id: 'quote-3',
      bookId: 'book-2',
      bookTitle: 'Letters from the Winter Sea',
      bookAuthor: 'Maren Holloway',
      bookCoverUrl: books[1].coverUrl,
      text: 'You can tell everything worth knowing about a stranger by the sentences they underline in pencil.',
      page: 92,
      isFavorite: false,
      createdAt: now - 2 * 86400000,
      updatedAt: now - 2 * 86400000,
    },
    {
      id: 'quote-4',
      bookId: 'book-3',
      bookTitle: 'Cinders of the First Dawn',
      bookAuthor: 'Clara Vance',
      bookCoverUrl: books[2].coverUrl,
      text: 'Courage rarely arrives as thunder; most days it looks like opening one more heavy door.',
      page: 312,
      isFavorite: true,
      createdAt: now - 14 * 86400000,
      updatedAt: now - 14 * 86400000,
    },
  ]

  return { books, series, sessions, quotes }
}
