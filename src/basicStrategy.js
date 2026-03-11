const FACE_CARD_RANKS = new Set(['J', 'Q', 'K'])

function formatDealerValue(dealerValue) {
  return dealerValue === 11 ? 'Ace' : String(dealerValue)
}

function formatPairRank(rank) {
  if (rank === 'A') return 'Aces'
  if (rank === 'J') return 'Jacks'
  if (rank === 'Q') return 'Queens'
  if (rank === 'K') return 'Kings'
  return `${rank}s`
}

function lowercaseFirst(text) {
  if (!text) {
    return text
  }

  return text[0].toLowerCase() + text.slice(1)
}

function getDoubleAdvice(canDouble, fallbackAction, doubleReason, fallbackReason) {
  if (canDouble) {
    return {
      action: 'Double',
      reason: doubleReason,
    }
  }

  return {
    action: `${fallbackAction} (Double if allowed)`,
    reason: fallbackReason,
  }
}

function describeHand(cards, total, soft) {
  if (cards.length === 0) {
    return '-'
  }

  const ranks = cards.map((card) => card.rank).join(', ')
  const isPair = cards.length === 2 && cards[0].rank === cards[1].rank

  if (isPair) {
    return `Pair of ${formatPairRank(cards[0].rank)} (${ranks})`
  }

  return `${soft ? 'Soft' : 'Hard'} ${total} (${ranks})`
}

export function handValue(cards) {
  let total = 0
  let aceCount = 0

  for (const card of cards) {
    total += card.value
    if (card.rank === 'A') {
      aceCount += 1
    }
  }

  while (total > 21 && aceCount > 0) {
    total -= 10
    aceCount -= 1
  }

  return {
    total,
    soft: aceCount > 0,
  }
}

export function isBlackjack(cards) {
  return cards.length === 2 && handValue(cards).total === 21
}

export function getSplitRecommendation(rank, dealerValue) {
  if (rank === 'A' || rank === '8') return true
  if (rank === '5' || rank === '10' || FACE_CARD_RANKS.has(rank)) return false
  if (rank === '4') return dealerValue >= 5 && dealerValue <= 6
  if (rank === '2' || rank === '3') return dealerValue >= 2 && dealerValue <= 7
  if (rank === '6') return dealerValue >= 2 && dealerValue <= 6
  if (rank === '7') return dealerValue >= 2 && dealerValue <= 7
  if (rank === '9') {
    return (dealerValue >= 2 && dealerValue <= 6) || (dealerValue >= 8 && dealerValue <= 9)
  }

  return false
}

export function getDealerUpCard(dealerCards) {
  return dealerCards.find((card) => !card.hidden) ?? null
}

