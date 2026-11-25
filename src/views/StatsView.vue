<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronRight, Flame } from 'lucide-vue-next'
import { useLibraryStore } from '@/stores/library'
import { formatCompactNumber, toLocalDateKey } from '@/utils/dates'
import type { StatsRange } from '@/types/models'

const router = useRouter()
const library = useLibraryStore()

const range = ref<StatsRange>('month')

const chartSubtitle = computed(() => {
  if (range.value === 'day') return 'Last 10 days'
  if (range.value === 'week') return 'Last 8 weeks'
  return 'This year'
})

interface BarPoint {
  label: string
  value: number
  isCurrent: boolean
}

const barData = computed<BarPoint[]>(() => {
  const now = new Date()

  if (range.value === 'month') {
    const year = now.getFullYear()
    const currentMonth = now.getMonth()
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const totals = new Array(12).fill(0)

    for (const s of library.sessions) {
      if (!s.date.startsWith(`${year}-`)) continue
      const m = parseInt(s.date.slice(5, 7), 10) - 1
      if (m >= 0 && m < 12) totals[m] += s.pagesRead
    }

    return names.map((label, idx) => ({
      label,
      value: totals[idx],
      isCurrent: idx === currentMonth,
    }))
  }

  if (range.value === 'day') {
    const points: BarPoint[] = []
    for (let i = 9; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = toLocalDateKey(d)
      const total = library.sessions
        .filter((s) => s.date === key)
        .reduce((sum, s) => sum + s.pagesRead, 0)
      points.push({
        label: String(d.getDate()),
        value: total,
        isCurrent: i === 0,
      })
    }
    return points
  }

  // Last 8 weeks
  const points: BarPoint[] = []
  for (let w = 7; w >= 0; w--) {
    const end = new Date(now)
    end.setDate(now.getDate() - w * 7)
    const start = new Date(end)
    start.setDate(end.getDate() - 6)
    const startKey = toLocalDateKey(start)
    const endKey = toLocalDateKey(end)
    const total = library.sessions
      .filter((s) => s.date >= startKey && s.date <= endKey)
      .reduce((sum, s) => sum + s.pagesRead, 0)
    points.push({
      label: `W${8 - w}`,
      value: total,
      isCurrent: w === 0,
    })
  }
  return points
})

const maxBarVal = computed(() => Math.max(10, ...barData.value.map((b) => b.value)))

interface DonutSlice {
  label: string
  count: number
  percent: number
  color: string
  dashArray: string
  dashOffset: number
}

const DONUT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]

function buildDonut(counts: Map<string, number>): {
  slices: DonutSlice[]
  topLabel: string
  extraCount: number
} {
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((sum, [, c]) => sum + c, 0)
  if (!total) return { slices: [], topLabel: 'None', extraCount: 0 }

  const radius = 38
  const circumference = 2 * Math.PI * radius
  let cumulative = 0

  const slices: DonutSlice[] = entries.slice(0, 6).map(([label, count], idx) => {
    const fraction = count / total
    const length = fraction * circumference
    const slice: DonutSlice = {
      label,
      count,
      percent: Math.round(fraction * 100),
      color: DONUT_COLORS[idx % DONUT_COLORS.length],
      dashArray: `${Math.max(0, length - 1.5)} ${circumference}`,
      dashOffset: -cumulative,
    }
    cumulative += length
    return slice
  })

  return {
    slices,
    topLabel: entries[0][0],
    extraCount: Math.max(0, entries.length - 2),
  }
}

const genreDonut = computed(() => {
  const map = new Map<string, number>()
  const source = library.books.filter((b) => b.status === 'finished' || b.status === 'reading')
  for (const b of source.length ? source : library.books) {
    for (const g of b.genres) {
      map.set(g, (map.get(g) || 0) + 1)
    }
  }
  return buildDonut(map)
})

