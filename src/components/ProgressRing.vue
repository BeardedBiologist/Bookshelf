<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    percent: number
    size?: number
    strokeWidth?: number
    sublabel?: string
  }>(),
  {
    size: 136,
    strokeWidth: 10,
    sublabel: '',
  },
)

const clamped = computed(() => Math.min(100, Math.max(0, Math.round(props.percent))))
const radius = computed(() => (props.size - props.strokeWidth) / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const dashOffset = computed(() => circumference.value * (1 - clamped.value / 100))
</script>

<template>
  <div class="ring-wrap" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="ring-svg">
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="#161313"
        stroke="rgba(255, 245, 238, 0.14)"
        :stroke-width="strokeWidth"
      />
      <circle
        :cx="size / 2"
        :cy="size / 2"
        :r="radius"
        fill="none"
        stroke="var(--accent)"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        class="ring-progress"
      />
    </svg>
    <div class="ring-center">
      <span class="ring-pct tabular">{{ clamped }}%</span>
      <span v-if="sublabel" class="ring-sub tabular">{{ sublabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.ring-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ring-svg {
  transform: rotate(-90deg);
}

.ring-progress {
  transition: stroke-dashoffset 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

.ring-pct {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  line-height: 1.1;
}

.ring-sub {
  font-size: 11px;
  color: var(--text-secondary);
}
</style>
