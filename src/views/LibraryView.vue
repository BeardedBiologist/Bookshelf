<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FlipHorizontal2,
  Layers,
  LibraryBig,
  Paintbrush,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next'
import { useLibraryStore } from '@/stores/library'
import BookCover from '@/components/BookCover.vue'
import ShelfDecor from '@/components/ShelfDecor.vue'
import type {
  Book,
  BookendStyle,
  BookStatus,
  ShelfDecorKind,
  ShelfItem,
  ShelfItemKind,
  ShelfStyle,
} from '@/types/models'

const router = useRouter()
const library = useLibraryStore()

// ---------------------------------------------------------------------------
// Filters (view mode only; they dim non-matching books, the layout stays put)
// ---------------------------------------------------------------------------
const filterStatus = ref<'all' | BookStatus>('all')
const showSearch = ref(false)
const searchText = ref('')

const statusFilters: Array<{ value: 'all' | BookStatus; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'reading', label: 'Reading' },
  { value: 'tbr', label: 'To Be Read' },
  { value: 'finished', label: 'Finished' },
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'dnf', label: 'DNF' },
]

const shelfStyles: Array<{ value: ShelfStyle; label: string }> = [
  { value: 'walnut', label: 'Walnut' },
  { value: 'oak', label: 'Warm Oak' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'minimal', label: 'Slate' },
]

function toggleSearch() {
  showSearch.value = !showSearch.value
  if (!showSearch.value) searchText.value = ''
}

const isFiltering = computed(() => filterStatus.value !== 'all' || searchText.value.trim() !== '')

/** A book counts as wishlist if either its reading status or its ownership says so. */
function isWishlist(b: Book): boolean {
  return b.status === 'wishlist' || b.ownership === 'wishlist'
}

function matchesStatus(b: Book): boolean {
  if (filterStatus.value === 'all') return true
  if (filterStatus.value === 'wishlist') return isWishlist(b)
  return b.status === filterStatus.value
}

function matchesFilter(b: Book): boolean {
  if (!matchesStatus(b)) return false
  const q = searchText.value.trim().toLowerCase()
  if (!q) return true
  return (
    b.title.toLowerCase().includes(q) ||
    b.author.toLowerCase().includes(q) ||
    b.genres.some((g) => g.toLowerCase().includes(q)) ||
    b.tropes.some((t) => t.toLowerCase().includes(q)) ||
    b.moods.some((m) => m.toLowerCase().includes(q))
  )
}

const matchCount = computed(() => library.books.filter(matchesFilter).length)

function pct(b: Book) {
  if (!b.totalPages) return 0
  return Math.min(100, Math.round((b.currentPage / b.totalPages) * 100))
}

const booksById = computed(() => new Map(library.books.map((b) => [b.id, b])))

// ---------------------------------------------------------------------------
// Shelf layout: items flow left-to-right and wrap onto the next shelf when
// full. A "break" item forces a new shelf. Widths are in book units.
// ---------------------------------------------------------------------------
const ITEM_WIDTH: Record<ShelfItemKind, number> = {
  book: 1,
  space: 0.5,
  candle: 0.55,
  bookend: 0.35,
  plant: 0.7,
  stack: 0.95,
  break: 0,
}
const GAP = 0.12
const PER_SHELF = 4
// Room for a full shelf of books plus a bookend at each end. Bookends sit
// flush against their neighbours (no gap), like on a real shelf.
const CAPACITY = PER_SHELF + (PER_SHELF - 1) * GAP + 2 * ITEM_WIDTH.bookend

function gapBetween(a: ShelfItem | undefined, b: ShelfItem) {
  if (!a) return 0
  return a.kind === 'bookend' || b.kind === 'bookend' ? 0 : GAP
}

interface Cell {
  item: ShelfItem
  index: number
}
interface Row {
  cells: Cell[]
  /** Insertion index meaning "end of this shelf" */
  endIndex: number
  /** Index of the break item that ends this shelf, if any */
  breakIndex: number | null
}

