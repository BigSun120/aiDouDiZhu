<template>
  <div class="app-shell">
    <div class="toolbar">
      <div>
        <h1>AI 斗地主</h1>
      </div>
      <div class="actions">
        <button @click="startNewGame">{{ gameStarted ? '重新开局' : '开始游戏' }}</button>
        <button class="secondary" @click="showAllHands = !showAllHands">
          {{ showAllHands ? '关闭上帝视角' : '上帝视角：显示所有手牌' }}
        </button>
        <button class="secondary" @click="showAiThoughts = !showAiThoughts">
          {{ showAiThoughts ? '👁️ 隐藏AI思考' : '👁️ 显示AI思考' }}
        </button>
        <button class="secondary" @click="showPersonaModal = true">形象设定</button>
        <button class="secondary" @click="showSettings = true">设置</button>
      </div>
    </div>

    <div class="pill">
      <span>阶段：{{ stageLabel }}</span>
      <span>当前行动：{{ players[game.currentSeat].name }}</span>
      <span v-if="game.landlord">地主：{{ players[game.landlord].name }}</span>
    </div>

    <div class="table">
      <template v-if="gameStarted">
        <div class="board-row">
          <div class="player-seat area-north">
            <div class="player-meta">
              <span>底牌</span>
              <span class="tag">{{ game.bottomCards.length ? '已发放给地主' : '等待发牌' }}</span>
            </div>
            <div class="hand">
              <PlayingCard v-for="card in game.bottomCards" :key="card.id" :card="card"
                :hidden="!game.landlord || (game.stage === 'bidding')" />
            </div>
          </div>
        </div>

        <div class="board-row middle-row">
          <div class="player-seat compact" :class="{ current: game.currentSeat === 'west' }">
            <div class="player-meta">
              <div class="meta-left">
                <span>{{ players.west.name }}</span>
                <span class="role farmer" v-if="players.west.role === 'farmer'">农民</span>
                <span class="role landlord" v-else>地主</span>
              </div>
              <button class="bubble-btn" v-if="speech.west" @click.stop="toggleSpeech('west')">💬</button>
            </div>
            <div class="meta-line">
              <span class="tag">手牌：{{ players.west.hand.length }}</span>
              <span class="tag" v-if="players.west.modelLabel">模型: {{ players.west.modelLabel }}</span>
              <span class="tag" v-if="players.west.thinking">思考中…</span>
            </div>
            <div class="hand grid-5">
              <PlayingCard v-for="(card, idx) in displayHand(players.west)" :key="card.id + idx" :card="card"
                :hidden="players.west.isAI && !showAllHands" />
            </div>
            <div class="meta-line" v-if="players.west.lastReason && showAiThoughts">
              <small class="muted">{{ players.west.lastReason }}</small>
            </div>
            <div v-if="speech.west?.visible" class="speech-bubble" @click="openSpeechModal('west')">
              <p>{{ speech.west?.text }}</p>
              <button class="speech-expand" @click.stop="openSpeechModal('west')">展开</button>
              <small class="muted close-link" @click.stop="hideSpeech('west')">点击关闭</small>
            </div>
          </div>

          <div class="table-center">
            <div class="center-board">
              <div class="center-header">
                <span style="min-width: 150px;">最近一手</span>
                <span class="muted" v-if="!game.lastPlay">暂无出牌</span>
                <span class="muted" v-else>{{ players[game.lastPlay.seat].name }} 出牌</span>
              </div>
              <div class="card-stack">
                <PlayingCard v-for="card in game.lastPlay?.cards ?? []" :key="card.id" :card="card" />
              </div>
            </div>
          </div>

          <div class="player-seat compact" :class="{ current: game.currentSeat === 'east' }">
            <div class="player-meta">
              <div class="meta-left">
                <span>{{ players.east.name }}</span>
                <span class="role farmer" v-if="players.east.role === 'farmer'">农民</span>
                <span class="role landlord" v-else>地主</span>
              </div>
              <button class="bubble-btn" v-if="speech.east" @click.stop="toggleSpeech('east')">💬</button>
            </div>
            <div class="meta-line">
              <span class="tag">手牌：{{ players.east.hand.length }}</span>
              <span class="tag" v-if="players.east.modelLabel">模型: {{ players.east.modelLabel }}</span>
              <span class="tag" v-if="players.east.thinking">思考中…</span>
            </div>
            <div class="hand grid-5">
              <PlayingCard v-for="(card, idx) in displayHand(players.east)" :key="card.id + idx" :card="card"
                :hidden="players.east.isAI && !showAllHands" />
            </div>
            <div class="meta-line" v-if="players.east.lastReason && showAiThoughts">
              <small class="muted">{{ players.east.lastReason }}</small>
            </div>
            <div v-if="speech.east?.visible" class="speech-bubble" @click="openSpeechModal('east')">
              <p>{{ speech.east?.text }}</p>
              <button class="speech-expand" @click.stop="openSpeechModal('east')">展开</button>
              <small class="muted close-link" @click.stop="hideSpeech('east')">点击关闭</small>
            </div>
          </div>
        </div>

        <div class="board-row">
          <div class="player-seat area-south" :class="{ current: game.currentSeat === 'me' }">
            <div class="player-meta">
              <div class="meta-left">
                <span>{{ players.me.name }}</span>
                <span class="role farmer" v-if="players.me.role === 'farmer'">农民</span>
                <span class="role landlord" v-else>地主</span>
              </div>
              <button class="bubble-btn" v-if="speech.me" @click.stop="toggleSpeech('me')">💬</button>
            </div>
            <div class="meta-line">
              <span class="tag">手牌：{{ players.me.hand.length }}</span>
              <span class="tag" v-if="game.stage === 'bidding'">等待抢地主</span>
            </div>
            <div class="hand">
              <PlayingCard v-for="card in players.me.hand" :key="card.id" :card="card" selectable
                :selected="selectedIds.has(card.id)" @toggle="toggleSelect(card)" />
            </div>
            <div class="controls" v-if="game.stage === 'bidding' && waitingForBid">
              <button v-for="bid in [1, 2, 3]" :key="bid" @click="resolveBid(bid)"
                :disabled="!availableBids.includes(bid)">
                叫 {{ bid }} 分
              </button>
              <button class="secondary" @click="resolveBid(0)">不叫</button>
            </div>
            <div class="controls" v-else-if="game.stage === 'playing' && game.currentSeat === 'me'">
              <button @click="playSelected" :disabled="!selectedIds.size && !!game.lastPlay">出牌</button>
              <button class="secondary" @click="passTurn" :disabled="!game.lastPlay">不要</button>
            </div>
            <div class="controls" v-else>
              <span class="muted">等待其他玩家行动…</span>
            </div>
            <div class="talk-box">
              <input v-model="humanTalkText" :disabled="humanTalkUsedTurn || game.currentSeat !== 'me'"
                placeholder="牌桌发言（每回合一次机会）" />
              <button class="secondary"
                :disabled="humanTalkUsedTurn || !humanTalkText.trim() || game.currentSeat !== 'me'"
                @click="sendHumanTalk">
                {{ humanTalkUsedTurn ? '已发送' : '发送' }}
              </button>
            </div>
            <div v-if="speech.me?.visible" class="speech-bubble my-bubble" @click="openSpeechModal('me')">
              <p>{{ speech.me?.text }}</p>
              <button class="speech-expand" @click.stop="openSpeechModal('me')">展开</button>
              <small class="muted close-link" @click.stop="hideSpeech('me')">点击关闭</small>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="start-placeholder">点击“开始游戏”进行发牌</div>
    </div>

    <div class="layout-bottom">
    </div>

    <div class="log-fab" @click="showLogPanel = !showLogPanel">
      📝
    </div>
    <div class="log-floating" v-if="showLogPanel">
      <header>
        <strong>思考日志</strong>
        <button class="secondary mini" @click="showLogPanel = false">关闭</button>
      </header>
      <div class="log-body">
        <LogPanel :logs="logs" :collapsed="false" />
      </div>
    </div>

    <SettingsModal :open="showSettings" :global-config="settings.global" :role-config="settings.role"
      :self-config="settings.self" :use-role-model="settings.useRoleModel" :use-self-ai="settings.useSelfAi"
      :use-breaker-prompt="settings.useBreakerPrompt" @close="showSettings = false" @save="saveSettings" />

    <div v-if="showVictoryModal" class="modal-backdrop" @click.self="showVictoryModal = false">
      <div class="modal">
        <header>
          <h3>胜利！</h3>
          <button class="secondary" @click="showVictoryModal = false">关闭</button>
        </header>
        <p>本局胜者：{{ players[game.winner!]?.name ?? '未知' }}</p>
        <div class="stats">
          <div class="stat-item">
            <strong>总局数</strong>
            <span>{{ stats.total }}</span>
          </div>
          <div class="stat-item">
            <strong>我</strong>
            <span>{{ stats.me }}</span>
          </div>
          <div class="stat-item">
            <strong>{{ players.west.name }}</strong>
            <span>{{ stats.west }}</span>
          </div>
          <div class="stat-item">
            <strong>{{ players.east.name }}</strong>
            <span>{{ stats.east }}</span>
          </div>
        </div>
        <footer class="modal-actions">
          <button class="secondary" @click="showVictoryModal = false">稍后再战</button>
          <button @click="startNewGame">立即再来一局</button>
        </footer>
      </div>
    </div>

    <div v-if="showPersonaModal" class="modal-backdrop" @click.self="showPersonaModal = false">
      <div class="modal">
        <header>
          <h3>形象设定</h3>
          <button class="secondary" @click="showPersonaModal = false">关闭</button>
        </header>
        <div class="persona-modal">
          <div class="persona-item">
            <label>西家 AI</label>
            <input v-model="aiNames.west" placeholder="名称（本地保存）" />
            <textarea v-model="aiProfiles.west" rows="3" placeholder="性格、外貌、说话风格等"></textarea>
          </div>
          <div class="persona-item">
            <label>东家 AI</label>
            <input v-model="aiNames.east" placeholder="名称（本地保存）" />
            <textarea v-model="aiProfiles.east" rows="3" placeholder="性格、外貌、说话风格等"></textarea>
          </div>
          <div class="persona-item">
            <label>玩家（我）</label>
            <textarea v-model="aiProfiles.me" rows="3" placeholder="写下你的性格关键词、语气、形象等，AI 会按此互动"></textarea>
          </div>
        </div>
        <footer class="modal-actions">
          <button class="secondary" @click="showPersonaModal = false">取消</button>
          <button @click="savePersona">保存</button>
        </footer>
      </div>
    </div>

    <div v-if="speechModalSeat" class="modal-backdrop" @click.self="speechModalSeat = null">
      <div class="modal">
        <header>
          <h3>发言详情</h3>
          <button class="secondary" @click="speechModalSeat = null">关闭</button>
        </header>
        <p class="muted">玩家：{{ speechModalSeat && players[speechModalSeat]?.name }}</p>
        <p>{{ speechModalSeat ? speech[speechModalSeat]?.text : '' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import PlayingCard from './components/PlayingCard.vue'
import SettingsModal from './components/SettingsModal.vue'
import LogPanel from './components/LogPanel.vue'
import { canBeat, deal, evaluateCombo, formatCards, nextSeat, sortCards } from './game/cards'
import { pickFallbackMove } from './game/aiFallback'
import { callLLM, callBidLLM } from './ai/client'
import { buildDecisionMessages } from './ai/promptBuilder'
import { buildBidMessages } from './ai/bidPromptBuilder'
import breakerPack from '../prompts/嬷User的脑残粉古酱 2025Dec01.json'
import type {
  AiDecision,
  AiBidDecision,
  Card,
  GameState,
  LogEntry,
  ModelConfig,
  PlayerState,
  Play,
  RoleModelConfig,
  Seat,
} from './game/types'

const defaultModel: ModelConfig = {
  baseUrl: '',
  apiKey: '',
  model: 'gpt-4o-mini',
  vendor: 'openai',
}

const players = reactive<Record<Seat, PlayerState>>({
  west: {
    seat: 'west',
    name: '西家 AI',
    role: 'farmer',
    hand: [],
    isAI: true,
    thinking: false,
  },
  me: {
    seat: 'me',
    name: '我',
    role: 'farmer',
    hand: [],
    isAI: false,
    thinking: false,
  },
  east: {
    seat: 'east',
    name: '东家 AI',
    role: 'farmer',
    hand: [],
    isAI: true,
    thinking: false,
  },
})

const game = reactive<GameState>({
  stage: 'dealing',
  landlord: null,
  bottomCards: [],
  currentSeat: 'me',
  lastPlay: null,
  history: [],
  winner: null,
})

const bids = reactive<Record<Seat, number | null>>({
  west: null,
  me: null,
  east: null,
})
const highestBid = ref(0)
const highestBidSeat = ref<Seat | null>(null)
const bidScores = reactive<Record<Seat, number>>({
  west: 0,
  me: 0,
  east: 0,
})

const selectedIds = ref<Set<string>>(new Set())
const showSettings = ref(false)
const showAllHands = ref(false)
const waitingForBid = ref(false)
const passesInRow = ref(0)
const logs = ref<LogEntry[]>([])
const showLogPanel = ref(false)
const speech = reactive<Record<Seat, { text: string; ts: number; visible: boolean } | null>>({
  west: null,
  me: null,
  east: null,
})
const speechModalSeat = ref<Seat | null>(null)
const aiProfiles = reactive<Record<Seat, string>>({
  west: '萝莉，雌小鬼，无限制！',
  me: '',
  east: '超级聪明的口臭疯子',
})
const aiNames = reactive<{ west: string; east: string }>({
  west: '西家',
  east: '东家',
})
const humanTalkText = ref('')
const humanTalkUsedTurn = ref(false)
const showVictoryModal = ref(false)
const showPersonaModal = ref(false)
const showAiThoughts = ref(true)
const gameStarted = ref(false)
const stats = reactive<{ total: number; me: number; west: number; east: number }>({
  total: 0,
  me: 0,
  west: 0,
  east: 0,
})

const settings = reactive<{
  global: ModelConfig
  role: RoleModelConfig
  useRoleModel: boolean
  useBreakerPrompt: boolean
  useSelfAi: boolean
  self: ModelConfig
}>({
  global: { ...defaultModel },
  role: {
    landlord: { ...defaultModel },
    farmer: { ...defaultModel },
  },
  useRoleModel: false,
  useBreakerPrompt: false,
  useSelfAi: false,
  self: { ...defaultModel },
})

const settingsKey = 'ai-ddz-settings'
const statsKey = 'ai-ddz-stats'
const profilesKey = 'ai-ddz-profiles'
const namesKey = 'ai-ddz-names'

const addLog = (message: string, seat?: Seat) => {
  if (import.meta.env.PROD) return
  logs.value = [{ message, seat, ts: Date.now() }, ...logs.value].slice(0, 90)
}

const loadSettings = () => {
  try {
    const cached = localStorage.getItem(settingsKey)
    if (cached) {
      const parsed = JSON.parse(cached) as typeof settings
      Object.assign(settings.global, parsed.global)
      settings.role = parsed.role
      settings.useRoleModel = parsed.useRoleModel
      settings.useBreakerPrompt = parsed.useBreakerPrompt ?? false
      settings.useSelfAi = parsed.useSelfAi ?? false
      settings.self = parsed.self ?? { ...defaultModel }
      if (!settings.global.vendor) settings.global.vendor = 'openai'
      if (settings.role.landlord && !settings.role.landlord.vendor) settings.role.landlord.vendor = 'openai'
      if (settings.role.farmer && !settings.role.farmer.vendor) settings.role.farmer.vendor = 'openai'
      if (!settings.self.vendor) settings.self.vendor = 'openai'
    }
  } catch (err) {
    console.warn('无法读取本地配置', err)
  }
}

const loadStats = () => {
  try {
    const cached = localStorage.getItem(statsKey)
    if (cached) {
      const parsed = JSON.parse(cached) as typeof stats
      Object.assign(stats, parsed)
    }
  } catch (err) {
    console.warn('无法读取战绩', err)
  }
}

const loadProfiles = () => {
  try {
    const cached = localStorage.getItem(profilesKey)
    if (cached) {
      const parsed = JSON.parse(cached) as typeof aiProfiles
      Object.assign(aiProfiles, parsed)
    }
  } catch (err) {
    console.warn('无法读取 AI 设定', err)
  }
}

const loadNames = () => {
  try {
    const cached = localStorage.getItem(namesKey)
    if (cached) {
      const parsed = JSON.parse(cached) as typeof aiNames
      Object.assign(aiNames, parsed)
      players.west.name = aiNames.west
      players.east.name = aiNames.east
    }
  } catch (err) {
    console.warn('无法读取 AI 名称', err)
  }
}

const persistSettings = () => {
  localStorage.setItem(settingsKey, JSON.stringify(settings))
}

const persistStats = () => {
  localStorage.setItem(statsKey, JSON.stringify(stats))
}

const persistProfiles = () => {
  localStorage.setItem(profilesKey, JSON.stringify(aiProfiles))
}

const persistNames = () => {
  localStorage.setItem(namesKey, JSON.stringify(aiNames))
}

const saveSettings = (payload: { global: ModelConfig; role: RoleModelConfig; useRoleModel: boolean; useBreakerPrompt: boolean; self: ModelConfig; useSelfAi: boolean }) => {
  Object.assign(settings.global, payload.global)
  settings.role = payload.role
  settings.useRoleModel = payload.useRoleModel
  settings.useBreakerPrompt = payload.useBreakerPrompt
  settings.self = payload.self
  settings.useSelfAi = payload.useSelfAi
  showSettings.value = false
  persistSettings()
  addLog('已保存 AI 配置')
}
const savePersona = () => {
  players.west.name = aiNames.west || '西家 AI'
  players.east.name = aiNames.east || '东家 AI'
  persistProfiles()
  persistNames()
  showPersonaModal.value = false
  addLog('已保存 AI 形象与名称')
}

const stageLabel = computed(() => {
  switch (game.stage) {
    case 'dealing':
      return '发牌中'
    case 'bidding':
      return '叫分/抢地主'
    case 'playing':
      return '出牌'
    case 'ended':
      return '已结束'
  }
})

const availableBids = computed(() => [0, 1, 2, 3].filter((b) => b === 0 || b > highestBid.value))

const displayHand = (player: PlayerState) => {
  if (!player.isAI || showAllHands.value) return player.hand
  return Array.from({ length: player.hand.length }).map((_, idx) => ({
    id: `hidden-${player.seat}-${idx}`,
    rank: '3' as const,
    label: '暗牌',
  }))
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const defaultTalk = (_player: PlayerState, action: 'pass' | 'play') => {
  const passLines = [
    '这手先让一让，看你们怎么出',
    '过一手，别紧张我还藏着货',
    '先观察两步，等你们漏底牌',
  ]
  const playLines = [
    '上点小牌试水',
    '出这手试探一下',
    '先垫一轮，别慌',
  ]
  const pool = action === 'pass' ? passLines : playLines
  return pool[Math.floor(Math.random() * pool.length)]
}

const resetForNewGame = () => {
  selectedIds.value = new Set()
  passesInRow.value = 0
  game.history = []
  game.lastPlay = null
  game.winner = null
  game.landlord = null
  bids.west = bids.me = bids.east = null
  bidScores.west = bidScores.me = bidScores.east = 0
  highestBid.value = 0
  highestBidSeat.value = null
  speech.west = speech.me = speech.east = null
  showVictoryModal.value = false
  humanTalkText.value = ''
  humanTalkUsedTurn.value = false
  showLogPanel.value = false
  gameStarted.value = false
}

const startNewGame = async () => {
  resetForNewGame()
  gameStarted.value = true
  const { hands, bottom } = deal()
  players.west.hand = hands.west
  players.me.hand = hands.me
  players.east.hand = hands.east
  players.me.isAI = settings.useSelfAi
  game.bottomCards = bottom
  players.west.role = players.east.role = players.me.role = 'farmer'
  game.stage = 'bidding'
  game.currentSeat = ['west', 'me', 'east'][Math.floor(Math.random() * 3)] as Seat
  addLog('新局开始，等待叫分/抢地主')
  await delay(400)
  advanceBidding()
}

const calcBidScore = (player: PlayerState): number => {
  const highRanks = ['A', '2', 'BJ', 'RJ']
  const highCount = player.hand.filter((c) => highRanks.includes(c.rank)).length
  const counts = new Map<string, number>()
  player.hand.forEach((c) => counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1))
  let bombCount = 0
  counts.forEach((cnt) => {
    if (cnt >= 4) bombCount += 1
  })
  const rocket = counts.has('BJ') && counts.has('RJ') ? 1 : 0
  return highCount * 1.5 + bombCount * 4 + rocket * 5 + player.hand.length * 0.1
}

const resolveBid = (score: number) => {
  if (game.stage !== 'bidding' || !waitingForBid.value) return
  if (!availableBids.value.includes(score)) {
    addLog('必须叫更高的分数', 'me')
    return
  }
  waitingForBid.value = false
  bids.me = score
  bidScores.me = calcBidScore(players.me)
  if (score > highestBid.value) {
    highestBid.value = score
    highestBidSeat.value = 'me'
  }
  addLog(score > 0 ? `我叫了 ${score} 分` : '我选择不叫')
  if (score === 3) {
    finalizeBidding()
    return
  }
  proceedBiddingNext()
}

const advanceBidding = async () => {
  if (game.stage !== 'bidding') return
  const seat = game.currentSeat
  const player = players[seat]
  if (player.isAI) {
    await delay(500)
    await handleAiBid(player)
  } else {
    waitingForBid.value = true
  }
}

const proceedBiddingNext = () => {
  const allDone = Object.values(bids).every((v) => v !== null)
  if (allDone) {
    finalizeBidding()
    return
  }
  let next = nextSeat(game.currentSeat)
  let hops = 0
  while (bids[next] !== null && hops < 3) {
    next = nextSeat(next)
    hops += 1
  }
  game.currentSeat = next
  advanceBidding()
}

const finalizeBidding = () => {
  const seats: Seat[] = ['west', 'me', 'east']
  const bidders = seats.filter((seat) => (bids[seat] ?? 0) > 0)
  if (!bidders.length) {
    addLog('无人叫分，请点击开始游戏重新发牌')
    game.stage = 'ended'
    gameStarted.value = false
    return
  }
  const targetPool = bidders
  const maxScore = Math.max(...targetPool.map((s) => bids[s] ?? 0))
  const best = targetPool.filter((s) => (bids[s] ?? 0) === maxScore)
  const landlordSeat = best[Math.floor(Math.random() * best.length)] ?? game.currentSeat
  game.landlord = landlordSeat
  highestBidSeat.value = landlordSeat
  players[landlordSeat].role = 'landlord'
  seats.forEach((seat) => {
    if (seat !== landlordSeat) players[seat].role = 'farmer'
  })
  players[landlordSeat].hand = sortCards([...players[landlordSeat].hand, ...game.bottomCards])
  addLog(`${players[landlordSeat].name} 成为地主，获得底牌：${formatCards(game.bottomCards)}`, landlordSeat)
  addLog(
    `[DEBUG] finalizeBidding landlord=${landlordSeat} roles=${JSON.stringify({
      west: players.west.role,
      me: players.me.role,
      east: players.east.role,
    })} startSeat=${landlordSeat}`,
  )
  game.stage = 'playing'
  game.currentSeat = landlordSeat
  waitingForBid.value = false
  passesInRow.value = 0
  advancePlaying()
}

const mapDecisionCards = (decisionCards: string[], hand: Card[]): Card[] => {
  const remaining = [...hand]
  const chosen: Card[] = []
  decisionCards.forEach((target) => {
    const idx = remaining.findIndex(
      (c) => c.id === target || c.label === target || c.rank === (target as any),
    )
    if (idx >= 0) {
      chosen.push(remaining[idx])
      remaining.splice(idx, 1)
    }
  })
  return chosen
}

const applyPass = (seat: Seat, reason?: string) => {
  const lastHolder = game.lastPlay?.seat ?? null
  game.history = [...game.history, { seat, cards: [], combo: null, pass: true, reason }]
  passesInRow.value += 1
  if (passesInRow.value >= 2) {
    game.lastPlay = null
    passesInRow.value = 0
    game.currentSeat = lastHolder ?? nextSeat(seat)
    addLog(
      `[DEBUG] 两家不要，重置轮次，由上一次出牌者(${lastHolder ?? 'unknown'})重新领出`,
      lastHolder ?? undefined,
    )
  } else {
    game.currentSeat = nextSeat(seat)
  }
}

const concludePlay = (seat: Seat, play: Play) => {
  game.history = [...game.history, { ...play, reason: undefined }]
  game.lastPlay = { ...play, reason: undefined }
  passesInRow.value = 0
  if (!players[seat].hand.length) {
    game.winner = seat
    game.stage = 'ended'
    addLog(`${players[seat].name} 出完牌，胜利！`, seat)
    stats.total += 1
    stats[seat] += 1
    persistStats()
    showVictoryModal.value = true
    triggerPostGameTalks(seat)
    return
  }
  game.currentSeat = nextSeat(seat)
}

const handleAiBid = async (player: PlayerState) => {
  let activeConfig = settings.useRoleModel ? settings.role[player.role] ?? settings.global : settings.global
  if (player.seat === 'me' && settings.useSelfAi) {
    activeConfig = settings.self
  }
  if (!activeConfig.vendor) activeConfig.vendor = 'openai'
  let decision: AiBidDecision | null = null
  try {
    if (activeConfig.baseUrl && activeConfig.apiKey && activeConfig.model) {
      const messages = buildBidMessages({
        player,
        highestBid: highestBid.value,
        landlord: game.landlord,
        persona: aiProfiles[player.seat],
      })
      decision = await callBidLLM(activeConfig, messages)
    } else {
      addLog(
        `叫分 LLM 配置不完整，跳过调用。vendor=${activeConfig.vendor} url=${activeConfig.baseUrl} model=${activeConfig.model}`,
        player.seat,
      )
    }
  } catch (err) {
    addLog(`叫分 LLM 失败，使用兜底。${(err as Error).message}`, player.seat)
  }

  if (!decision) {
    addLog(
      `叫分 LLM 返回空或解析失败，使用兜底。vendor=${activeConfig.vendor} url=${activeConfig.baseUrl} model=${activeConfig.model}`,
      player.seat,
    )
    const score = calcBidScore(player)
    let bid = 0
    if (score > 8) bid = 3
    else if (score > 6) bid = 2
    else if (score > 5) bid = 1
    if (!availableBids.value.includes(bid)) bid = 0
    decision = { bid: bid as 0 | 1 | 2 | 3, reason: '兜底叫分', talk: bid > 0 ? '我来试试地主' : '这把先观察' }
  }

  const finalDecision: AiBidDecision = decision
  const bidValue = (availableBids.value.includes(finalDecision.bid) ? finalDecision.bid : 0) as 0 | 1 | 2 | 3
  bids[player.seat] = bidValue
  bidScores[player.seat] = calcBidScore(player)
  if (bidValue > highestBid.value) {
    highestBid.value = bidValue
    highestBidSeat.value = player.seat
  }
  if (finalDecision.talk) {
    addLog(finalDecision.talk, player.seat)
    speech[player.seat] = { text: finalDecision.talk, ts: Date.now(), visible: true }
  }
  addLog(bidValue > 0 ? `${player.name} 叫了 ${bidValue} 分` : `${player.name} 选择不叫`, player.seat)
  if (bidValue === 3) {
    finalizeBidding()
    return
  }
  proceedBiddingNext()
}

const handleAiTurn = async (player: PlayerState) => {
  player.thinking = true
  const isOpeningTurn = !game.lastPlay
  let coercedPlay = false
  let activeConfig = settings.useRoleModel ? settings.role[player.role] ?? settings.global : settings.global
  if (player.seat === 'me' && settings.useSelfAi) {
    activeConfig = settings.self
  }
  if (!activeConfig.vendor) activeConfig.vendor = 'openai'
  player.modelLabel = activeConfig.model
  addLog(
    `[DEBUG] handleAiTurn seat=${player.seat} role=${player.role} landlord=${game.landlord} stage=${game.stage} lastPlay=${game.lastPlay?.seat ?? 'none'
    }`,
    player.seat,
  )
  addLog(`${player.name} 正在思考...`, player.seat)
  let decision: AiDecision | null = null

  try {
    if (activeConfig.baseUrl && activeConfig.apiKey && activeConfig.model) {
      const messages = buildDecisionMessages({
        player,
        landlord: game.landlord,
        bottomCards: game.bottomCards,
        lastPlay: game.lastPlay,
        history: game.history,
        remainingCards: {
          west: players.west.hand.length,
          me: players.me.hand.length,
          east: players.east.hand.length,
        },
        chatLog: [...logs.value],
        persona: aiProfiles[player.seat],
        extraPrompt: settings.useBreakerPrompt ? JSON.stringify(breakerPack) : undefined,
        otherPersonas: {
          west: aiProfiles.west,
          me: aiProfiles.me,
          east: aiProfiles.east,
        },
      })
      decision = await callLLM(activeConfig, messages)
    } else {
      addLog(
        `出牌 LLM 配置不完整，跳过调用。vendor=${activeConfig.vendor} url=${activeConfig.baseUrl} model=${activeConfig.model}`,
        player.seat,
      )
    }
  } catch (err) {
    addLog(`LLM 调用失败，使用兜底策略。${(err as Error).message}`, player.seat)
  }

  const lastCombo = game.lastPlay?.combo ?? null
  if (!decision) {
    addLog(
      `出牌 LLM 返回空或解析失败，使用兜底。vendor=${activeConfig.vendor} url=${activeConfig.baseUrl} model=${activeConfig.model}`,
      player.seat,
    )
    const fallback = pickFallbackMove(player.hand, lastCombo)
    if (!fallback) {
      const talkText = defaultTalk(player, 'pass')
      addLog(talkText, player.seat)
      speech[player.seat] = { text: talkText, ts: Date.now(), visible: true }
      applyPass(player.seat, '无可压的牌')
      player.thinking = false
      return
    }
    decision = { action: 'play', cards: fallback.cards.map((c) => c.id), reason: '兜底策略' }
  }

  // 首手不允许过牌，强制垫出最小合法牌。
  if (decision.action === 'pass' && isOpeningTurn) {
    const fallback = pickFallbackMove(player.hand, null)
    if (fallback) {
      addLog('[DEBUG] 首手模型想要过牌，改为垫牌', player.seat)
      coercedPlay = true
      decision = {
        action: 'play',
        cards: fallback.cards.map((c) => c.id),
        reason: '首手必须出牌，自动垫出最小牌',
        talk: '',
      }
    }
  }

  if (decision.action === 'pass') {
    const talkText = (decision.talk && decision.talk.trim()) || defaultTalk(player, 'pass')
    addLog(talkText, player.seat)
    speech[player.seat] = { text: talkText, ts: Date.now(), visible: true }
    applyPass(player.seat, decision.reason)
    player.thinking = false
    return
  }

  let chosen = mapDecisionCards(decision.cards, player.hand)
  let combo = evaluateCombo(chosen)
  if (!combo || (game.lastPlay?.combo && !canBeat(game.lastPlay.combo, combo))) {
    if (isOpeningTurn) {
      const fallback = pickFallbackMove(player.hand, null)
      if (fallback) {
        chosen = fallback.cards
        combo = fallback.combo
        addLog('[DEBUG] 首手模型出牌非法，改为兜底垫牌', player.seat)
        coercedPlay = true
        decision.reason = decision.reason
          ? `${decision.reason}，首手重新垫牌`
          : '首手垫牌，使用兜底出牌'
        decision.talk = ''
      } else {
        addLog('[DEBUG] 首手模型出牌非法且无兜底，改为不要', player.seat)
        applyPass(player.seat, '模型出牌非法，改为不要')
        player.thinking = false
        return
      }
    } else {
      const fallback = pickFallbackMove(player.hand, game.lastPlay?.combo ?? null)
      if (fallback) {
        chosen = fallback.cards
        combo = fallback.combo
        addLog('[DEBUG] 非首手模型出牌非法，改为兜底压制上一手', player.seat)
        coercedPlay = true
        decision.reason = decision.reason
          ? `${decision.reason}，改用兜底牌型压制`
          : '改用兜底牌型压制上一手'
        decision.talk = ''
      } else {
        addLog('[DEBUG] 非首手模型出牌非法且无可压制，改为不要', player.seat)
        applyPass(player.seat, '模型出牌非法，改为不要')
        player.thinking = false
        return
      }
    }
  }

  player.hand = player.hand.filter((c) => !chosen.includes(c))
  player.lastReason = decision.reason
  const talkText = (!coercedPlay && decision.talk && decision.talk.trim()) || defaultTalk(player, 'play')
  if (talkText) {
    addLog(talkText, player.seat)
    speech[player.seat] = { text: talkText, ts: Date.now(), visible: true }
  }
  concludePlay(player.seat, { seat: player.seat, cards: chosen, combo })
  player.thinking = false
}

const playSelected = () => {
  if (game.stage !== 'playing' || game.currentSeat !== 'me') return
  const cards = players.me.hand.filter((c) => selectedIds.value.has(c.id))
  const combo = evaluateCombo(cards)
  if (!combo) {
    addLog('请选择有效牌型', 'me')
    return
  }
  if (game.lastPlay?.combo && !canBeat(game.lastPlay.combo, combo)) {
    addLog('选牌无法压制上一手', 'me')
    return
  }
  players.me.hand = players.me.hand.filter((c) => !selectedIds.value.has(c.id))
  selectedIds.value = new Set()
  concludePlay('me', { seat: 'me', cards, combo })
  humanTalkUsedTurn.value = true
  nextTick().then(() => delay(300).then(advancePlaying))
}

const passTurn = () => {
  if (game.stage !== 'playing' || game.currentSeat !== 'me' || !game.lastPlay) return
  selectedIds.value = new Set()
  applyPass('me', '手动不要')
  humanTalkUsedTurn.value = true
  nextTick().then(() => delay(300).then(advancePlaying))
}

const advancePlaying = async () => {
  if (game.stage !== 'playing' || game.winner) return
  const seat = game.currentSeat
  const player = players[seat]
  addLog(
    `[DEBUG] advancePlaying seat=${seat} role=${player.role} landlord=${game.landlord} lastPlay=${game.lastPlay?.seat ?? 'none'
    }`,
  )
  if (!player.isAI) return
  await delay(320)
  await handleAiTurn(player)
  if (!game.winner) {
    await delay(320)
    advancePlaying()
  }
}

const toggleSelect = (card: Card) => {
  const next = new Set(selectedIds.value)
  if (next.has(card.id)) next.delete(card.id)
  else next.add(card.id)
  selectedIds.value = next
}

const hideSpeech = (seat: Seat) => {
  if (speech[seat]) speech[seat] = { ...speech[seat]!, visible: false }
}

const toggleSpeech = (seat: Seat) => {
  if (speech[seat]) speech[seat] = { ...speech[seat]!, visible: !speech[seat]!.visible }
}

const openSpeechModal = (seat: Seat) => {
  if (speech[seat]) {
    speechModalSeat.value = seat
  }
}

const sendHumanTalk = () => {
  if (humanTalkUsedTurn.value || !humanTalkText.value.trim() || game.currentSeat !== 'me') return
  const text = humanTalkText.value.trim()
  addLog(text, 'me')
  speech.me = { text, ts: Date.now(), visible: true }
  humanTalkUsedTurn.value = true
  humanTalkText.value = ''
}

watch(
  () => game.currentSeat,
  (seat) => {
    if (seat === 'me') {
      humanTalkUsedTurn.value = false
    }
  },
)

const randomPhrase = (winner: Seat, speaker: Seat): string => {
  const winName = players[winner].name
  const meName = players[speaker].name
  const templates = [
    `${meName}：这把真刺激，${winName} 的收官我没猜到，下次我可要憋炸弹了！`,
    `${meName}：哎呀一步慢步步慢，关键那手我犹豫了，下盘补回来！`,
    `${meName}：服了服了，${winName} 这波节奏拉满，我得复盘手里的连对。`,
    `${meName}：差一点点！我其实准备好了炸弹，可惜时机没到。`,
    `${meName}：好局！我要去摸个奶茶庆祝/疗伤，下一把我来爆分！`,
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

const triggerPostGameTalks = async (winner: Seat) => {
  const order: Seat[] = ['west', 'east']
  for (const seat of order) {
    if (!players[seat].isAI) continue
    const text = randomPhrase(winner, seat)
    speech[seat] = { text, ts: Date.now(), visible: true }
    addLog(text, seat)
    await delay(900)
  }
}

loadSettings()
loadStats()
loadProfiles()
loadNames()
</script>

<style scoped>
.muted {
  color: var(--muted);
  min-width: 200px;
}

.layout-bottom {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.area-north {
  grid-area: north;
}

.area-west {
  grid-area: west;
}

.area-east {
  grid-area: east;
}

.area-south {
  grid-area: south;
}

.meta-line {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.speech-bubble {
  position: relative;
  margin-top: 6px;
  max-width: 380px;
  background: #ffffffdd;
  border-radius: 12px;
  padding: 10px 12px;
  box-shadow: var(--shadow);
  cursor: pointer;
}

.speech-bubble p {
  margin: 0 0 4px;
  font-weight: 600;
  max-height: 108px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.speech-expand {
  position: absolute;
  right: 8px;
  bottom: 4px;
  font-size: 12px;
  border: none;
  background: #eef3ef;
  border-radius: 8px;
  padding: 2px 6px;
  cursor: pointer;
}

.my-bubble {
  max-width: 100%;
  width: 100%;
}

.close-link {
  cursor: pointer;
}

.log-wrapper {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.log-toggle {
  display: flex;
  justify-content: flex-end;
}

.log-fab {
  position: fixed;
  right: 18px;
  bottom: 18px;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 22px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  z-index: 25;
}

.log-floating {
  position: fixed;
  right: 20px;
  top: 20px;
  bottom: 80px;
  width: min(360px, 90vw);
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
  padding: 12px;
  z-index: 24;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-floating header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.log-body {
  flex: 1;
  overflow: auto;
}

.mini {
  padding: 6px 10px;
  font-size: 12px;
}

.bubble-btn {
  border: none;
  background: #eef3ef;
  border-radius: 10px;
  padding: 4px 8px;
  cursor: pointer;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
  z-index: 20;
  padding: 16px;
}

.modal {
  background: #fff;
  border-radius: 14px;
  padding: 16px;
  width: min(420px, 90vw);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.stat-item {
  background: #f6f9f7;
  border-radius: 10px;
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.persona-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
  background: var(--panel);
  border-radius: 12px;
  padding: 10px;
  box-shadow: var(--shadow);
}

.persona-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.persona-item textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid #d8e6de;
  padding: 8px;
  resize: vertical;
}

.talk-box {
  margin-top: 8px;
  display: flex;
  gap: 8px;
}

.talk-box input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d8e6de;
  border-radius: 10px;
}

.persona-modal {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.app-shell {
  max-width: 1180px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  box-sizing: border-box;
  overflow: hidden;
}

.table {
  min-height: 460px;
  min-width: 960px;
  flex: 1;
  position: relative;
  border-radius: 22px;
  padding: 16px;
  background: radial-gradient(circle at 20% 20%, #e9f5ee 0%, #d6eadc 40%, #c7e2d1 75%, #b9d8c6 100%);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.board-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 120px;
}

.middle-row {
  flex-direction: row;
  align-items: flex-start;
  gap: 12px;
}

.table-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-height: 140px;
  justify-content: center;
}

.card-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.center-board {
  width: 100%;
  min-height: 120px;
  background: #ffffffcc;
  border-radius: 14px;
  padding: 10px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06), var(--shadow);
}

.center-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 700;
}

.start-placeholder {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-weight: 600;
  font-size: 18px;
}

.player-seat {
  min-height: 140px;
}

.player-seat.compact .hand {
  flex-wrap: wrap;
}

.hand {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  row-gap: 8px;
}

.grid-5 {
  display: grid;
  grid-template-columns: repeat(5, minmax(64px, 1fr));
  gap: 3px;
  align-items: center;
}

:deep(.log-panel) {
  overflow: auto;
}
</style>
