import { describe, it, expect } from 'vitest'

// ─── Pure helpers replicated from App.jsx for isolated unit testing ───────────

function isYouHand(id) {
  return id === 'you' || id.startsWith('you-')
}

function getSplitRecommendation(rank, dealerValue) {
  if (rank === 'A' || rank === '8') return true
  if (rank === '5' || rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return false
  if (rank === '4') return dealerValue >= 5 && dealerValue <= 6
  if (rank === '2' || rank === '3') return dealerValue >= 2 && dealerValue <= 7
  if (rank === '6') return dealerValue >= 2 && dealerValue <= 6
  if (rank === '7') return dealerValue >= 2 && dealerValue <= 7
  if (rank === '9')
    return (dealerValue >= 2 && dealerValue <= 6) || (dealerValue >= 8 && dealerValue <= 9)
  return false
}

function handValue(cards) {
  let total = 0
  let aceCount = 0
  for (const card of cards) {
    total += card.value
    if (card.rank === 'A') aceCount += 1
  }
  while (total > 21 && aceCount > 0) {
    total -= 10
    aceCount -= 1
  }
  return { total, soft: aceCount > 0 }
}

function makeCard(rank, suit = '♠') {
  let value
  if (rank === 'A') value = 11
  else if (['J', 'Q', 'K'].includes(rank)) value = 10
  else value = Number(rank)
  return { id: `${rank}${suit}`, rank, suit, value, dealtAt: 0 }
}

function makePlayer(id, cards = []) {
  return { id, name: id, type: isYouHand(id) ? 'human' : 'bot', cards, status: 'playing', doubled: false, result: '' }
}

// ─── canSplit conditions ───────────────────────────────────────────────────────

describe('isYouHand', () => {
  it('identifies the main hand', () => {
    expect(isYouHand('you')).toBe(true)
  })

  it('identifies split hands', () => {
    expect(isYouHand('you-1')).toBe(true)
    expect(isYouHand('you-2')).toBe(true)
    expect(isYouHand('you-3')).toBe(true)
  })

  it('rejects bot players', () => {
    expect(isYouHand('bot-1')).toBe(false)
    expect(isYouHand('dealer')).toBe(false)
  })
})

// ─── getSplitRecommendation ────────────────────────────────────────────────────

describe('getSplitRecommendation', () => {
  it('always splits aces', () => {
    for (let d = 2; d <= 11; d++) {
      expect(getSplitRecommendation('A', d)).toBe(true)
    }
  })

  it('always splits 8s', () => {
    for (let d = 2; d <= 11; d++) {
      expect(getSplitRecommendation('8', d)).toBe(true)
    }
  })

  it('never splits 5s or 10-value cards', () => {
    for (const rank of ['5', '10', 'J', 'Q', 'K']) {
      for (let d = 2; d <= 11; d++) {
        expect(getSplitRecommendation(rank, d)).toBe(false)
      }
    }
  })

  it('splits 4s only vs dealer 5 or 6', () => {
    expect(getSplitRecommendation('4', 4)).toBe(false)
    expect(getSplitRecommendation('4', 5)).toBe(true)
    expect(getSplitRecommendation('4', 6)).toBe(true)
    expect(getSplitRecommendation('4', 7)).toBe(false)
  })

  it('splits 2s and 3s vs dealer 2–7', () => {
    expect(getSplitRecommendation('2', 2)).toBe(true)
    expect(getSplitRecommendation('2', 7)).toBe(true)
    expect(getSplitRecommendation('2', 8)).toBe(false)
    expect(getSplitRecommendation('3', 7)).toBe(true)
    expect(getSplitRecommendation('3', 8)).toBe(false)
  })

  it('splits 6s vs dealer 2–6', () => {
    expect(getSplitRecommendation('6', 2)).toBe(true)
    expect(getSplitRecommendation('6', 6)).toBe(true)
    expect(getSplitRecommendation('6', 7)).toBe(false)
  })

  it('splits 7s vs dealer 2–7', () => {
    expect(getSplitRecommendation('7', 2)).toBe(true)
    expect(getSplitRecommendation('7', 7)).toBe(true)
    expect(getSplitRecommendation('7', 8)).toBe(false)
  })

  it('splits 9s vs dealer 2–6 and 8–9, not 7, 10, or A', () => {
    expect(getSplitRecommendation('9', 2)).toBe(true)
    expect(getSplitRecommendation('9', 6)).toBe(true)
    expect(getSplitRecommendation('9', 7)).toBe(false)
    expect(getSplitRecommendation('9', 8)).toBe(true)
    expect(getSplitRecommendation('9', 9)).toBe(true)
    expect(getSplitRecommendation('9', 10)).toBe(false)
    expect(getSplitRecommendation('9', 11)).toBe(false)
  })
})

// ─── Split pair conditions ─────────────────────────────────────────────────────

describe('canSplit conditions', () => {
  function canSplitHand(players, activeIndex) {
    const activePlayer = players[activeIndex]
    if (!activePlayer || !isYouHand(activePlayer.id)) return false
    if (activePlayer.cards.length !== 2) return false
    if (activePlayer.cards[0].rank !== activePlayer.cards[1].rank) return false
    const splitCount = players.filter((p) => isYouHand(p.id)).length - 1
    return splitCount < 3
  }

  it('allows split when dealt a pair', () => {
    const players = [makePlayer('you', [makeCard('8'), makeCard('8')])]
    expect(canSplitHand(players, 0)).toBe(true)
  })

  it('disallows split when cards differ', () => {
    const players = [makePlayer('you', [makeCard('8'), makeCard('7')])]
    expect(canSplitHand(players, 0)).toBe(false)
  })

  it('disallows split with more than 2 cards', () => {
    const players = [makePlayer('you', [makeCard('8'), makeCard('8'), makeCard('2')])]
    expect(canSplitHand(players, 0)).toBe(false)
  })

  it('allows up to 3 splits (4 total hands)', () => {
    // Start: 1 you-hand → split count 0 → allowed
    let players = [makePlayer('you', [makeCard('8'), makeCard('8')])]
    expect(canSplitHand(players, 0)).toBe(true)

    // After 1st split: 2 you-hands → split count 1 → allowed
    players = [
      makePlayer('you', [makeCard('8'), makeCard('3')]),
      makePlayer('you-1', [makeCard('8'), makeCard('8')]),
    ]
    expect(canSplitHand(players, 1)).toBe(true)

    // After 2nd split: 3 you-hands → split count 2 → allowed
    players = [
      makePlayer('you', [makeCard('8'), makeCard('3')]),
      makePlayer('you-1', [makeCard('8'), makeCard('3')]),
      makePlayer('you-2', [makeCard('8'), makeCard('8')]),
    ]
    expect(canSplitHand(players, 2)).toBe(true)

    // After 3rd split: 4 you-hands → split count 3 → NOT allowed
    players = [
      makePlayer('you', [makeCard('8'), makeCard('3')]),
      makePlayer('you-1', [makeCard('8'), makeCard('3')]),
      makePlayer('you-2', [makeCard('8'), makeCard('3')]),
      makePlayer('you-3', [makeCard('8'), makeCard('8')]),
    ]
    expect(canSplitHand(players, 3)).toBe(false)
  })

  it('disallows split on bot hand', () => {
    const players = [
      makePlayer('you', [makeCard('8'), makeCard('8')]),
      makePlayer('bot-1', [makeCard('8'), makeCard('8')]),
    ]
    expect(canSplitHand(players, 1)).toBe(false)
  })
})

// ─── Split insertion logic ────────────────────────────────────────────────────

describe('split hand insertion', () => {
  function performSplit(players, activeIndex) {
    const activePlayer = players[activeIndex]
    const splitCount = players.filter((p) => isYouHand(p.id)).length - 1
    const splitId = `you-${splitCount + 1}`
    const splitCard = activePlayer.cards[1]

    const updatedPlayers = players.map((p) =>
      p.id === activePlayer.id ? { ...p, cards: [p.cards[0]] } : p,
    )
    const splitHand = makePlayer(splitId, [splitCard])
    return [
      ...updatedPlayers.slice(0, activeIndex + 1),
      splitHand,
      ...updatedPlayers.slice(activeIndex + 1),
    ]
  }

  it('removes second card from original hand', () => {
    const players = [makePlayer('you', [makeCard('8'), makeCard('8')])]
    const result = performSplit(players, 0)
    expect(result[0].cards).toHaveLength(1)
    expect(result[0].cards[0].rank).toBe('8')
  })

  it('creates split hand with the second card', () => {
    const card1 = { ...makeCard('8'), id: 'card-1' }
    const card2 = { ...makeCard('8'), id: 'card-2' }
    const players = [makePlayer('you', [card1, card2])]
    const result = performSplit(players, 0)
    expect(result[1].id).toBe('you-1')
    expect(result[1].cards[0].id).toBe('card-2')
  })

  it('inserts split hand immediately after the active player', () => {
    const players = [
      makePlayer('you', [makeCard('8'), makeCard('8')]),
      makePlayer('bot-1', [makeCard('5'), makeCard('6')]),
    ]
    const result = performSplit(players, 0)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe('you')
    expect(result[1].id).toBe('you-1')
    expect(result[2].id).toBe('bot-1')
  })

  it('supports chained splits up to 3 times', () => {
    let players = [makePlayer('you', [makeCard('8'), makeCard('8')])]

    // First split
    players = performSplit(players, 0)
    expect(players.filter((p) => isYouHand(p.id))).toHaveLength(2)

    // Simulate dealing extra cards then second split on you-1
    players[0] = { ...players[0], cards: [...players[0].cards, makeCard('3')] }
    players[1] = { ...players[1], cards: [players[1].cards[0], makeCard('8')] }
    players = performSplit(players, 1)
    expect(players.filter((p) => isYouHand(p.id))).toHaveLength(3)

    // Third split
    players[2] = { ...players[2], cards: [players[2].cards[0], makeCard('8')] }
    players = performSplit(players, 2)
    expect(players.filter((p) => isYouHand(p.id))).toHaveLength(4)
  })

  it('split hand gets correct sequential ID', () => {
    let players = [makePlayer('you', [makeCard('8'), makeCard('8')])]
    players = performSplit(players, 0)
    players[1] = { ...players[1], cards: [players[1].cards[0], makeCard('8')] }
    players = performSplit(players, 1)
    players[2] = { ...players[2], cards: [players[2].cards[0], makeCard('8')] }
    players = performSplit(players, 2)

    const youIds = players.filter((p) => isYouHand(p.id)).map((p) => p.id)
    expect(youIds).toEqual(['you', 'you-1', 'you-2', 'you-3'])
  })
})

// ─── settleRound money calculation ────────────────────────────────────────────

describe('settle round money for split hands', () => {
  function calcRoundNet(youHands, activeBet) {
    let net = 0
    for (const hand of youHands) {
      const stake = activeBet * (hand.doubled ? 2 : 1)
      if (hand.result === 'Win') net += stake
      else if (hand.result === 'Blackjack!') net += stake * 1.5
      else if (hand.result === 'Lose' || hand.result === 'Bust') net -= stake
    }
    return net
  }

  it('wins on a single hand', () => {
    const hands = [{ ...makePlayer('you'), result: 'Win', doubled: false }]
    expect(calcRoundNet(hands, 10)).toBe(10)
  })

  it('loses on a single hand', () => {
    const hands = [{ ...makePlayer('you'), result: 'Lose', doubled: false }]
    expect(calcRoundNet(hands, 10)).toBe(-10)
  })

  it('nets correctly across two split hands: win + lose = 0', () => {
    const hands = [
      { ...makePlayer('you'), result: 'Win', doubled: false },
      { ...makePlayer('you-1'), result: 'Lose', doubled: false },
    ]
    expect(calcRoundNet(hands, 10)).toBe(0)
  })

  it('nets correctly across three split hands', () => {
    const hands = [
      { ...makePlayer('you'), result: 'Win', doubled: false },
      { ...makePlayer('you-1'), result: 'Win', doubled: false },
      { ...makePlayer('you-2'), result: 'Lose', doubled: false },
    ]
    expect(calcRoundNet(hands, 25)).toBe(25) // +25 +25 -25 = +25
  })

  it('doubles the stake on a doubled hand', () => {
    const hands = [
      { ...makePlayer('you'), result: 'Win', doubled: true },
    ]
    expect(calcRoundNet(hands, 10)).toBe(20)
  })

  it('counts pushes as 0', () => {
    const hands = [
      { ...makePlayer('you'), result: 'Push', doubled: false },
      { ...makePlayer('you-1'), result: 'Win', doubled: false },
    ]
    expect(calcRoundNet(hands, 10)).toBe(10)
  })

  it('handles 4 split hands (max) correctly', () => {
    const hands = [
      { ...makePlayer('you'), result: 'Win', doubled: false },
      { ...makePlayer('you-1'), result: 'Win', doubled: false },
      { ...makePlayer('you-2'), result: 'Lose', doubled: false },
      { ...makePlayer('you-3'), result: 'Bust', doubled: false },
    ]
    expect(calcRoundNet(hands, 10)).toBe(0) // +10 +10 -10 -10 = 0
  })
})

// ─── handValue edge cases relevant to splitting ───────────────────────────────

describe('handValue with single cards after split', () => {
  it('values a single card correctly', () => {
    expect(handValue([makeCard('8')]).total).toBe(8)
  })

  it('values a split ace as 11 initially', () => {
    expect(handValue([makeCard('A')]).total).toBe(11)
  })

  it('adjusts ace to 1 when total would bust', () => {
    const cards = [makeCard('A'), makeCard('K'), makeCard('5')]
    expect(handValue(cards).total).toBe(16)
  })
})
