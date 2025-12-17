import { landlordSystemPrompt } from '../../prompts/prompts.js'
import type { Card, LogEntry, Play, PlayerState, Seat } from '../game/types'
import type { ChatMessage } from './client'

export interface PromptContext {
  player: PlayerState
  landlord: Seat | null
  bottomCards: Card[]
  lastPlay: Play | null
  history: Play[]
  remainingCards: Record<Seat, number>
  chatLog: LogEntry[]
  persona?: string
  extraPrompt?: string
  otherPersonas?: Record<Seat, string>
}

export function buildDecisionMessages(context: PromptContext): ChatMessage[] {
  const {
    player,
    bottomCards,
    lastPlay,
    history,
    remainingCards,
    chatLog,
    persona,
    landlord,
    extraPrompt,
    otherPersonas = {},
  } = context
  const isLeadTurn = !lastPlay
  const seenBySeat: Record<Seat, string[]> = {
    west: [],
    me: [],
    east: [],
  }
  history.forEach((item) => {
    if (!item.pass) {
      seenBySeat[item.seat].push(...item.cards.map((c) => c.label))
    }
  })
  const compactHistory = history.slice(-6).map((item) => ({
    seat: item.seat,
    action: item.pass ? 'pass' : 'play',
    cards: item.cards.map((c) => c.label),
    type: item.combo?.type,
  }))

  const recentChat = chatLog
    .filter((item) => item.seat)
    .reverse() // 日志存储为新->旧，这里翻转为旧->新
    .map((item) => `${item?.seat}: ${item.message}`)

  const rolesSummary = {
    west: landlord === 'west' ? '地主' : '农民',
    me: landlord === 'me' ? '地主' : '农民',
    east: landlord === 'east' ? '地主' : '农民',
  }
  const relation =
    player.role === 'landlord'
      ? '你是地主，没有队友，其他两位都是对手，任何“队友”说法都不适用。'
      : player.seat === 'west'
        ? '你是农民，队友是东家，共同对抗地主。'
        : player.seat === 'east'
          ? '你是农民，队友是西家，共同对抗地主。'
          : '你是农民，与另一位农民配合压制地主，不要误称自己是地主或攻击队友。'

  const userContent = `
你是${player.role === 'landlord' ? '地主' : '农民'}，座位 ${player.seat}。
身份与阵营：${relation}
座位身份：${JSON.stringify(rolesSummary)}
角色/性格：${persona ?? '自由发挥，保持牌桌人类语气、幽默且有个性'}
其他玩家人设：${JSON.stringify(otherPersonas)}
我的手牌: ${player.hand.map((c) => c.label).join(' ')}
手牌数量: ${player.hand.length}，其他玩家剩余牌数: ${JSON.stringify(remainingCards)}
底牌(已公开): ${bottomCards.map((c) => c.label).join(' ') || '未知'}
已出牌汇总（用于记牌/推断剩余牌）：${JSON.stringify(seenBySeat)}
最近一手: ${
    lastPlay
      ? `${lastPlay.seat} 打出 ${lastPlay.cards.map((c) => c.label).join(' ')} (${lastPlay.combo?.type ?? '未知'})`
      : '无'
  }
当前出牌权：${isLeadTurn ? '你是领出方（上一轮已重置），必须出牌，禁止 pass。' : '你需决定是否压制上一手；无法/不宜压制时可 pass。'}
近期出牌历史(从旧到新): ${JSON.stringify(compactHistory)}
桌面发言记录(旧->新): ${recentChat.join(' | ') || '无'}
全局提示：结合“已出牌汇总”与“剩余牌数”做记牌，判断对手可能持有的大牌/炸弹，先清理累赘牌，在必要时用控制牌封顶。
对话要求：talk 需符合【自己的人设】语气，并可针对上一手玩家或对手人设互动，不要自顾自或无视对方人设。
请给出下一步行动，必须返回 JSON。`

  const messages: ChatMessage[] = [{ role: 'system', content: landlordSystemPrompt }]
  if (extraPrompt) messages.push({ role: 'system', content: extraPrompt })
  messages.push({
    role: 'user',
    content: userContent.trim(),
  })
  return messages
}