export function getBasicStrategyAdvice(playerCards, dealerUpCard, canSplit = false) {
  if (!dealerUpCard || playerCards.length === 0) {
    return {
      action: 'Deal cards to get a recommendation.',
      handLabel: '-',
      reason: 'Once both hands are visible, the chart compares your hand against the dealer up card.',
    }
  }

  const { total, soft } = handValue(playerCards)
  const dealerValue = dealerUpCard.rank === 'A' ? 11 : dealerUpCard.value
  const dealerLabel = formatDealerValue(dealerValue)
  const canDouble = playerCards.length === 2
  const isPair = playerCards.length === 2 && playerCards[0].rank === playerCards[1].rank
  const pairRank = isPair ? playerCards[0].rank : null
  const splitRecommended = pairRank ? getSplitRecommendation(pairRank, dealerValue) : false
  const handLabel = describeHand(playerCards, total, soft)

  if (canSplit && splitRecommended) {
    let reason = `Split because two new hands from ${pairRank}s outperform playing the pair as one hand here.`

    if (pairRank === 'A') {
      reason = 'Split aces because two hands starting from an Ace are far stronger than playing A,A as a soft 12.'
    } else if (pairRank === '8') {
      reason = 'Split 8s because hard 16 is one of the weakest totals, while two hands starting from 8 give you better upside.'
    } else if (pairRank === '9') {
      reason = `Split 9s because dealer ${dealerLabel} gives you more value from two separate 9-starting hands than from standing on 18.`
    } else if (pairRank === '4') {
      reason = 'Split 4s here because dealer 5 or 6 is weak enough that two fresh hands gain more value than sitting on 8.'
    }

    return {
      action: 'Split',
      handLabel,
      reason,
    }
  }

  let advice

  if (soft) {
    if (total <= 17) {
      if (total <= 14) {
        advice =
          dealerValue >= 5 && dealerValue <= 6
            ? getDoubleAdvice(
                canDouble,
                'Hit',
                `Double because soft ${total} cannot bust with one card and dealer ${dealerLabel} is weak.`,
                `This is usually a double spot because soft ${total} cannot bust with one card and dealer ${dealerLabel} is weak. Since doubling is not available, hit.`,
              )
            : {
                action: 'Hit',
                reason: `Hit because soft ${total} is too weak to stand, and the Ace lets you improve without busting on one card.`,
              }
      } else if (total <= 16) {
        advice =
          dealerValue >= 4 && dealerValue <= 6
            ? getDoubleAdvice(
                canDouble,
                'Hit',
                `Double because soft ${total} plays well into dealer ${dealerLabel}, and you still cannot bust with one card.`,
                `This is usually a double spot because soft ${total} plays well into dealer ${dealerLabel}. Since doubling is not available, hit.`,
              )
            : {
                action: 'Hit',
                reason: `Hit because soft ${total} still needs improvement, and the Ace keeps the bust risk low.`,
              }
      } else {
        advice =
          dealerValue >= 3 && dealerValue <= 6
            ? getDoubleAdvice(
                canDouble,
                'Hit',
                `Double because soft 17 has room to improve and dealer ${dealerLabel} is weak enough to press the edge.`,
                'This is usually a double spot because soft 17 has room to improve against a weak dealer. Since doubling is not available, hit.',
              )
            : {
                action: 'Hit',
                reason: 'Hit because soft 17 is not strong enough to stand, and you can improve without immediate bust risk.',
              }
      }
    } else if (total === 18) {
      if (dealerValue >= 3 && dealerValue <= 6) {
        advice = getDoubleAdvice(
          canDouble,
          'Stand',
          `Double because soft 18 is already live and dealer ${dealerLabel} is weak enough to push for extra value.`,
          `This is usually a double spot because soft 18 is strong against dealer ${dealerLabel}. Since doubling is not available, stand.`,
        )
      } else if ([2, 7, 8].includes(dealerValue)) {
        advice = {
          action: 'Stand',
          reason: `Stand because soft 18 is already a solid made hand against dealer ${dealerLabel}, and hitting gives away value.`,
        }
      } else {
        advice = {
          action: 'Hit',
          reason: `Hit because dealer ${dealerLabel} is too strong to sit on soft 18, and the Ace keeps your bust risk low.`,
        }
      }
    } else {
      advice = {
        action: 'Stand',
        reason: `Stand because soft ${total} is already a strong made hand and gains little from another card.`,
      }
    }
  } else if (total <= 8) {
    advice = {
      action: 'Hit',
      reason: `Hit because hard ${total} is too weak to win by standing, and you do not face much bust risk yet.`,
    }
  } else if (total === 9) {
    advice =
      dealerValue >= 3 && dealerValue <= 6
        ? getDoubleAdvice(
            canDouble,
            'Hit',
            `Double because dealer ${dealerLabel} is weak and one card often turns hard 9 into a strong finishing total.`,
            `This is usually a double spot because dealer ${dealerLabel} is weak and hard 9 has upside. Since doubling is not available, hit.`,
          )
        : {
            action: 'Hit',
            reason: `Hit because hard 9 is not strong enough to stand or double against dealer ${dealerLabel}.`,
          }
  } else if (total === 10) {
    advice =
      dealerValue >= 2 && dealerValue <= 9
        ? getDoubleAdvice(
            canDouble,
            'Hit',
            `Double because hard 10 is a strong build hand and dealer ${dealerLabel} is weak enough to attack.`,
            `This is usually a double spot because hard 10 has strong upside against dealer ${dealerLabel}. Since doubling is not available, hit.`,
          )
        : {
            action: 'Hit',
            reason: `Hit because dealer ${dealerLabel} is too strong to commit extra money with hard 10.`,
          }
  } else if (total === 11) {
    advice =
      dealerValue <= 10
        ? getDoubleAdvice(
            canDouble,
            'Hit',
            `Double because hard 11 is one of the best drawing totals against dealer ${dealerLabel}.`,
            `This is usually a double spot because hard 11 draws very well against dealer ${dealerLabel}. Since doubling is not available, hit.`,
          )
        : {
            action: 'Hit',
            reason: 'Hit because dealer Ace is strong enough that this chart does not press hard 11 with a double.',
          }
  } else if (total === 12) {
    advice =
      dealerValue >= 4 && dealerValue <= 6
        ? {
            action: 'Stand',
            reason: `Stand because dealer ${dealerLabel} is more likely to bust, while hitting 12 often creates your own problem first.`,
          }
        : {
            action: 'Hit',
            reason: `Hit because hard 12 loses too often to dealer ${dealerLabel} if you stand pat.`,
          }
  } else if (total >= 13 && total <= 16) {
    advice =
      dealerValue <= 6
        ? {
            action: 'Stand',
            reason: `Stand because dealer ${dealerLabel} is weak enough that the dealer should take the bust risk, not you.`,
          }
        : {
            action: 'Hit',
            reason: `Hit because dealer ${dealerLabel} will often finish above hard ${total}, so standing gives up too much equity.`,
          }
  } else {
    advice = {
      action: 'Stand',
      reason: `Stand because hard ${total} is already a made hand and another card risks turning a winner into a bust.`,
    }
  }

  if (splitRecommended && !canSplit) {
    advice = {
      ...advice,
      reason: `Splitting would normally be the chart play here, but it is not available, so ${lowercaseFirst(
        advice.reason,
      )}`,
    }
  }

  return {
    ...advice,
    handLabel,
  }
}

export function getBasicStrategyAction(playerCards, dealerUpCard, canSplit = false) {
  return getBasicStrategyAdvice(playerCards, dealerUpCard, canSplit).action
}
