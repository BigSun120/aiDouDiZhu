export type Suit = 'S' | 'H' | 'C' | 'D'

export type Rank =
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A'
  | '2'
  | 'BJ'
  | 'RJ'

export type ComboType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'tripleWithSingle'
  | 'tripleWithPair'
  | 'straight'
  | 'straightPair'
  | 'bomb'
  | 'rocket'
  | 'fourWithTwo'
  | 'plane'
  | 'planeWithSingles'
  | 'planeWithPairs'

export interface Card {
  id: string
  rank: Rank
  suit?: Suit
  label: string
}

export interface Combo {
  type: ComboType
  rankValue: number
  length: number
}

export type Seat = 'west' | 'me' | 'east'

export interface PlayerState {
  seat: Seat
  name: string
  role: 'farmer' | 'landlord'
  hand: Card[]
  isAI: boolean
  thinking: boolean
  lastReason?: string
  modelLabel?: string
  persona?: string
}

export interface Play {
  seat: Seat
  cards: Card[]
  combo: Combo | null
  pass?: boolean
  reason?: string
}

export type ModelVendor = 'openai' | 'openai-custom' | 'gemini' | 'gemini-custom'

export interface ModelConfig {
  baseUrl: string
  apiKey: string
  model: string
  vendor?: ModelVendor
}

export interface RoleModelConfig {
  landlord?: ModelConfig
  farmer?: ModelConfig
}

export interface GameState {
  stage: 'dealing' | 'bidding' | 'playing' | 'ended'
  landlord: Seat | null
  bottomCards: Card[]
  currentSeat: Seat
  lastPlay: Play | null
  history: Play[]
  winner: Seat | null
}

export interface AiDecision {
  action: 'play' | 'pass'
  cards: string[]
  reason?: string
  talk?: string
}

export interface AiBidDecision {
  bid: 0 | 1 | 2 | 3
  reason?: string
  talk?: string
}

export interface LogEntry {
  seat?: Seat
  message: string
  ts: number
  kind?: 'info' | 'warning' | 'action'
}
