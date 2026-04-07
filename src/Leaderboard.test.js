import { describe, it, expect } from 'vitest'

// ─── Pure helpers mirroring Leaderboard.jsx logic ────────────────────────────

function getTopScore(players) {
  return Math.max(...players.map((p) => p.score))
}

function sortByScore(players) {
  return [...players].sort((a, b) => b.score - a.score)
}

function incrementScore(players, name) {
  return players.map((p) => (p.name === name ? { ...p, score: p.score + 1 } : p))
}

const INITIAL_PLAYERS = [
  { name: 'Lucas', score: 7 },
  { name: 'Logan', score: 13 },
  { name: 'Meg', score: 15 },
  { name: 'Tessa', score: 17 },
]

// ─── getTopScore ──────────────────────────────────────────────────────────────

describe('getTopScore', () => {
  it('returns the highest score', () => {
    expect(getTopScore(INITIAL_PLAYERS)).toBe(17)
  })

  it('returns the single score when there is one player', () => {
    expect(getTopScore([{ name: 'Solo', score: 5 }])).toBe(5)
  })
})

// ─── sortByScore ──────────────────────────────────────────────────────────────

describe('sortByScore', () => {
  it('orders players from highest to lowest score', () => {
    const sorted = sortByScore(INITIAL_PLAYERS)
    expect(sorted.map((p) => p.name)).toEqual(['Tessa', 'Meg', 'Logan', 'Lucas'])
  })

  it('does not mutate the original array', () => {
    const original = [...INITIAL_PLAYERS]
    sortByScore(INITIAL_PLAYERS)
    expect(INITIAL_PLAYERS).toEqual(original)
  })
})

// ─── incrementScore ───────────────────────────────────────────────────────────

describe('incrementScore', () => {
  it('increments the named player score by 1', () => {
    const updated = incrementScore(INITIAL_PLAYERS, 'Lucas')
    expect(updated.find((p) => p.name === 'Lucas').score).toBe(8)
  })

  it('leaves other player scores unchanged', () => {
    const updated = incrementScore(INITIAL_PLAYERS, 'Lucas')
    expect(updated.find((p) => p.name === 'Tessa').score).toBe(17)
    expect(updated.find((p) => p.name === 'Meg').score).toBe(15)
    expect(updated.find((p) => p.name === 'Logan').score).toBe(13)
  })

  it('does not mutate the original array', () => {
    const original = INITIAL_PLAYERS.map((p) => ({ ...p }))
    incrementScore(INITIAL_PLAYERS, 'Lucas')
    expect(INITIAL_PLAYERS).toEqual(original)
  })

  it('increments can change who is the top scorer', () => {
    let players = INITIAL_PLAYERS
    // Give Logan enough points to match Tessa
    for (let i = 0; i < 4; i++) {
      players = incrementScore(players, 'Logan')
    }
    expect(getTopScore(players)).toBe(17)
    players = incrementScore(players, 'Logan')
    expect(getTopScore(players)).toBe(18)
    expect(players.find((p) => p.name === 'Logan').score).toBe(18)
  })
})
