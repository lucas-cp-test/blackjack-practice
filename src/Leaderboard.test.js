import { describe, it, expect } from 'vitest'
import { parseGitHubRepo } from '../siteConfig.js'

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

// ─── save-scores helpers ──────────────────────────────────────────────────────

describe('buildScoresPayload', () => {
  it('serialises players to a compact JSON string', () => {
    const players = [
      { name: 'Lucas', score: 8 },
      { name: 'Tessa', score: 17 },
    ]
    const payload = JSON.stringify(players.map(({ name, score }) => ({ name, score })))
    expect(JSON.parse(payload)).toEqual([
      { name: 'Lucas', score: 8 },
      { name: 'Tessa', score: 17 },
    ])
  })
})

describe('parseGitHubRepo (from Leaderboard context)', () => {
  it('returns owner/repo for a deployed GitHub Pages URL', () => {
    expect(
      parseGitHubRepo({ hostname: 'lucas-cp-test.github.io', pathname: '/blackjack-practice/kub-leader/' }),
    ).toBe('lucas-cp-test/blackjack-practice')
  })

  it('returns null for a localhost dev URL', () => {
    expect(parseGitHubRepo({ hostname: 'localhost', pathname: '/kub-leader/' })).toBeNull()
  })
})
