import { bidSystemPrompt } from '../../prompts/bidPrompt.js'
import type { PlayerState, Seat } from '../game/types'
import type { ChatMessage } from './client'

interface BidContext {
  player: PlayerState
  highestBid: number
  landlord: Seat | null
  persona?: string
}

export function buildBidMessages(context: BidContext): ChatMessage[] {
  const { player, highestBid, persona } = context
  const userContent = `
你是${player.role === 'landlord' ? '地主' : '农民'}候选，座位 ${player.seat}。
角色/性格：${persona ?? '自由发挥，保持牌桌口吻'}
当前最高叫分：${highestBid}
我的手牌：${player.hand.map((c) => c.label).join(' ')}
可选叫分：必须大于当前最高分的 1/2/3，或 0 表示不叫。
请输出 JSON。`
  return [
    { role: 'system', content: bidSystemPrompt },
    { role: 'user', content: userContent.trim() },
  ]
}
