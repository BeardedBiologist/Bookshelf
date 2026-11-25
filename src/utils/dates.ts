import type { ReadingSession } from '@/types/models'

export function toLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseLocalDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export function getTimeGreeting(date: Date = new Date()): string {
  const h = date.getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export function formatLongDate(date: Date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

export function formatShortReleaseDate(isoDate: string): string {
  const d = parseLocalDateKey(isoDate)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatCompactNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return String(num)
}

export function formatTimerClock(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  if (hrs > 0) return `${hrs}:${pad(mins)}:${pad(secs)}`
  return `${pad(mins)}:${pad(secs)}`
}

export function formatClockTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function computeStreaks(sessions: ReadingSession[]): {
  currentStreak: number
  longestStreak: number
  weekDays: Array<{ label: string; dateKey: string; active: boolean; isToday: boolean }>
} {
  const activeDates = new Set(
    sessions.filter((s) => s.pagesRead > 0 || s.durationSeconds >= 60).map((s) => s.date),
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = toLocalDateKey(today)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = toLocalDateKey(yesterday)

  let currentStreak = 0
  let cursor = activeDates.has(todayKey)
    ? new Date(today)
    : activeDates.has(yesterdayKey)
      ? new Date(yesterday)
      : null

  while (cursor && activeDates.has(toLocalDateKey(cursor))) {
    currentStreak++
    cursor.setDate(cursor.getDate() - 1)
  }

  // Compute longest streak across all recorded dates
  const sortedDates = Array.from(activeDates).sort()
  let longestStreak = 0
  let run = 0
  let prevTime: number | null = null

  for (const key of sortedDates) {
    const dt = parseLocalDateKey(key)
    const time = dt.getTime()
    if (prevTime !== null && Math.round((time - prevTime) / 86400000) === 1) {
      run++
    } else {
      run = 1
    }
    if (run > longestStreak) longestStreak = run
    prevTime = time
  }

  // Build current Monday -> Sunday week strip
  const dayOfWeek = today.getDay() // 0 Sun .. 6 Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(today)
  monday.setDate(today.getDate() + diffToMonday)

  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const weekDays = labels.map((label, idx) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + idx)
    const dateKey = toLocalDateKey(d)
    return {
      label,
      dateKey,
      active: activeDates.has(dateKey),
      isToday: dateKey === todayKey,
    }
  })

  return { currentStreak, longestStreak, weekDays }
}

export interface CalendarCell {
  dateKey: string
  dayNumber: number
  inCurrentMonth: boolean
  isToday: boolean
}

export function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1)
  const lastOfMonth = new Date(year, monthIndex + 1, 0)
  const startDow = firstOfMonth.getDay() // 0=Sun..6=Sat
  const mondayOffset = startDow === 0 ? 6 : startDow - 1

  const startDate = new Date(year, monthIndex, 1 - mondayOffset)
  const totalCells = Math.ceil((mondayOffset + lastOfMonth.getDate()) / 7) * 7
  const todayKey = toLocalDateKey(new Date())

  const cells: CalendarCell[] = []
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    const dateKey = toLocalDateKey(d)
    cells.push({
      dateKey,
      dayNumber: d.getDate(),
      inCurrentMonth: d.getMonth() === monthIndex,
      isToday: dateKey === todayKey,
    })
  }
  return cells
}
