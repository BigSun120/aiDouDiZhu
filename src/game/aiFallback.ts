import { canBeat, evaluateCombo, rankValue } from './cards'
import type { Card, Combo } from './types'

export interface Candidate {
  cards: Card[]
  combo: Combo
}

function groupByRank(hand: Card[]): Map<string, Card[]> {
  const map = new Map<string, Card[]>()
  hand.forEach((card) => {
    if (!map.has(card.rank)) map.set(card.rank, [])
    map.get(card.rank)!.push(card)
  })
  map.forEach((cards) => cards.sort((a, b) => rankValue(a.rank) - rankValue(b.rank)))
  return map
}

function pickLowestSingles(hand: Card[], excludeRank: string, count: number): Card[] {
  const singles = hand
    .filter((c) => c.rank !== excludeRank)
    .sort((a, b) => rankValue(a.rank) - rankValue(b.rank))
  return singles.slice(0, count)
}

export function generateCandidates(hand: Card[]): Candidate[] {
  const grouped = groupByRank(hand)
  const candidates: Candidate[] = []

  const tryAdd = (cards: Card[]) => {
    const combo = evaluateCombo(cards)
    if (combo) {
      const signature = `${combo.type}-${combo.length}-${combo.rankValue}-${cards
        .map((c) => c.id)
        .sort()
        .join('')}`
      if (!candidates.some((c) => `${c.combo.type}-${c.combo.length}-${c.combo.rankValue}-${c.cards
        .map((card) => card.id)
        .sort()
        .join('')}` === signature)) {
        candidates.push({ cards, combo })
      }
    }
  }

  grouped.forEach((cards) => {
    tryAdd([cards[0]])
    if (cards.length >= 2) tryAdd(cards.slice(0, 2))
    if (cards.length >= 3) tryAdd(cards.slice(0, 3))
    if (cards.length === 4) tryAdd(cards.slice(0, 4))
  })

  // triple with single/pair
  grouped.forEach((cards, rank) => {
    if (cards.length >= 3) {
      const triple = cards.slice(0, 3)
      const singleWing = pickLowestSingles(hand, rank, 1)
      if (singleWing.length === 1) tryAdd([...triple, ...singleWing])
      const pairEntry = Array.from(grouped.entries()).find(
        ([otherRank, list]) => otherRank !== rank && list.length >= 2,
      )
      if (pairEntry) {
        tryAdd([...triple, ...pairEntry[1].slice(0, 2)])
      }
    }
  })

  // four with two
  grouped.forEach((cards, rank) => {
    if (cards.length === 4) {
      const wings = pickLowestSingles(hand, rank, 2)
      if (wings.length === 2) tryAdd([...cards, ...wings])
    }
  })

  // rocket
  const hasBJ = grouped.has('BJ')
  const hasRJ = grouped.has('RJ')
  if (hasBJ && hasRJ) {
    tryAdd([grouped.get('BJ')![0], grouped.get('RJ')![0]])
  }

  // straight singles
  const singleRanks = Array.from(grouped.keys())
    .filter((r) => r !== 'BJ' && r !== 'RJ' && r !== '2')
    .sort((a, b) => rankValue(a as any) - rankValue(b as any))
  for (let i = 0; i < singleRanks.length; i += 1) {
    let run: string[] = []
    for (let j = i; j < singleRanks.length; j += 1) {
      if (j === i || rankValue(singleRanks[j] as any) === rankValue(singleRanks[j - 1] as any) + 1) {
        run.push(singleRanks[j])
        if (run.length >= 5) {
          const cards = run.map((rank) => grouped.get(rank)![0])
          tryAdd(cards)
        }
      } else {
        break
      }
    }
  }

  // straight pairs
  const pairRanks = Array.from(grouped.entries())
    .filter(([, cards]) => cards.length >= 2)
    .map(([rank]) => rank)
    .filter((rank) => rank !== 'BJ' && rank !== 'RJ' && rank !== '2')
    .sort((a, b) => rankValue(a as any) - rankValue(b as any))
  for (let i = 0; i < pairRanks.length; i += 1) {
    let run: string[] = []
    for (let j = i; j < pairRanks.length; j += 1) {
      if (j === i || rankValue(pairRanks[j] as any) === rankValue(pairRanks[j - 1] as any) + 1) {
        run.push(pairRanks[j])
        if (run.length >= 3) {
          const cards = run.flatMap((rank) => grouped.get(rank)!.slice(0, 2))
          tryAdd(cards)
        }
      } else {
        break
      }
    }
  }

  // plane (pure)
  const tripleRanks = Array.from(grouped.entries())
    .filter(([, cards]) => cards.length >= 3)
    .map(([rank]) => rank)
    .filter((rank) => rank !== 'BJ' && rank !== 'RJ' && rank !== '2')
    .sort((a, b) => rankValue(a as any) - rankValue(b as any))
  for (let i = 0; i < tripleRanks.length; i += 1) {
    let run: string[] = []
    for (let j = i; j < tripleRanks.length; j += 1) {
      if (j === i || rankValue(tripleRanks[j] as any) === rankValue(tripleRanks[j - 1] as any) + 1) {
        run.push(tripleRanks[j])
        if (run.length >= 2) {
          const planeCards = run.flatMap((rank) => grouped.get(rank)!.slice(0, 3))
          tryAdd(planeCards)
        }
      } else {
        break
      }
    }
  }

  return candidates.sort((a, b) => a.combo.rankValue - b.combo.rankValue || a.combo.length - b.combo.length)
}

export function pickFallbackMove(hand: Card[], lastCombo: Combo | null): Candidate | null {
  const candidates = generateCandidates(hand)
  const weight = (combo: Combo): number => {
    switch (combo.type) {
      case 'rocket':
      case 'bomb':
        return 5
      case 'straightPair':
      case 'plane':
      case 'planeWithSingles':
      case 'planeWithPairs':
        return 3
      case 'fourWithTwo':
      case 'tripleWithPair':
      case 'tripleWithSingle':
        return 2
      default:
        return 1
    }
  }

  if (!lastCombo) {
    return candidates[0] ?? null
  }
  const beating = candidates.filter((c) => canBeat(lastCombo, c.combo))
  beating.sort((a, b) => {
    const wDiff = weight(a.combo) - weight(b.combo)
    if (wDiff !== 0) return wDiff
    return a.combo.rankValue - b.combo.rankValue
  })
  if (beating.length) return beating[0]
  return null
}