const moodDonut = computed(() => {
  const map = new Map<string, number>()
  const source = library.books.filter((b) => b.status === 'finished' || b.status === 'reading')
  for (const b of source.length ? source : library.books) {
    for (const m of b.moods) {
      const normalized = m.charAt(0).toUpperCase() + m.slice(1)
      map.set(normalized, (map.get(normalized) || 0) + 1)
    }
  }
  return buildDonut(map)
})
</script>

<template>
  <div class="page-scroll stats-page">
    <!-- Top 3 Summary KPIs -->
    <div class="kpi-grid">
      <div class="card kpi-card">
        <span class="kpi-label">Books read</span>
        <div class="kpi-val tabular">
          <strong>{{ library.booksReadThisYear.length }}</strong>
          <span class="kpi-unit">of {{ library.profile.yearlyBookGoal }}</span>
        </div>
      </div>

      <div class="card kpi-card">
        <span class="kpi-label">Pages read</span>
        <div class="kpi-val tabular">
          <strong>{{ formatCompactNumber(library.totalPagesReadThisYear) }}</strong>
        </div>
      </div>

      <button type="button" class="card kpi-card kpi-clickable" @click="router.push('/calendar')">
        <span class="kpi-label streak-head">
          <span class="streak-tag"><Flame :size="13" fill="#f08a4b" color="#f08a4b" /> Streak</span>
          <ChevronRight :size="14" />
        </span>
        <div class="kpi-val tabular">
          <strong>{{ library.streakInfo.currentStreak }}</strong>
          <span class="kpi-unit">days</span>
        </div>
      </button>
    </div>

    <!-- Pages Read Bar Chart Card -->
    <section class="card chart-card">
      <div class="chart-head">
        <div>
          <h2 class="section-title">Pages read</h2>
          <span class="chart-sub">{{ chartSubtitle }}</span>
        </div>

        <div class="range-toggle">
          <button
            v-for="r in (['day', 'week', 'month'] as StatsRange[])"
            :key="r"
            type="button"
            class="range-pill"
            :class="{ active: range === r }"
            @click="range = r"
          >
            {{ r }}
          </button>
        </div>
      </div>

      <div class="bars-wrap">
        <div v-for="pt in barData" :key="pt.label" class="bar-col">
          <span class="bar-val tabular">
            {{ pt.value > 0 ? formatCompactNumber(pt.value) : '' }}
          </span>
          <div class="bar-track">
            <div
              class="bar-fill"
              :class="{ current: pt.isCurrent, empty: pt.value === 0 }"
              :style="{
                height: pt.value > 0 ? `${Math.max(8, (pt.value / maxBarVal) * 100)}%` : '3px',
              }"
            />
          </div>
          <span class="bar-label">{{ pt.label }}</span>
        </div>
      </div>
    </section>

    <!-- Reading Time Card -->
    <section class="card pace-card">
      <h2 class="section-title">Reading time</h2>
      <div class="pace-grid">
        <div class="pace-col">
          <span class="pace-label">Avg time to finish</span>
          <div class="pace-val tabular">
            <strong>{{ library.avgDaysToFinish || '—' }}</strong>
            <span v-if="library.avgDaysToFinish" class="pace-unit">days</span>
          </div>
        </div>
        <div class="pace-col">
          <span class="pace-label">Your pace</span>
          <div class="pace-val tabular">
            <strong>{{ library.readingPacePagesPerHour || '—' }}</strong>
            <span v-if="library.readingPacePagesPerHour" class="pace-unit">pages/hr</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Genre & Mood Donut Charts -->
    <div class="donut-grid">
      <section class="card donut-card">
        <h2 class="section-title">Genre</h2>
        <div class="donut-stage">
          <svg viewBox="0 0 100 100" class="donut-svg">
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="11" />
            <circle
              v-for="s in genreDonut.slices"
              :key="s.label"
              cx="50"
              cy="50"
              r="38"
              fill="none"
              :stroke="s.color"
              stroke-width="11"
              :stroke-dasharray="s.dashArray"
              :stroke-dashoffset="s.dashOffset"
            />
          </svg>
          <div class="donut-center">
            <span class="donut-most">Most</span>
            <strong class="donut-top">{{ genreDonut.topLabel }}</strong>
          </div>
        </div>

        <div class="legend-list">
          <div v-for="s in genreDonut.slices.slice(0, 2)" :key="s.label" class="legend-row">
            <span class="legend-dot" :style="{ background: s.color }" />
            <span class="legend-name">{{ s.label }}</span>
            <span class="legend-pct tabular">{{ s.percent }}%</span>
          </div>
          <span v-if="genreDonut.extraCount > 0" class="legend-more">
            and {{ genreDonut.extraCount }} more
          </span>
        </div>
      </section>

      <section class="card donut-card">
        <h2 class="section-title">Mood</h2>
        <div class="donut-stage">
          <svg viewBox="0 0 100 100" class="donut-svg">
            <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="11" />
            <circle
              v-for="s in moodDonut.slices"
              :key="s.label"
              cx="50"
              cy="50"
              r="38"
              fill="none"
              :stroke="s.color"
              stroke-width="11"
              :stroke-dasharray="s.dashArray"
              :stroke-dashoffset="s.dashOffset"
            />
          </svg>
          <div class="donut-center">
            <span class="donut-most">Most</span>
            <strong class="donut-top">{{ moodDonut.topLabel.toLowerCase() }}</strong>
          </div>
        </div>

        <div class="legend-list">
          <div v-for="s in moodDonut.slices.slice(0, 2)" :key="s.label" class="legend-row">
            <span class="legend-dot" :style="{ background: s.color }" />
            <span class="legend-name">{{ s.label }}</span>
            <span class="legend-pct tabular">{{ s.percent }}%</span>
          </div>
          <span v-if="moodDonut.extraCount > 0" class="legend-more">
            and {{ moodDonut.extraCount }} more
          </span>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.stats-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.kpi-card {
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: left;
}

