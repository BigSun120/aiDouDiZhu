<template>
  <div
    class="playing-card"
    :class="{
      selectable,
      selected,
      hidden,
      red: isRed,
    }"
    @click="handleClick"
  >
    <div v-if="hidden" class="card-back">AI</div>
    <div v-else class="card-face">
      <div class="rank">{{ rankLabel }}</div>
      <div class="suit">{{ suitLabel }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Card, Suit } from '../game/types'

const props = defineProps<{
  card: Card
  hidden?: boolean
  selectable?: boolean
  selected?: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle', card: Card): void
}>()

const rankLabel = computed(() => {
  if (props.card.rank === 'BJ') return 'JOKER'
  if (props.card.rank === 'RJ') return 'JOKER'
  return props.card.rank
})

const suitSymbolMap: Record<Suit, string> = {
  S: '♠',
  H: '♥',
  C: '♣',
  D: '♦',
}

const isRed = computed(() => props.card.suit === 'H' || props.card.suit === 'D')

const suitLabel = computed(() => {
  if (!props.card.suit) return props.card.rank === 'RJ' ? '🟥' : props.card.rank === 'BJ' ? '⬛' : '★'
  return suitSymbolMap[props.card.suit]
})

const handleClick = () => {
  if (props.selectable) emit('toggle', props.card)
}
</script>

<style scoped>
.playing-card {
  width: 52px;
  height: 74px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  transition: transform 0.18s ease, box-shadow 0.18s ease, translate 0.18s ease;
  cursor: default;
  position: relative;
  user-select: none;
}

.playing-card.selectable {
  cursor: pointer;
}

.playing-card.selected {
  transform: translateY(-10px);
  box-shadow: 0 12px 20px rgba(31, 157, 114, 0.3);
}

.playing-card.hidden {
  background: linear-gradient(135deg, #1f9d72 0%, #157758 100%);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}

.card-face {
  text-align: center;
}

.rank {
  font-size: 18px;
}

.suit {
  font-size: 16px;
}

.playing-card.red {
  color: #c0392b;
}

.card-back {
  font-size: 12px;
  letter-spacing: 0.6px;
}
</style>