const items = computed(() => library.shelfItems)

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  let cells: Cell[] = []
  let used = 0
  items.value.forEach((item, index) => {
    if (item.kind === 'break') {
      out.push({ cells, endIndex: index, breakIndex: index })
      cells = []
      used = 0
      return
    }
    const need = gapBetween(cells[cells.length - 1]?.item, item) + ITEM_WIDTH[item.kind]
    if (cells.length && used + need > CAPACITY + 1e-6) {
      out.push({ cells, endIndex: index, breakIndex: null })
      cells = []
      used = 0
    }
    used += gapBetween(cells[cells.length - 1]?.item, item) + ITEM_WIDTH[item.kind]
    cells.push({ item, index })
  })
  const lastWasBreak = items.value.length > 0 && items.value[items.value.length - 1].kind === 'break'
  if (cells.length || !out.length || lastWasBreak) {
    out.push({ cells, endIndex: items.value.length, breakIndex: null })
  }
  return out
})

function cellStyle(row: Row, positionInRow: number) {
  const cell = row.cells[positionInRow]
  const gap = gapBetween(row.cells[positionInRow - 1]?.item, cell.item)
  return {
    width: `${(ITEM_WIDTH[cell.item.kind] / CAPACITY) * 100}%`,
    marginLeft: `${(gap / CAPACITY) * 100}%`,
  }
}

const rowStyle = { aspectRatio: `${CAPACITY} / 1.5` }

// ---------------------------------------------------------------------------
// Arrange mode
// ---------------------------------------------------------------------------
const editing = ref(false)
const selectedId = ref<string | null>(null)

const selectedIndex = computed(() =>
  selectedId.value ? items.value.findIndex((i) => i.id === selectedId.value) : -1,
)
const selectedItem = computed(() => (selectedIndex.value >= 0 ? items.value[selectedIndex.value] : null))

const decorOptions: Array<{ kind: ShelfDecorKind | 'bookend-pair'; label: string }> = [
  { kind: 'bookend-pair', label: 'Bookends' },
  { kind: 'space', label: 'Space' },
  { kind: 'candle', label: 'Candle' },
  { kind: 'bookend', label: 'Single bookend' },
  { kind: 'plant', label: 'Plant' },
  { kind: 'stack', label: 'Book stack' },
  { kind: 'break', label: 'New shelf' },
]

function startEditing() {
  editing.value = true
  filterStatus.value = 'all'
  searchText.value = ''
  showSearch.value = false
}

function stopEditing() {
  editing.value = false
  selectedId.value = null
}

