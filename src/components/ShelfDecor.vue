<script setup lang="ts">
import type { ShelfDecorKind } from '@/types/models'

/**
 * Decorative shelf pieces. Each is drawn in a viewBox whose width matches the
 * piece's shelf width (1 book = 100 wide) and whose height is a full book
 * (150), with the artwork sitting on the bottom edge.
 */
const props = withDefaults(
  defineProps<{ kind: ShelfDecorKind; flip?: boolean; variant?: string | null }>(),
  { flip: false, variant: null },
)

const VIEW_WIDTH: Record<ShelfDecorKind, number> = {
  space: 50,
  candle: 55,
  bookend: 35,
  plant: 70,
  stack: 95,
  break: 1,
}

const uid = `d${Math.random().toString(36).slice(2, 8)}`
</script>

<template>
  <svg
    v-if="props.kind !== 'space' && props.kind !== 'break'"
    class="shelf-decor-svg"
    :viewBox="`0 0 ${VIEW_WIDTH[props.kind]} 150`"
    preserveAspectRatio="xMidYMax meet"
    aria-hidden="true"
  >
    <g :transform="props.flip ? `translate(${VIEW_WIDTH[props.kind]},0) scale(-1,1)` : undefined">
      <!-- Candle in a glass jar -->
      <template v-if="props.kind === 'candle'">
        <defs>
          <radialGradient :id="`${uid}-glow`" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#ffb35c" stop-opacity="0.55" />
            <stop offset="100%" stop-color="#ffb35c" stop-opacity="0" />
          </radialGradient>
          <linearGradient :id="`${uid}-jar`" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="#7a4f3e" />
            <stop offset="45%" stop-color="#c8967f" />
            <stop offset="100%" stop-color="#5c3a2e" />
          </linearGradient>
          <linearGradient :id="`${uid}-flame`" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#fff6d8" />
            <stop offset="55%" stop-color="#ffc56b" />
            <stop offset="100%" stop-color="#f07f2e" />
          </linearGradient>
        </defs>
        <ellipse class="candle-glow" cx="27.5" cy="88" rx="27" ry="30" :fill="`url(#${uid}-glow)`" />
        <rect x="5" y="94" width="45" height="56" rx="7" :fill="`url(#${uid}-jar)`" stroke="rgba(255,236,220,0.28)" />
        <ellipse cx="27.5" cy="101" rx="18" ry="3.6" fill="#f1dcc6" opacity="0.9" />
        <rect x="5" y="118" width="45" height="16" fill="rgba(24,16,13,0.45)" />
        <rect x="15" y="124.5" width="25" height="3" rx="1.5" fill="rgba(255,236,220,0.45)" />
        <line x1="27.5" y1="101" x2="27.5" y2="94" stroke="#2a1d17" stroke-width="1.6" stroke-linecap="round" />
        <path
          class="candle-flame"
          d="M27.5 76 C33.5 85 33 92.5 27.5 95.5 C22 92.5 21.5 85 27.5 76 Z"
          :fill="`url(#${uid}-flame)`"
        />
      </template>

      <!-- Bookends: the flat face is on the left (against the books) unless flipped -->
      <template v-else-if="props.kind === 'bookend'">
        <!-- Marble arch slab -->
        <template v-if="props.variant === 'marble'">
          <defs>
            <linearGradient :id="`${uid}-marble`" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="#f4efe9" />
              <stop offset="60%" stop-color="#d6cec5" />
              <stop offset="100%" stop-color="#a99f95" />
            </linearGradient>
          </defs>
          <path d="M3 150 V84 H17 A14 14 0 0 1 31 98 V150 Z" :fill="`url(#${uid}-marble)`" />
          <path d="M8 96 C14 104 11 116 19 124 C24 129 22 138 27 146" fill="none" stroke="rgba(110,100,95,0.45)" stroke-width="0.9" />
          <path d="M22 100 C19 108 25 112 24 120" fill="none" stroke="rgba(110,100,95,0.3)" stroke-width="0.7" />
          <path d="M3 84 H17 A14 14 0 0 1 31 98" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1" />
        </template>

        <!-- Walnut stepped block -->
        <template v-else-if="props.variant === 'walnut'">
          <defs>
            <linearGradient :id="`${uid}-walnut`" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stop-color="#8a5a3b" />
              <stop offset="100%" stop-color="#4b2e1d" />
            </linearGradient>
          </defs>
          <path d="M3 150 V78 H15 V100 H24 V122 H33 V150 Z" :fill="`url(#${uid}-walnut)`" />
          <path d="M6 84 C9 100 6 120 9 146 M11 90 C13 110 11 128 13 146 M19 106 C21 120 19 134 21 146 M27 128 C28 136 27 142 28 146"
            fill="none" stroke="rgba(30,15,8,0.35)" stroke-width="0.8" />
          <path d="M3 78 H15 M15 100 H24 M24 122 H33" stroke="rgba(255,220,190,0.4)" stroke-width="1" />
        </template>

        <!-- Golden crescent moon on a small plinth -->
        <template v-else-if="props.variant === 'moon'">
          <defs>
            <linearGradient :id="`${uid}-gold`" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="#f6d88f" />
              <stop offset="55%" stop-color="#d1a256" />
              <stop offset="100%" stop-color="#8d6430" />
            </linearGradient>
          </defs>
          <path d="M3 78 A33 33 0 0 1 3 144 A17 33 0 0 0 3 78 Z" :fill="`url(#${uid}-gold)`" />
          <path d="M26 84 l1.3 3 3 1.3 -3 1.3 -1.3 3 -1.3 -3 -3 -1.3 3 -1.3 Z" fill="#f6d88f" />
          <rect x="0" y="144" width="34" height="6" rx="1.5" fill="#3b2a1e" />
        </template>

        <!-- Ceramic cat sitting with its back to the books -->
        <template v-else-if="props.variant === 'cat'">
          <defs>
            <linearGradient :id="`${uid}-cat`" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stop-color="#cfc4b8" />
              <stop offset="45%" stop-color="#f3ece4" />
              <stop offset="100%" stop-color="#bdb1a4" />
            </linearGradient>
          </defs>
          <path
            d="M3 150 V100 C3 94 5 91 7 89 L6 75 L12 81 C14 80 16 80 18 81 L24 75 L23 89 C25 92 26 95 26 98 C31 106 33 118 33 132 C33 142 30 148 26 150 Z"
            :fill="`url(#${uid}-cat)`"
          />
          <path d="M26 149 C34 149 35 137 30 133" fill="none" stroke="#bdb1a4" stroke-width="3.2" stroke-linecap="round" />
          <ellipse cx="11.5" cy="88" rx="1.4" ry="1.9" fill="#3a2e28" />
          <ellipse cx="18.5" cy="88" rx="1.4" ry="1.9" fill="#3a2e28" />
          <path d="M14 92 l1 1 1 -1" fill="none" stroke="#c98d7e" stroke-width="0.9" />
        </template>

        <!-- Brass quarter-round (default) -->
        <template v-else>
          <defs>
            <linearGradient :id="`${uid}-brass`" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="#e2b887" />
              <stop offset="50%" stop-color="#a87648" />
              <stop offset="100%" stop-color="#5d3c22" />
            </linearGradient>
          </defs>
          <path d="M3 150 L3 70 C22 70 33 102 33 150 Z" :fill="`url(#${uid}-brass)`" />
          <path d="M3 70 C22 70 33 102 33 150" fill="none" stroke="rgba(255,240,215,0.55)" stroke-width="1.4" />
          <rect x="0" y="146" width="35" height="4" rx="1" fill="#4a2f1b" />
        </template>
      </template>

      <!-- Potted plant -->
      <template v-else-if="props.kind === 'plant'">
        <defs>
          <linearGradient :id="`${uid}-pot`" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="#8f4f35" />
            <stop offset="50%" stop-color="#c77b55" />
            <stop offset="100%" stop-color="#6f3a26" />
          </linearGradient>
        </defs>
        <g>
          <ellipse cx="35" cy="84" rx="7" ry="26" fill="#4b6847" transform="rotate(-52 35 110)" />
          <ellipse cx="35" cy="80" rx="7.5" ry="30" fill="#5f7d57" transform="rotate(-26 35 110)" />
          <ellipse cx="35" cy="76" rx="8" ry="34" fill="#6f8f65" />
          <ellipse cx="35" cy="80" rx="7.5" ry="30" fill="#55734f" transform="rotate(24 35 110)" />
          <ellipse cx="35" cy="84" rx="7" ry="26" fill="#7a9670" transform="rotate(50 35 110)" />
          <line x1="35" y1="110" x2="35" y2="56" stroke="rgba(20,30,18,0.35)" stroke-width="1" />
        </g>
        <path d="M17 113 H53 L48.5 150 H21.5 Z" :fill="`url(#${uid}-pot)`" />
        <rect x="13" y="107" width="44" height="8" rx="2.5" fill="#b56c4a" />
        <rect x="13" y="107" width="44" height="2" rx="1" fill="rgba(255,225,200,0.35)" />
      </template>

      <!-- Stack of books lying flat -->
      <template v-else-if="props.kind === 'stack'">
        <rect x="3" y="134" width="88" height="16" rx="2" fill="#6b3a33" />
        <rect x="80" y="134" width="5" height="16" fill="rgba(255,220,190,0.25)" />
        <rect x="9" y="119" width="80" height="15" rx="2" fill="#3d4e5c" />
        <rect x="14" y="119" width="4" height="15" fill="rgba(220,235,255,0.22)" />
        <rect x="2" y="105" width="82" height="14" rx="2" fill="#a07d55" />
        <rect x="72" y="105" width="4" height="14" fill="rgba(60,35,15,0.35)" />
        <rect x="3" y="105" width="81" height="1.5" fill="rgba(255,240,220,0.35)" />
      </template>
    </g>
  </svg>
</template>

<style scoped>
.shelf-decor-svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.candle-flame {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: flicker 2.6s ease-in-out infinite;
}

.candle-glow {
  animation: glow 2.6s ease-in-out infinite;
}

@keyframes flicker {
  0%, 100% { transform: scale(1, 1) rotate(0deg); }
  25% { transform: scale(0.94, 1.06) rotate(-2deg); }
  50% { transform: scale(1.04, 0.95) rotate(1.5deg); }
  75% { transform: scale(0.97, 1.04) rotate(-1deg); }
}

@keyframes glow {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.78; }
}

@media (prefers-reduced-motion: reduce) {
  .candle-flame,
  .candle-glow {
    animation: none;
  }
}
</style>
