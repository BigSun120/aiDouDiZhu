<template>
  <div class="log-panel">
    <div class="log-header">
      <span class="hint">最新在上</span>
    </div>
    <div v-if="collapsed" class="collapsed">已折叠</div>
    <div v-else>
      <div v-if="!logs.length" class="empty">暂无日志</div>
      <div v-else>
        <div v-for="item in logs" :key="item.ts" class="log-entry">
          <span class="tag">{{ item.seat ?? '系统' }}</span>
          <div>
            <div>{{ item.message }}</div>
            <small>{{ formatTime(item.ts) }}</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LogEntry } from '../game/types'

defineProps<{
  logs: LogEntry[]
  collapsed?: boolean
}>()

const formatTime = (ts: number) => {
  const date = new Date(ts)
  const [h, m, s] = [date.getHours(), date.getMinutes(), date.getSeconds()].map((v) =>
    String(v).padStart(2, '0'),
  )
  return `${h}:${m}:${s}`
}
</script>

<style scoped>
.log-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}

.hint {
  color: var(--muted);
  font-size: 12px;
}

.empty {
  color: var(--muted);
  font-size: 13px;
}

.collapsed {
  color: var(--muted);
  font-size: 13px;
}
</style>