function newId(kind: string) {
  return `${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

const bookendStyles: Array<{ value: BookendStyle; label: string }> = [
  { value: 'brass', label: 'Brass' },
  { value: 'marble', label: 'Marble' },
  { value: 'walnut', label: 'Walnut' },
  { value: 'moon', label: 'Moon' },
  { value: 'cat', label: 'Cat' },
]
const lastBookendStyle = ref<BookendStyle>('brass')

function rowOfIndex(index: number) {
  return rows.value.find((r) => r.cells.some((c) => c.index === index)) || null
}

/** Restyle the selected bookend and any other bookends on the same shelf. */
function setBookendStyle(style: BookendStyle) {
  const sel = selectedIndex.value
  if (sel < 0 || items.value[sel].kind !== 'bookend') return
  lastBookendStyle.value = style
  const sameShelf = new Set(
    (rowOfIndex(sel)?.cells || []).filter((c) => c.item.kind === 'bookend').map((c) => c.index),
  )
  sameShelf.add(sel)
  const next = items.value.map((it, idx) => (sameShelf.has(idx) ? { ...it, variant: style } : it))
  library.saveShelfLayout(next)
}

/** Put a bookend at each end of the selected item's shelf (or the last shelf). */
function addBookendPair() {
  const sel = selectedIndex.value
  const row =
    (sel >= 0 ? rows.value.find((r) => r.cells.some((c) => c.index === sel)) : null) ||
    [...rows.value].reverse().find((r) => r.cells.length)
  const next = [...items.value]
  const variant = lastBookendStyle.value
  const left: ShelfItem = { id: newId('bookend'), kind: 'bookend', bookId: null, flip: true, variant }
  const right: ShelfItem = { id: newId('bookend'), kind: 'bookend', bookId: null, flip: false, variant }
  if (!row) {
    next.push(left, right)
  } else {
    const first = row.cells[0].index
    const last = row.cells[row.cells.length - 1].index
    // Skip ends that already have a bookend
    if (next[last].kind !== 'bookend') next.splice(last + 1, 0, right)
    if (next[first].kind !== 'bookend') next.splice(first, 0, left)
  }
  library.saveShelfLayout(next)
}

function onAddOption(kind: ShelfDecorKind | 'bookend-pair') {
  if (kind === 'bookend-pair') addBookendPair()
  else addDecor(kind)
}

function addDecor(kind: ShelfDecorKind) {
  const next = [...items.value]
  const item: ShelfItem = {
    id: newId(kind),
    kind,
    bookId: null,
    flip: false,
    variant: kind === 'bookend' ? lastBookendStyle.value : null,
  }
  // Bookends placed to the right of something face the other way by default
  if (kind === 'bookend' && selectedIndex.value >= 0) item.flip = true
  const at = selectedIndex.value >= 0 ? selectedIndex.value + 1 : next.length
  next.splice(at, 0, item)
  library.saveShelfLayout(next)
  if (kind !== 'break') selectedId.value = item.id
}

function moveTo(from: number, insertAt: number) {
  if (from < 0) return
  const to = insertAt > from ? insertAt - 1 : insertAt
  if (to === from) return
  const next = [...items.value]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  library.saveShelfLayout(next)
}

function nudge(dir: -1 | 1) {
  const i = selectedIndex.value
  if (i < 0) return
  const j = i + dir
  if (j < 0 || j >= items.value.length) return
  const next = [...items.value]
  ;[next[i], next[j]] = [next[j], next[i]]
  library.saveShelfLayout(next)
}

function flipSelected() {
  const i = selectedIndex.value
  if (i < 0) return
  const next = items.value.map((it, idx) => (idx === i ? { ...it, flip: !it.flip } : it))
  library.saveShelfLayout(next)
}

function removeAt(index: number) {
  const item = items.value[index]
  if (!item || item.kind === 'book') return
  const next = items.value.filter((_, idx) => idx !== index)
  library.saveShelfLayout(next)
  if (selectedId.value === item.id) selectedId.value = null
}

function onCellClick(cell: Cell) {
  if (suppressClick) {
    suppressClick = false
    return
  }
  if (editing.value) {
    selectedId.value = selectedId.value === cell.item.id ? null : cell.item.id
    return
  }
  if (cell.item.kind === 'book' && cell.item.bookId) {
    router.push(`/book/${cell.item.bookId}`)
  }
}

// ---------------------------------------------------------------------------
// Drag & drop (arrange mode)
//  - Touch: drag sideways to move straight away, or press-and-hold briefly and
//    drag in any direction. A quick vertical swipe still scrolls the page.
//    Uses native touch events (non-passive) because iOS Safari cancels pointer
//    events as soon as it decides a touch is a scroll.
//  - Mouse: press and drag.
// ---------------------------------------------------------------------------
const HOLD_MS = 160
const MOVE_TOLERANCE = 6

const shelfEl = ref<HTMLElement | null>(null)

const drag = reactive({
  active: false,
  item: null as ShelfItem | null,
  from: -1,
  x: 0,
  y: 0,
  offsetX: 0,
  offsetY: 0,
  w: 0,
  h: 0,
})
const dropAt = ref<number | null>(null)
const dropMarker = ref<{ index: number; side: 'before' | 'after' } | { rowEnd: number } | null>(null)

let holdTimer: ReturnType<typeof setTimeout> | null = null
let press: { x: number; y: number; cell: Cell; el: HTMLElement; held: boolean } | null = null
let suppressClick = false
let scrollSpeed = 0
let rafId = 0

function cellFromTarget(target: EventTarget | null): { cell: Cell; el: HTMLElement } | null {
  const el = (target as HTMLElement | null)?.closest?.<HTMLElement>('[data-idx]')
  if (!el) return null
  const index = Number(el.dataset.idx)
  const item = items.value[index]
  return item ? { cell: { item, index }, el } : null
}

function clearHold() {
  if (holdTimer) clearTimeout(holdTimer)
  holdTimer = null
}

function pressStart(x: number, y: number, target: EventTarget | null) {
  if (!editing.value) return false
  const hit = cellFromTarget(target)
  if (!hit) return false
  press = { x, y, cell: hit.cell, el: hit.el, held: false }
  clearHold()
  holdTimer = setTimeout(() => {
    if (!press) return
    press.held = true
    beginDrag(press.x, press.y)
  }, HOLD_MS)
  return true
}

/** Returns true when the move belongs to the drag (caller should preventDefault). */
function pressMove(x: number, y: number, allowAnyDirection: boolean) {
  if (!press) return false
  if (!drag.active) {
    const dx = x - press.x
    const dy = y - press.y
    if (Math.hypot(dx, dy) <= MOVE_TOLERANCE) return true
    // Sideways (or mouse) movement starts a drag immediately; vertical = scroll
    if (allowAnyDirection || Math.abs(dx) > Math.abs(dy)) {
      clearHold()
      beginDrag(press.x, press.y)
    } else {
      cancelPress()
      return false
    }
  }
  drag.x = x
  drag.y = y
  const edge = 90
  const bottomEdge = window.innerHeight - edge - 40
  if (y < edge) scrollSpeed = -Math.ceil((edge - y) / 6)
  else if (y > bottomEdge) scrollSpeed = Math.ceil((y - bottomEdge) / 6)
  else scrollSpeed = 0
  updateDrop(x, y)
  return true
}

function pressEnd() {
  if (drag.active) {
    if (dropAt.value !== null) moveTo(drag.from, dropAt.value)
    suppressClick = true
    setTimeout(() => (suppressClick = false), 60)
  }
  cancelPress()
}

function cancelPress() {
  clearHold()
  press = null
  drag.active = false
  drag.item = null
  dropAt.value = null
  dropMarker.value = null
  scrollSpeed = 0
  cancelAnimationFrame(rafId)
}

function beginDrag(x: number, y: number) {
  if (!press || drag.active) return
  const rect = press.el.getBoundingClientRect()
  drag.active = true
  drag.item = press.cell.item
  drag.from = press.cell.index
  drag.w = rect.width
  drag.h = rect.height
  drag.offsetX = x - rect.left
  drag.offsetY = y - rect.top
  drag.x = x
  drag.y = y
  selectedId.value = press.cell.item.id
  updateDrop(x, y)
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(autoScrollLoop)
}

function updateDrop(x: number, y: number) {
  const el = document.elementFromPoint(x, y) as HTMLElement | null
  const cellEl = el?.closest<HTMLElement>('[data-idx]')
  if (cellEl) {
    const index = Number(cellEl.dataset.idx)
    const rect = cellEl.getBoundingClientRect()
    const side = x < rect.left + rect.width / 2 ? 'before' : 'after'
    dropAt.value = side === 'before' ? index : index + 1
    dropMarker.value = { index, side }
    return
  }
  const rowEl = el?.closest<HTMLElement>('[data-row]')
  if (rowEl) {
    const r = Number(rowEl.dataset.row)
    dropAt.value = rows.value[r]?.endIndex ?? null
    dropMarker.value = { rowEnd: r }
  }
}

function autoScrollLoop() {
  if (!drag.active) return
  if (scrollSpeed !== 0) {
    window.scrollBy(0, scrollSpeed)
    updateDrop(drag.x, drag.y)
  }
  rafId = requestAnimationFrame(autoScrollLoop)
}

// --- Touch (iPhone / iPad) ---
function onTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) {
    cancelPress()
    return
  }
  const t = e.touches[0]
  pressStart(t.clientX, t.clientY, e.target)
}

function onTouchMove(e: TouchEvent) {
  if (!press) return
  const t = e.touches[0]
  if (pressMove(t.clientX, t.clientY, press.held) && e.cancelable) e.preventDefault()
}

function onTouchEnd(e: TouchEvent) {
  if (!press) return
  const wasDragging = drag.active
  pressEnd()
  // Stop the synthetic click after a drag
  if (wasDragging && e.cancelable) e.preventDefault()
}

// --- Mouse (desktop) ---
function onMouseDown(e: PointerEvent) {
  if (e.pointerType === 'touch' || e.button !== 0) return
  if (!pressStart(e.clientX, e.clientY, e.target)) return
  window.addEventListener('pointermove', onMouseMove)
  window.addEventListener('pointerup', onMouseUp)
}

function onMouseMove(e: PointerEvent) {
  pressMove(e.clientX, e.clientY, true)
}

function onMouseUp() {
  window.removeEventListener('pointermove', onMouseMove)
  window.removeEventListener('pointerup', onMouseUp)
  pressEnd()
}

onMounted(() => {
  // Registered manually so they're non-passive (needed to stop iOS scrolling)
  const el = shelfEl.value
  if (!el) return
  el.addEventListener('touchstart', onTouchStart, { passive: true })
  el.addEventListener('touchmove', onTouchMove, { passive: false })
  el.addEventListener('touchend', onTouchEnd, { passive: false })
  el.addEventListener('touchcancel', cancelPress)
})

onBeforeUnmount(() => {
  const el = shelfEl.value
  if (el) {
    el.removeEventListener('touchstart', onTouchStart)
    el.removeEventListener('touchmove', onTouchMove)
    el.removeEventListener('touchend', onTouchEnd)
    el.removeEventListener('touchcancel', cancelPress)
  }
  window.removeEventListener('pointermove', onMouseMove)
  window.removeEventListener('pointerup', onMouseUp)
  cancelPress()
})

function markerClass(cell: Cell) {
  const m = dropMarker.value
  if (!m || !('index' in m) || m.index !== cell.index) return null
  return m.side === 'before' ? 'drop-before' : 'drop-after'
}

const decorLabel: Record<ShelfItemKind, string> = {
  book: 'Book',
  space: 'Space',
  candle: 'Candle',
  bookend: 'Bookend',
  plant: 'Plant',
  stack: 'Book stack',
  break: 'Shelf break',
}

const selectedLabel = computed(() => {
  const it = selectedItem.value
  if (!it) return ''
  if (it.kind === 'book') return booksById.value.get(it.bookId || '')?.title || 'Book'
  return decorLabel[it.kind]
})
</script>

<template>
  <div ref="shelfEl" class="page-scroll library-page" :class="{ 'is-editing': editing }">
    <header class="lib-header">
      <h1 class="page-title">LIBRARY</h1>

      <div class="header-actions">
        <button
          v-if="!editing"
          type="button"
          class="btn btn-surface btn-pill arrange-btn"
          @click="startEditing()"
        >
          <Paintbrush :size="15" /> Arrange
        </button>
        <button v-else type="button" class="btn btn-accent btn-pill arrange-btn" @click="stopEditing()">
          <Check :size="15" /> Done
        </button>

        <button
          v-if="!editing"
          type="button"
          class="icon-btn icon-btn-accent"
          aria-label="Library"
          aria-current="page"
        >
          <LibraryBig :size="17" />
        </button>

        <button
          v-if="!editing"
          type="button"
          class="icon-btn"
          aria-label="Series tracker"
          @click="router.push('/series')"
        >
          <Layers :size="17" />
        </button>

        <button
          v-if="!editing"
          type="button"
          class="icon-btn"
          :aria-label="showSearch ? 'Close search' : 'Search library'"
          @click="toggleSearch()"
        >
          <X v-if="showSearch" :size="17" />
          <Search v-else :size="17" />
        </button>
      </div>
    </header>

    <!-- View mode: search + filters -->
    <template v-if="!editing">
      <div v-if="showSearch" class="search-wrap">
        <input
          v-model="searchText"
          type="search"
          class="input"
          placeholder="Filter by title, author, genre, mood, trope..."
          autofocus
        />
      </div>

      <div class="h-scroll filter-strip">
        <button
          v-for="f in statusFilters"
          :key="f.value"
          type="button"
          class="chip"
          :class="{ 'chip-active': filterStatus === f.value }"
          @click="filterStatus = f.value"
        >
          {{ f.label }}
        </button>
        <button type="button" class="chip chip-muted" @click="router.push('/series')">
          Series ({{ library.series.length }})
        </button>
      </div>

      <p v-if="isFiltering" class="subtle filter-note">
        {{ matchCount }} {{ matchCount === 1 ? 'book matches' : 'books match' }}. The rest are dimmed.
      </p>
    </template>

    <!-- Arrange mode: toolbar -->
    <div v-else class="arrange-panel">
      <div class="arrange-bar">
        <template v-if="selectedItem">
          <span class="sel-label">{{ selectedLabel }}</span>
          <div class="sel-actions">
            <button type="button" class="icon-btn sm" aria-label="Move left" :disabled="selectedIndex <= 0" @click="nudge(-1)">
              <ArrowLeft :size="16" />
            </button>
            <button
              type="button"
              class="icon-btn sm"
              aria-label="Move right"
              :disabled="selectedIndex >= items.length - 1"
              @click="nudge(1)"
            >
              <ArrowRight :size="16" />
            </button>
            <button
              v-if="selectedItem.kind !== 'book' && selectedItem.kind !== 'space'"
              type="button"
              class="icon-btn sm"
              aria-label="Flip"
              @click="flipSelected()"
            >
              <FlipHorizontal2 :size="16" />
            </button>
            <button
              v-if="selectedItem.kind !== 'book'"
              type="button"
              class="icon-btn sm danger"
              aria-label="Remove from shelf"
              @click="removeAt(selectedIndex)"
            >
              <Trash2 :size="16" />
            </button>
            <button type="button" class="icon-btn sm" aria-label="Deselect" @click="selectedId = null">
              <X :size="16" />
            </button>
          </div>
        </template>
        <span v-else class="subtle arrange-hint">Hold &amp; drag to move · tap to select</span>
      </div>

      <div v-if="selectedItem?.kind === 'bookend'" class="h-scroll add-strip">
        <span class="subtle add-label">Style:</span>
        <button
          v-for="st in bookendStyles"
          :key="st.value"
          type="button"
          class="chip add-chip"
          :class="{ 'chip-active': (selectedItem.variant || 'brass') === st.value }"
          @click="setBookendStyle(st.value)"
        >
          <span class="chip-art"><ShelfDecor kind="bookend" :variant="st.value" /></span>
          {{ st.label }}
        </button>
      </div>

      <div class="h-scroll add-strip">
        <span class="subtle add-label">{{ selectedItem ? 'Add after:' : 'Add:' }}</span>
        <button
          v-for="opt in decorOptions"
          :key="opt.kind"
          type="button"
          class="chip add-chip"
          @click="onAddOption(opt.kind)"
        >
          <span v-if="opt.kind === 'bookend-pair'" class="chip-art pair">
            <ShelfDecor kind="bookend" flip :variant="lastBookendStyle" />
            <ShelfDecor kind="bookend" :variant="lastBookendStyle" />
          </span>
          <span v-else-if="opt.kind !== 'space' && opt.kind !== 'break'" class="chip-art">
            <ShelfDecor :kind="opt.kind" :variant="opt.kind === 'bookend' ? lastBookendStyle : null" />
          </span>
          {{ opt.label }}
        </button>
      </div>

      <div class="h-scroll finish-strip">
        <span class="subtle add-label">Wood:</span>
        <button
          v-for="style in shelfStyles"
          :key="style.value"
          type="button"
          class="chip"
          :class="{ 'chip-active': library.profile.shelfStyle === style.value }"
          @click="library.setShelfStyle(style.value)"
        >
          {{ style.label }}
        </button>
      </div>
    </div>

    <!-- EMPTY STATE -->
    <div v-if="!items.length" class="card empty-lib">
      Your shelf is empty. Tap the + button below to search for or add a book.
    </div>

    <!-- THE BOOKSHELF -->
    <div
      v-else
      class="cozy-shelf-case"
      :class="{ editing, dragging: drag.active }"
      :data-shelf="library.profile.shelfStyle"
      @pointerdown="onMouseDown"
    >
      <div
        v-for="(row, r) in rows"
        :key="r"
        class="shelf-tier"
        :class="{ 'drop-end': dropMarker && 'rowEnd' in dropMarker && dropMarker.rowEnd === r }"
        :data-row="r"
      >
        <div class="shelf-books" :style="rowStyle">
          <button
            v-for="(cell, pos) in row.cells"
            :key="cell.item.id"
            type="button"
            class="shelf-cell"
            :class="[
              `kind-${cell.item.kind}`,
              markerClass(cell),
              {
                selected: editing && selectedId === cell.item.id,
                lifted: drag.active && drag.item?.id === cell.item.id,
                faded:
                  isFiltering &&
                  (cell.item.kind !== 'book' || !booksById.get(cell.item.bookId || '') || !matchesFilter(booksById.get(cell.item.bookId || '')!)),
              },
            ]"
            :style="cellStyle(row, pos)"
            :data-idx="cell.index"
            :aria-label="cell.item.kind === 'book' ? booksById.get(cell.item.bookId || '')?.title : decorLabel[cell.item.kind]"
            @click="onCellClick(cell)"
            @contextmenu.prevent
          >
            <template v-if="cell.item.kind === 'book' && booksById.get(cell.item.bookId || '')">
              <BookCover
                :src="booksById.get(cell.item.bookId!)!.coverUrl"
                :title="booksById.get(cell.item.bookId!)!.title"
                :author="booksById.get(cell.item.bookId!)!.author"
                :dimmed="filterStatus !== 'wishlist' && isWishlist(booksById.get(cell.item.bookId!)!)"
                radius="5px"
              />
              <span v-if="booksById.get(cell.item.bookId!)!.status === 'finished'" class="shelf-dot" />
              <span
                v-else-if="booksById.get(cell.item.bookId!)!.status === 'reading'"
                class="shelf-progress"
              >
                <span :style="{ width: `${pct(booksById.get(cell.item.bookId!)!)}%` }" />
              </span>
            </template>
            <ShelfDecor
              v-else
              :kind="cell.item.kind as ShelfDecorKind"
              :flip="cell.item.flip"
              :variant="cell.item.variant"
            />
          </button>
        </div>
        <div class="shelf-plank">
          <button
            v-if="editing && row.breakIndex !== null"
            type="button"
            class="break-tag"
            aria-label="Remove shelf break"
            @click="removeAt(row.breakIndex)"
          >
            Shelf end <X :size="11" />
          </button>
        </div>
      </div>
    </div>

    <!-- Drag ghost -->
    <div
      v-if="drag.active && drag.item"
      class="drag-ghost"
      :style="{
        width: `${drag.w}px`,
        height: `${drag.h}px`,
        transform: `translate(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px) scale(1.06) rotate(-2deg)`,
      }"
    >
      <BookCover
        v-if="drag.item.kind === 'book' && booksById.get(drag.item.bookId || '')"
        :src="booksById.get(drag.item.bookId!)!.coverUrl"
        :title="booksById.get(drag.item.bookId!)!.title"
        :author="booksById.get(drag.item.bookId!)!.author"
        radius="5px"
      />
      <ShelfDecor
        v-else
        :kind="drag.item.kind as ShelfDecorKind"
        :flip="drag.item.flip"
        :variant="drag.item.variant"
      />
    </div>
  </div>
</template>

<style scoped>
.library-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  /* The document scrolls, not this element; keep overflow visible so the
     arrange toolbar can stick to the viewport. */
  overflow: visible;
}

.lib-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.arrange-btn {
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
}

.filter-strip,
.add-strip,
.finish-strip {
  gap: 8px;
  align-items: center;
}

.filter-strip .chip,
.add-strip .chip,
.finish-strip .chip {
  flex-shrink: 0;
}

.filter-note {
  margin: -6px 0 0;
  font-size: 12px;
}

.empty-lib {
  text-align: center;
  padding: 32px 16px;
  color: var(--text-secondary);
  font-size: 13.5px;
}

/* ---------- Arrange toolbar ---------- */
.arrange-panel {
  position: sticky;
  top: calc(var(--safe-top) + 4px);
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-lg);
  background: rgba(27, 24, 24, 0.94);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--border-strong);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
}

.arrange-bar {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.arrange-hint {
  font-size: 12.5px;
}

.sel-label {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.sel-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.icon-btn.sm {
  width: 34px;
  height: 34px;
}

.icon-btn.sm:disabled {
  opacity: 0.35;
}

.icon-btn.danger {
  color: #e07a6e;
}

.add-label {
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.add-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chip-art {
  display: inline-block;
  width: 14px;
  height: 20px;
}

.chip-art.pair {
  display: inline-flex;
  gap: 5px;
  width: auto;
}

.chip-art.pair > * {
  width: 7px;
}

/* ---------- Bookshelf ---------- */
.cozy-shelf-case {
  border-radius: var(--radius-lg);
  padding: 18px 14px 10px;
  background: linear-gradient(180deg, #1b1512 0%, #14100e 100%);
  border: 1px solid rgba(255, 232, 214, 0.09);
  box-shadow: inset 0 18px 36px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.cozy-shelf-case.editing {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
}

.shelf-tier {
  display: flex;
  flex-direction: column;
}

.shelf-books {
  display: flex;
  align-items: flex-end;
  width: 100%;
  padding: 0 2px;
  position: relative;
}

.shelf-cell {
  position: relative;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  align-items: flex-end;
  transform-origin: bottom center;
  transition: transform 0.18s ease, opacity 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}

.shelf-cell.kind-book:hover {
  transform: translateY(-4px);
}

.shelf-cell.faded {
  opacity: 0.16;
}

/* In arrange mode the cell owns the gesture (no image callouts / link drags) */
.editing .shelf-cell * {
  pointer-events: none;
}

.editing .shelf-cell {
  cursor: grab;
  /* Let the browser scroll vertically; sideways moves are ours to drag */
  touch-action: pan-y;
}

.editing .shelf-cell.kind-space {
  border: 1.5px dashed rgba(255, 236, 220, 0.25);
  border-radius: 6px;
}

.shelf-cell.selected {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 6px;
}

.shelf-cell.lifted {
  opacity: 0.25;
}

/* Insertion marker while dragging */
.shelf-cell.drop-before::before,
.shelf-cell.drop-after::after {
  content: '';
  position: absolute;
  top: 6%;
  bottom: 0;
  width: 3px;
  border-radius: 2px;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
}

.shelf-cell.drop-before::before {
  left: -6px;
}

.shelf-cell.drop-after::after {
  right: -6px;
}

.shelf-tier.drop-end .shelf-books::after {
  content: '';
  align-self: stretch;
  width: 3px;
  margin-left: 6px;
  margin-top: 4%;
  border-radius: 2px;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
}

.shelf-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
}

.shelf-progress {
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 4px;
  height: 3px;
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.55);
  overflow: hidden;
}

.shelf-progress span {
  display: block;
  height: 100%;
  background: var(--accent);
}

.shelf-plank {
  position: relative;
  height: 14px;
  margin-top: -2px;
  border-radius: 4px;
  background: linear-gradient(180deg, #593b2a 0%, #3a2419 60%, #24150e 100%);
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 224, 198, 0.22);
}

.cozy-shelf-case[data-shelf='oak'] .shelf-plank {
  background: linear-gradient(180deg, #8c6642 0%, #634529 65%, #3d2a18 100%);
}

.cozy-shelf-case[data-shelf='espresso'] .shelf-plank {
  background: linear-gradient(180deg, #322420 0%, #1d1412 65%, #110c0b 100%);
}

.cozy-shelf-case[data-shelf='minimal'] .shelf-plank {
  background: linear-gradient(180deg, #3d393a 0%, #262324 70%, #181617 100%);
}

.break-tag {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: var(--accent-on);
  background: var(--accent);
}

/* ---------- Drag ghost ---------- */
.drag-ghost {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 120;
  pointer-events: none;
  display: flex;
  align-items: flex-end;
  filter: drop-shadow(0 14px 22px rgba(0, 0, 0, 0.6));
  will-change: transform;
}
</style>
