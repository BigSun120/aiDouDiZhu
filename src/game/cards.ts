import type { Card, Combo, Rank, Seat, Suit } from './types'

export const rankOrder: Rank[] = [
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
  '2',
  'BJ',
  'RJ',
]

const rankScore: Record<Rank, number> = Object.fromEntries(rankOrder.map((r, i) => [r, i])) as Record<
  Rank,
  number
>

const suits: Suit[] = ['S', 'H', 'C', 'D']

const suitDisplay: Record<Suit, string> = {
  S: '\u2660',
  H: '\u2665',
  C: '\u2663',
  D: '\u2666',
}

export const seatOrder: Seat[] = ['west', 'me', 'east']

export function nextSeat(seat: Seat): Seat {
  const idx = seatOrder.indexOf(seat)
  return seatOrder[(idx + 1) % seatOrder.length]
}

export function createDeck(): Card[] {
  const deck: Card[] = []
  const ranks: Rank[] = rankOrder.filter((r) => r !== 'BJ' && r !== 'RJ')
  ranks.forEach((rank) => {
    suits.forEach((suit) => {
      deck.push({
        id: `${rank}${suit}`,
        rank,
        suit,
        label: `${rank}${suitDisplay[suit]}`,
      })
    })
  })
  deck.push({ id: 'BJ', rank: 'BJ', label: 'BJ' })
  deck.push({ id: 'RJ', rank: 'RJ', label: 'RJ' })
  return deck
}

export function shuffle(cards: Card[]): Card[] {
  const clone = [...cards]
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[clone[i], clone[j]] = [clone[j], clone[i]]
  }
  return clone
}

export function deal(): { hands: Record<Seat, Card[]>; bottom: Card[] } {
  const deck = shuffle(createDeck())
  return {
    hands: {
      west: sortCards(deck.slice(0, 17)),
      me: sortCards(deck.slice(17, 34)),
      east: sortCards(deck.slice(34, 51)),
    },
    bottom: sortCards(deck.slice(51)),
  }
}

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => rankScore[b.rank] - rankScore[a.rank])
}

export function rankValue(rank: Rank): number {
  return rankScore[rank]
}

function isConsecutive(ranks: Rank[]): boolean {
  const values = ranks.map(rankValue).sort((a, b) => a - b)
  if (values.some((v) => v >= rankScore['2'])) return false
  for (let i = 1; i < values.length; i += 1) {
    if (values[i] !== values[i - 1] + 1) return false
  }
  return true
}

export function evaluateCombo(cards: Card[]): Combo | null {
  const len = cards.length
  if (!len) return null
  const counts = new Map<Rank, number>()
  cards.forEach((card) => counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1))
  const uniqueRanks = counts.size
  const countValues = Array.from(counts.values()).sort((a, b) => b - a)
  const highestRank = Math.max(...cards.map((c) => rankValue(c.rank)))

  const rankOfCount = (count: number): number | null => {
    const matches = Array.from(counts.entries())
      .filter(([, cnt]) => cnt === count)
      .map(([rank]) => rankValue(rank))
    if (!matches.length) return null
    return Math.max(...matches)
  }

  const isRocket = len === 2 && counts.has('BJ') && counts.has('RJ')
  if (isRocket) return { type: 'rocket', rankValue: rankValue('RJ'), length: len }
  if (len === 1) return { type: 'single', rankValue: highestRank, length: len }
  if (len === 2 && countValues[0] === 2)
    return { type: 'pair', rankValue: rankOfCount(2) ?? highestRank, length: len }
  if (len === 3 && countValues[0] === 3)
    return { type: 'triple', rankValue: rankOfCount(3) ?? highestRank, length: len }

  if (len === 4) {
    if (countValues[0] === 4)
      return { type: 'bomb', rankValue: rankOfCount(4) ?? highestRank, length: len }
    if (countValues[0] === 3)
      return { type: 'tripleWithSingle', rankValue: rankOfCount(3) ?? highestRank, length: len }
  }

  if (len === 5 && countValues[0] === 3 && countValues[1] === 2)
    return { type: 'tripleWithPair', rankValue: rankOfCount(3) ?? highestRank, length: len }

  if (len === 6 && countValues[0] === 4) {
    return { type: 'fourWithTwo', rankValue: rankOfCount(4) ?? highestRank, length: len }
  }

  const straightRanks = Array.from(counts.entries())
    .filter(([, count]) => count === 1)
    .map(([rank]) => rank)
  if (uniqueRanks === len && len >= 5 && isConsecutive(straightRanks)) {
    return { type: 'straight', rankValue: highestRank, length: len }
  }

  const pairRanks = Array.from(counts.entries())
    .filter(([, count]) => count === 2)
    .map(([rank]) => rank)
  if (pairRanks.length * 2 === len && len >= 6 && isConsecutive(pairRanks)) {
    return { type: 'straightPair', rankValue: Math.max(...pairRanks.map(rankValue)), length: len }
  }

  const tripleRanks = Array.from(counts.entries())
    .filter(([, count]) => count === 3)
    .map(([rank]) => rank)
  const singleCount = Array.from(counts.values()).filter((v) => v === 1).length
  const pairCount = Array.from(counts.values()).filter((v) => v === 2).length

  if (tripleRanks.length >= 2 && isConsecutive(tripleRanks)) {
    const topTriple = Math.max(...tripleRanks.map(rankValue))
    if (tripleRanks.length * 3 === len) {
      return { type: 'plane', rankValue: topTriple, length: len }
    }
    if (tripleRanks.length * 4 === len && singleCount === tripleRanks.length) {
      return { type: 'planeWithSingles', rankValue: topTriple, length: len }
    }
    if (tripleRanks.length * 5 === len && pairCount === tripleRanks.length) {
      return { type: 'planeWithPairs', rankValue: topTriple, length: len }
    }
  }

  return null
}

export function canBeat(prev: Combo | null, next: Combo | null): boolean {
  if (!next) return false
  if (!prev) return true
  if (next.type === 'rocket') return true
  if (prev.type === 'rocket') return false
  if (next.type === 'bomb') {
    if (prev.type === 'bomb') return next.rankValue > prev.rankValue
    return true
  }
  if (prev.type === 'bomb') return false
  if (prev.type !== next.type) return false
  if (prev.length !== next.length) return false
  return next.rankValue > prev.rankValue
}

export function formatCards(cards: Card[]): string {
  return sortCards(cards)
    .map((c) => c.label)
    .join(' ')
}