.kpi-clickable {
  transition: border-color 0.15s ease;
}

.kpi-clickable:hover {
  border-color: var(--accent-border);
}

.kpi-label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.streak-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.streak-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.kpi-val {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex-wrap: wrap;
}

.kpi-val strong {
  font-size: 25px;
  font-weight: 700;
  line-height: 1;
}

.kpi-unit {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Bar chart */
.chart-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.chart-sub {
  font-size: 12.5px;
  color: var(--text-secondary);
}

.range-toggle {
  display: inline-flex;
  background: #141212;
  border-radius: 999px;
  padding: 3px;
  border: 1px solid var(--border-subtle);
}

.range-pill {
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.range-pill.active {
  background: var(--accent);
  color: var(--accent-on);
}

.bars-wrap {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 156px;
  padding-top: 12px;
}

.bar-col {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.bar-val {
  font-size: 9.5px;
  color: var(--text-secondary);
  min-height: 12px;
}

.bar-track {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bar-fill {
  width: 100%;
  max-width: 24px;
  border-radius: 5px 5px 2px 2px;
  background: var(--sage);
  transition: height 0.35s ease;
}

.bar-fill.current {
  background: var(--accent);
}

.bar-fill.empty {
  background: rgba(255, 255, 255, 0.14);
}

.bar-label {
  font-size: 10px;
  color: var(--text-secondary);
}

/* Reading time */
.pace-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pace-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.pace-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pace-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.pace-val {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.pace-val strong {
  font-size: 26px;
  font-weight: 700;
}

.pace-unit {
  font-size: 12.5px;
  color: var(--text-secondary);
}

/* Donuts */
.donut-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.donut-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.donut-stage {
  position: relative;
  width: 122px;
  height: 122px;
  margin: 0 auto;
}

.donut-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.donut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 14px;
}

.donut-most {
  font-size: 10.5px;
  color: var(--text-secondary);
}

.donut-top {
  font-size: 12.5px;
  font-weight: 700;
  line-height: 1.2;
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12px;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-name {
  flex: 1;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.legend-pct {
  color: var(--text-primary);
  font-weight: 600;
}

.legend-more {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}
</style>
