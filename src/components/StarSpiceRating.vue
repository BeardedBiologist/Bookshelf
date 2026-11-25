<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    rating: number
    spice?: number
    showSpice?: boolean
    interactive?: boolean
    size?: number
  }>(),
  {
    spice: 0,
    showSpice: false,
    interactive: false,
    size: 18,
  },
)

const emit = defineEmits<{
  'update:rating': [val: number]
  'update:spice': [val: number]
}>()

function onStarClick(starIndex: number, event: MouseEvent) {
  if (!props.interactive) return
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const isLeftHalf = event.clientX - rect.left < rect.width / 2
  const candidate = isLeftHalf ? starIndex - 0.5 : starIndex
  emit('update:rating', props.rating === candidate ? 0 : candidate)
}

function onSpiceClick(level: number) {
  if (!props.interactive) return
  emit('update:spice', props.spice === level ? 0 : level)
}

function starState(index: number): 'full' | 'half' | 'empty' {
  if (props.rating >= index) return 'full'
  if (props.rating >= index - 0.5) return 'half'
  return 'empty'
}
</script>

<template>
  <div class="rating-row">
    <div class="star-group" :class="{ interactive }">
      <button
        v-for="i in 5"
        :key="i"
        type="button"
        class="glyph-btn"
        :disabled="!interactive"
        :aria-label="`Rate ${i} stars`"
        @click="onStarClick(i, $event)"
      >
        <svg :width="size" :height="size" viewBox="0 0 24 24">
          <defs>
            <linearGradient :id="`half-star-${i}-${size}`">
              <stop offset="50%" stop-color="#F5F0EC" />
              <stop offset="50%" stop-color="transparent" />
            </linearGradient>
          </defs>
          <path
            d="M12 2.4l2.92 5.92 6.53.95-4.72 4.6 1.12 6.51L12 17.3l-5.85 3.08 1.12-6.51-4.72-4.6 6.53-.95L12 2.4z"
            :fill="
              starState(i) === 'full'
                ? '#F5F0EC'
                : starState(i) === 'half'
                  ? `url(#half-star-${i}-${size})`
                  : 'none'
            "
            stroke="#F5F0EC"
            :stroke-opacity="starState(i) === 'empty' ? 0.45 : 1"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <span v-if="showSpice" class="divider" />

    <div v-if="showSpice" class="spice-group" :class="{ interactive }">
      <button
        v-for="i in 5"
        :key="i"
        type="button"
        class="glyph-btn"
        :disabled="!interactive"
        :aria-label="`Spice level ${i}`"
        @click="onSpiceClick(i)"
      >
        <!-- Minimalist chili pepper icon matching screenshot -->
        <svg :width="size" :height="size" viewBox="0 0 24 24">
          <path
            d="M15.8 5.2c.6-1.3 1.8-2 3-2.1"
            fill="none"
            :stroke="spice >= i ? 'var(--accent)' : '#F5F0EC'"
            :stroke-opacity="spice >= i ? 1 : 0.45"
            stroke-width="1.7"
            stroke-linecap="round"
          />
          <path
            d="M15.5 6.4c2.1.4 3.2 2.3 2.5 5-1.1 4.2-4.7 7.9-9.7 9-1.1.2-2-.6-1.5-1.6 1.5-2.6 3.5-4.3 4.8-7.4.7-1.7.7-3.4 1.6-4.4.6-.6 1.4-.8 2.3-.6z"
            :fill="spice >= i ? 'var(--accent)' : 'none'"
            :stroke="spice >= i ? 'var(--accent)' : '#F5F0EC'"
            :stroke-opacity="spice >= i ? 1 : 0.48"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.rating-row {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.star-group,
.spice-group {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.glyph-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px;
}

.glyph-btn:disabled {
  opacity: 1;
  cursor: default;
}

.interactive .glyph-btn:active {
  transform: scale(0.88);
}

.divider {
  width: 1px;
  height: 16px;
  background: rgba(255, 245, 238, 0.25);
}
</style>
