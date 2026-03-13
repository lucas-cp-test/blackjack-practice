import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  getBasicStrategyAdvice,
  getBasicStrategyAction,
  getDealerUpCard,
  handValue,
  isBlackjack,
} from './basicStrategy'

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

const BOT_SEAT_LAYOUTS = {
  0: [],
  1: ['bot-top'],
  2: ['bot-left', 'bot-right'],
  3: ['bot-left', 'bot-top', 'bot-right'],
  4: ['bot-left', 'bot-top-left', 'bot-top-right', 'bot-right'],
}

const THEME_OPTIONS = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'high-contrast', label: 'High-Contrast' },
  { value: 'dark-mode', label: 'Dark Mode' },
  { value: 'retro', label: 'Retro' },
  { value: 'star-wars', label: 'Star Wars' },
  { value: 'walrus', label: 'Walrus' },
]

const DEFAULT_BET = 10
const BET_PRESET_AMOUNTS = [10, 25, 50, 100, 250]
const DECK_COUNT = 6
const MIN_CUT_CARD_REMAINING = 52
const MAX_CUT_CARD_REMAINING = 78

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

let nextCardId = 0

function shuffleCards(cards) {
  const next = [...cards]

  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }

  return next
}

function getCutCardRemaining(totalCards) {
  const maxRemaining = Math.min(MAX_CUT_CARD_REMAINING, Math.max(12, totalCards - 10))
  const minRemaining = Math.min(MIN_CUT_CARD_REMAINING, maxRemaining)
  return Math.floor(Math.random() * (maxRemaining - minRemaining + 1)) + minRemaining
}

function createShoeState(existingCards = null) {
  const sourceCards =
    existingCards && existingCards.length >= 52 ? shuffleCards(existingCards) : createShoe(DECK_COUNT)

  return {
    shoe: sourceCards,
    discard: [],
    cutCardRemaining: getCutCardRemaining(sourceCards.length),
    cutCardReached: false,
  }
}

function createShoe(deckCount = DECK_COUNT) {
  const cards = []

  for (let deck = 0; deck < deckCount; deck += 1) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({
          id: `card-${nextCardId++}`,
          rank,
          suit,
          value: rank === 'A' ? 11 : ['J', 'Q', 'K'].includes(rank) ? 10 : Number(rank),
        })
      }
    }
  }

  return shuffleCards(cards)
}

function createPlayers(extraPlayers) {
  const bots = Array.from({ length: extraPlayers }, (_, index) => ({
    id: `bot-${index + 1}`,
    name: `Player ${index + 2}`,
    type: 'bot',
    cards: [],
    status: 'playing',
    doubled: false,
    result: '',
  }))

  return [
    {
      id: 'you',
      name: 'You',
      type: 'human',
      cards: [],
      status: 'playing',
      doubled: false,
      result: '',
    },
    ...bots,
  ]
}

function newRoundState(
  extraPlayers,
  existingShoe = [],
  roundSummary = '',
  record = { wins: 0, losses: 0, pushes: 0 },
  money = { net: 0, lastChange: 0 },
  activeBet = DEFAULT_BET,
  existingDiscard = [],
  cutCardRemaining = MIN_CUT_CARD_REMAINING,
  cutCardReached = false,
) {
  const freshShoeState = existingShoe.length < 52 ? createShoeState() : null
  const shoe = freshShoeState ? freshShoeState.shoe : [...existingShoe]
  const discard = freshShoeState ? freshShoeState.discard : [...existingDiscard]
  const resolvedCutCardRemaining = freshShoeState ? freshShoeState.cutCardRemaining : cutCardRemaining
  const resolvedCutCardReached = freshShoeState ? false : cutCardReached

  return {
    shoe,
    discard,
    cutCardRemaining: resolvedCutCardRemaining,
    cutCardReached: resolvedCutCardReached,
    players: createPlayers(extraPlayers),
    dealer: {
      id: 'dealer',
      name: 'Dealer',
      cards: [],
      status: 'playing',
    },
    phase: 'ready',
    activePlayerIndex: 0,
    message: 'Press Deal to begin.',
    dealTick: 0,
    roundSummary,
    record,
    money,
    activeBet,
  }
}

function isYouHand(id) {
  return id === 'you' || id.startsWith('you-')
}

function getActionFromStrategyTip(tip) {
  if (tip === 'Split') {
    return 'split'
  }

  if (tip.startsWith('Double')) {
    return 'double'
  }

  if (tip.startsWith('Stand')) {
    return 'stand'
  }

  if (tip.startsWith('Hit')) {
    return 'hit'
  }

  return null
}

function getRoundOutcome(player, dealerCards) {
  const playerTotal = handValue(player.cards).total
  const dealerTotal = handValue(dealerCards).total
  const dealerBust = dealerTotal > 21
  const playerBust = playerTotal > 21
  const playerNatural = isBlackjack(player.cards)
  const dealerNatural = isBlackjack(dealerCards)

  if (playerBust) {
    return 'Bust'
  }
  if (dealerNatural && !playerNatural) {
    return 'Lose'
  }
  if (playerNatural && !dealerNatural) {
    return 'Blackjack!'
  }
  if (dealerBust) {
    return 'Win'
  }
  if (playerTotal > dealerTotal) {
    return 'Win'
  }
  if (playerTotal < dealerTotal) {
    return 'Lose'
  }
  return 'Push'
}

function buildSummary(players) {
  const wins = players.filter((player) => player.result === 'Win' || player.result === 'Blackjack!').length
  const losses = players.filter((player) => player.result === 'Lose' || player.result === 'Bust').length

  return `${wins} win${wins === 1 ? '' : 's'} / ${losses} loss${losses === 1 ? '' : 'es'}`
}

function sanitizeTheme(value) {
  return THEME_OPTIONS.some((option) => option.value === value) ? value : 'minimal'
}

function formatMoney(amount) {
  return currencyFormatter.format(amount)
}

function formatSignedMoney(amount) {
  if (amount === 0) {
    return formatMoney(0)
  }

  return `${amount > 0 ? '+' : '-'}${formatMoney(Math.abs(amount))}`
}

function App() {
  const [menuOpen, setMenuOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState({
    extraPlayers: 0,
    showCheatSheet: true,
    theme: 'minimal',
  })
  const [settingsDraft, setSettingsDraft] = useState(settings)
  const [isBusy, setIsBusy] = useState(false)
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 780px)').matches : false,
  )
  const [mobileTab, setMobileTab] = useState('play')
  const [selectedBet, setSelectedBet] = useState(DEFAULT_BET)
  const [game, setGame] = useState(() => newRoundState(0))

  const gameRef = useRef(game)
  const settingsRef = useRef(settings)
  const busyRef = useRef(false)
  const botTurnRef = useRef(null)
  const dealerTurnRef = useRef(false)
  const runBotTurnRef = useRef(null)
  const runDealerTurnRef = useRef(null)
  const startRoundRef = useRef(null)
  const hitRef = useRef(null)
  const standRef = useRef(null)
  const doubleRef = useRef(null)
  const splitRef = useRef(null)

  useEffect(() => {
    gameRef.current = game
  }, [game])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const mediaQuery = window.matchMedia('(max-width: 780px)')
    const syncLayout = (event) => {
      setIsMobileLayout(event.matches)
    }

    mediaQuery.addEventListener('change', syncLayout)

    return () => mediaQuery.removeEventListener('change', syncLayout)
  }, [])

  const updateGame = (updater) => {
    setGame((previous) => {
      const next = updater(previous)
      gameRef.current = next
      return next
    })
  }

  const setBusy = (value) => {
    busyRef.current = value
    setIsBusy(value)
  }

  const resetTable = (extraPlayers) => {
    updateGame((previous) =>
      newRoundState(
        extraPlayers,
        previous.shoe,
        previous.roundSummary,
        previous.record,
        previous.money,
        previous.activeBet,
        previous.discard,
        previous.cutCardRemaining,
        previous.cutCardReached,
      ),
    )
  }

  const dealCardTo = async (targetId, isDealer = false, hidden = false) => {
    updateGame((previous) => {
      const shoe = [...previous.shoe]
      const drawn = shoe.pop()

      if (!drawn) {
        const reshuffled = createShoeState([...previous.shoe, ...previous.discard])
        return {
          ...newRoundState(
            settingsRef.current.extraPlayers,
            reshuffled.shoe,
            previous.roundSummary,
            previous.record,
            previous.money,
            previous.activeBet,
            reshuffled.discard,
            reshuffled.cutCardRemaining,
            reshuffled.cutCardReached,
          ),
          message: 'Shuffling a fresh shoe...',
        }
      }

      const nextCard = {
        ...drawn,
        hidden,
        dealtAt: previous.dealTick,
      }

      const nextState = {
        ...previous,
        shoe,
        discard: [...previous.discard, drawn],
        cutCardReached: previous.cutCardReached || shoe.length <= previous.cutCardRemaining,
        dealTick: previous.dealTick + 1,
      }

      if (isDealer) {
        return {
          ...nextState,
          dealer: {
            ...previous.dealer,
            cards: [...previous.dealer.cards, nextCard],
          },
        }
      }

      return {
        ...nextState,
        players: previous.players.map((player) =>
          player.id === targetId ? { ...player, cards: [...player.cards, nextCard] } : player,
        ),
      }
    })

    await wait(220)
  }

  const setPlayerStatus = (playerId, status) => {
    updateGame((previous) => ({
      ...previous,
      players: previous.players.map((player) =>
        player.id === playerId ? { ...player, status } : player,
      ),
    }))
  }

  const advanceTurn = () => {
    updateGame((previous) => {
      if (previous.phase !== 'playing') {
        return previous
      }

      let nextIndex = previous.activePlayerIndex + 1

      while (nextIndex < previous.players.length && previous.players[nextIndex].status !== 'playing') {
        nextIndex += 1
      }

      if (nextIndex < previous.players.length) {
        const nextPlayer = previous.players[nextIndex]
        return {
          ...previous,
          activePlayerIndex: nextIndex,
          message: nextPlayer.type === 'human' ? 'Your move.' : `${nextPlayer.name} is thinking...`,
        }
      }

      return {
        ...previous,
        phase: 'dealer',
        activePlayerIndex: -1,
        message: 'Dealer turn.',
      }
    })
  }

  const settleRound = () => {
    updateGame((previous) => {
      const resolvedPlayers = previous.players.map((player) => ({
        ...player,
        result: getRoundOutcome(player, previous.dealer.cards),
      }))
      const youHands = resolvedPlayers.filter((player) => isYouHand(player.id))
      const nextRecord = { ...previous.record }
      let roundNet = 0

      for (const hand of youHands) {
        const stake = previous.activeBet * (hand.doubled ? 2 : 1)
        if (hand.result === 'Win' || hand.result === 'Blackjack!') {
          nextRecord.wins += 1
          roundNet += hand.result === 'Blackjack!' ? stake * 1.5 : stake
        } else if (hand.result === 'Lose' || hand.result === 'Bust') {
          nextRecord.losses += 1
          roundNet -= stake
        } else {
          nextRecord.pushes += 1
        }
      }

      return {
        ...previous,
        phase: 'finished',
        players: resolvedPlayers,
        roundSummary: buildSummary(resolvedPlayers),
        record: nextRecord,
        money: {
          net: previous.money.net + roundNet,
          lastChange: roundNet,
        },
        message: previous.cutCardReached
          ? 'Round complete. Cut card reached - shoe will shuffle next hand.'
          : 'Round complete.',
      }
    })

    dealerTurnRef.current = false
  }

  const runDealerTurn = async () => {
    if (dealerTurnRef.current) {
      return
    }

    dealerTurnRef.current = true

    updateGame((previous) => ({
      ...previous,
      dealer: {
        ...previous.dealer,
        cards: previous.dealer.cards.map((card) => ({ ...card, hidden: false })),
      },
      message: 'Dealer reveals the hole card.',
    }))

    await wait(400)

    while (true) {
      const snapshot = gameRef.current
      const dealerValue = handValue(snapshot.dealer.cards).total

      if (dealerValue >= 17) {
        break
      }

      updateGame((previous) => ({
        ...previous,
        message: 'Dealer hits.',
      }))

      await dealCardTo('dealer', true)
      await wait(240)
    }

    updateGame((previous) => ({
      ...previous,
      dealer: {
        ...previous.dealer,
        status: handValue(previous.dealer.cards).total > 21 ? 'bust' : 'stand',
      },
      message: 'Dealer stands.',
    }))

    await wait(300)
    settleRound()
  }

  const runBotTurn = async (botId) => {
    if (botTurnRef.current === botId) {
      return
    }

    botTurnRef.current = botId
    await wait(350)

    while (true) {
      const snapshot = gameRef.current
      if (snapshot.phase !== 'playing') {
        break
      }

      const activePlayer = snapshot.players[snapshot.activePlayerIndex]
      if (!activePlayer || activePlayer.id !== botId) {
        break
      }

      const total = handValue(activePlayer.cards).total
      if (total >= 17) {
        updateGame((previous) => ({
          ...previous,
          players: previous.players.map((player) =>
            player.id === botId ? { ...player, status: 'stand' } : player,
          ),
          message: `${activePlayer.name} stands on ${total}.`,
        }))
        await wait(320)
        break
      }

      updateGame((previous) => ({
        ...previous,
        message: `${activePlayer.name} hits.`,
      }))
      await dealCardTo(botId)

      const nextSnapshot = gameRef.current
      const nextPlayer = nextSnapshot.players[nextSnapshot.activePlayerIndex]
      const nextTotal = handValue(nextPlayer.cards).total

      if (nextTotal > 21) {
        updateGame((previous) => ({
          ...previous,
          players: previous.players.map((player) =>
            player.id === botId ? { ...player, status: 'bust' } : player,
          ),
          message: `${activePlayer.name} busts with ${nextTotal}.`,
        }))
        await wait(320)
        break
      }

      await wait(200)
    }

    botTurnRef.current = null
    advanceTurn()
  }

  const startRound = async () => {
    if (busyRef.current) {
      return
    }

    setBusy(true)
    botTurnRef.current = null
    dealerTurnRef.current = false

    const nextPlayers = createPlayers(settingsRef.current.extraPlayers)

    updateGame((previous) => {
      const shouldReshuffle = previous.cutCardReached || previous.shoe.length < 20
      const nextShoeState = shouldReshuffle
        ? createShoeState([...previous.shoe, ...previous.discard])
        : {
            shoe: previous.shoe,
            discard: previous.discard,
            cutCardRemaining: previous.cutCardRemaining,
            cutCardReached: previous.cutCardReached,
          }

      return {
        ...newRoundState(
          settingsRef.current.extraPlayers,
          nextShoeState.shoe,
          previous.roundSummary,
          previous.record,
          previous.money,
          selectedBet,
          nextShoeState.discard,
          nextShoeState.cutCardRemaining,
          nextShoeState.cutCardReached,
        ),
        players: nextPlayers,
        phase: 'dealing',
        message: shouldReshuffle ? 'Cut card reached. Shuffling the shoe...' : 'Dealing cards...',
      }
    })

    for (const player of nextPlayers) {
      await dealCardTo(player.id)
    }
    await dealCardTo('dealer', true)

    for (const player of nextPlayers) {
      await dealCardTo(player.id)
    }
    await dealCardTo('dealer', true, true)

    const snapshot = gameRef.current
    const dealerNatural = isBlackjack(snapshot.dealer.cards)

    if (dealerNatural) {
      updateGame((previous) => ({
        ...previous,
        phase: 'dealer',
        message: 'Dealer checks blackjack.',
      }))
      await runDealerTurn()
      setBusy(false)
      return
    }

    const playerIndex = snapshot.players.findIndex((player) => player.status === 'playing')

    updateGame((previous) => ({
      ...previous,
      phase: 'playing',
      activePlayerIndex: playerIndex === -1 ? 0 : playerIndex,
      message: 'Your move.',
    }))

    setBusy(false)
  }

  const handleHit = async () => {
    const snapshot = gameRef.current
    const activePlayer = snapshot.players[snapshot.activePlayerIndex]

    if (snapshot.phase !== 'playing' || !activePlayer || !isYouHand(activePlayer.id) || busyRef.current) {
      return
    }

    setBusy(true)
    const activeId = activePlayer.id

    await dealCardTo(activeId)

    const latest = gameRef.current
    const you = latest.players.find((player) => player.id === activeId)
    const total = handValue(you.cards).total

    if (total > 21) {
      setPlayerStatus(activeId, 'bust')
      updateGame((previous) => ({
        ...previous,
        message: `You bust with ${total}.`,
      }))
      setBusy(false)
      advanceTurn()
      return
    }

    if (total === 21) {
      setPlayerStatus(activeId, 'stand')
      updateGame((previous) => ({
        ...previous,
        message: '21. Standing automatically.',
      }))
      setBusy(false)
      advanceTurn()
      return
    }

    updateGame((previous) => ({
      ...previous,
      message: `You have ${total}. Hit or stand?`,
    }))
    setBusy(false)
  }

  const handleStand = () => {
    const snapshot = gameRef.current
    const activePlayer = snapshot.players[snapshot.activePlayerIndex]

    if (snapshot.phase !== 'playing' || !activePlayer || !isYouHand(activePlayer.id) || busyRef.current) {
      return
    }

    setPlayerStatus(activePlayer.id, 'stand')
    updateGame((previous) => ({
      ...previous,
      message: 'You stand.',
    }))

    advanceTurn()
  }

  const handleDouble = async () => {
    const snapshot = gameRef.current
    const activePlayer = snapshot.players[snapshot.activePlayerIndex]

    if (
      snapshot.phase !== 'playing' ||
      !activePlayer ||
      !isYouHand(activePlayer.id) ||
      activePlayer.cards.length !== 2 ||
      busyRef.current
    ) {
      return
    }

    setBusy(true)
    const activeId = activePlayer.id

    updateGame((previous) => ({
      ...previous,
      players: previous.players.map((player) =>
        player.id === activeId ? { ...player, doubled: true } : player,
      ),
      message: 'Double down: one final card.',
    }))

    await dealCardTo(activeId)

    const latest = gameRef.current
    const you = latest.players.find((player) => player.id === activeId)
    const total = handValue(you.cards).total

    setPlayerStatus(activeId, total > 21 ? 'bust' : 'stand')
    updateGame((previous) => ({
      ...previous,
      message: total > 21 ? `You bust with ${total}.` : `You stand on ${total}.`,
    }))

    setBusy(false)
    advanceTurn()
  }

  const handleSplit = async () => {
    const snapshot = gameRef.current
    const activePlayer = snapshot.players[snapshot.activePlayerIndex]
    const activeIndex = snapshot.activePlayerIndex

    if (
      snapshot.phase !== 'playing' ||
      !activePlayer ||
      !isYouHand(activePlayer.id) ||
      activePlayer.cards.length !== 2 ||
      activePlayer.cards[0].rank !== activePlayer.cards[1].rank ||
      busyRef.current
    ) {
      return
    }

    const splitCount = snapshot.players.filter((p) => isYouHand(p.id)).length - 1
    if (splitCount >= 3) {
      return
    }

    setBusy(true)

    const activeId = activePlayer.id
    const splitId = `you-${splitCount + 1}`
    const splitCard = activePlayer.cards[1]
    const isPairOfAces = splitCard.rank === 'A'

    updateGame((previous) => {
      const updatedPlayers = previous.players.map((player) =>
        player.id === activeId ? { ...player, cards: [player.cards[0]] } : player,
      )
      const splitHand = {
        id: splitId,
        name: 'Split Hand',
        type: 'human',
        cards: [splitCard],
        status: 'playing',
        doubled: false,
        result: '',
      }
      return {
        ...previous,
        players: [
          ...updatedPlayers.slice(0, activeIndex + 1),
          splitHand,
          ...updatedPlayers.slice(activeIndex + 1),
        ],
        message: 'Split! Dealing new cards to each hand...',
      }
    })

    await dealCardTo(activeId)
    await dealCardTo(splitId)

    if (isPairOfAces) {
      setPlayerStatus(activeId, 'stand')
      updateGame((previous) => ({ ...previous, message: 'Split aces: one card each. Standing.' }))
      setBusy(false)
      advanceTurn()
      return
    }

    const latest = gameRef.current
    const currentHand = latest.players.find((p) => p.id === activeId)
    if (currentHand && handValue(currentHand.cards).total === 21) {
      setPlayerStatus(activeId, 'stand')
      updateGame((previous) => ({ ...previous, message: '21. Standing automatically.' }))
      setBusy(false)
      advanceTurn()
      return
    }

    updateGame((previous) => ({ ...previous, message: 'Split complete. Your move.' }))
    setBusy(false)
  }

  const applySettings = async () => {
    const previousSettings = settingsRef.current
    const nextSettings = {
      ...settingsDraft,
      extraPlayers: Math.max(0, Math.min(4, Number(settingsDraft.extraPlayers) || 0)),
      theme: sanitizeTheme(settingsDraft.theme),
    }

    setSettings(nextSettings)
    settingsRef.current = nextSettings
    setSettingsOpen(false)

    if (nextSettings.extraPlayers !== previousSettings.extraPlayers) {
      resetTable(nextSettings.extraPlayers)
      await startRound()
    }
  }

  const openSettings = () => {
    setSettingsDraft({ ...settingsRef.current })
    setSettingsOpen(true)
  }

  const toggleCheatSheet = () => {
    setSettings((previous) => {
      const next = {
        ...previous,
        showCheatSheet: !previous.showCheatSheet,
      }
      settingsRef.current = next
      return next
    })
  }

  useEffect(() => {
    const handleKeydown = (event) => {
      if (menuOpen || settingsOpen) {
        return
      }

      const target = event.target
      if (target instanceof HTMLElement) {
        const isEditable =
          target.isContentEditable ||
          target.closest('input, select, textarea, button, [contenteditable="true"]')
        if (isEditable) {
          return
        }
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        void hitRef.current?.()
        return
      }

      if (event.code === 'Space') {
        event.preventDefault()
        const snapshot = gameRef.current

        if (snapshot.phase === 'finished' && !busyRef.current) {
          void startRoundRef.current?.()
          return
        }

        if (snapshot.phase !== 'playing' || busyRef.current) {
          return
        }

        const actingPlayer = snapshot.players[snapshot.activePlayerIndex]
        if (!actingPlayer || !isYouHand(actingPlayer.id)) {
          return
        }

        const splitCountForTip = snapshot.players.filter((p) => isYouHand(p.id)).length - 1
        const canSplitForTip =
          actingPlayer.cards.length === 2 &&
          actingPlayer.cards[0].rank === actingPlayer.cards[1].rank &&
          splitCountForTip < 3
        const tip = getBasicStrategyAction(
          actingPlayer.cards,
          getDealerUpCard(snapshot.dealer.cards),
          canSplitForTip,
        )
        const action = getActionFromStrategyTip(tip)

        if (action === 'split') {
          void splitRef.current?.()
          return
        }

        if (action === 'double') {
          void doubleRef.current?.()
          return
        }

        if (action === 'stand') {
          standRef.current?.()
          return
        }

        void hitRef.current?.()
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        standRef.current?.()
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        void doubleRef.current?.()
        return
      }

      if (event.key === 'ArrowRight') {
        if (gameRef.current.phase === 'finished' && !busyRef.current) {
          event.preventDefault()
          void startRoundRef.current?.()
        }
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [menuOpen, settingsOpen])

  useEffect(() => {
    runBotTurnRef.current = runBotTurn
    runDealerTurnRef.current = runDealerTurn
    startRoundRef.current = startRound
    hitRef.current = handleHit
    standRef.current = handleStand
    doubleRef.current = handleDouble
    splitRef.current = handleSplit
  })

  useEffect(() => {
    const snapshot = gameRef.current

    if (snapshot.phase === 'playing') {
      const activePlayer = snapshot.players[snapshot.activePlayerIndex]
      if (activePlayer?.type === 'bot') {
        void runBotTurnRef.current?.(activePlayer.id)
      }
    }

    if (snapshot.phase === 'dealer') {
      void runDealerTurnRef.current?.()
    }
  }, [game.phase, game.activePlayerIndex, game.players])

  const you = useMemo(() => {
    const activeP = game.players[game.activePlayerIndex]
    if (game.phase === 'playing' && activeP && isYouHand(activeP.id)) {
      return activeP
    }
    return game.players.find((player) => player.id === 'you') ?? createPlayers(0)[0]
  }, [game.players, game.phase, game.activePlayerIndex])

  const dealerUpCard = getDealerUpCard(game.dealer.cards)

  const activePlayer = game.players[game.activePlayerIndex]
  const canAct = game.phase === 'playing' && activePlayer && isYouHand(activePlayer.id) && !isBusy
  const splitCount = game.players.filter((p) => isYouHand(p.id)).length - 1
  const canSplit =
    canAct &&
    you.cards.length === 2 &&
    you.cards[0].rank === you.cards[1].rank &&
    splitCount < 3

  const basicStrategyAdvice = getBasicStrategyAdvice(you.cards, dealerUpCard, canSplit)
  const basicStrategyTip = basicStrategyAdvice.action

  const canEditBet = (game.phase === 'ready' || game.phase === 'finished') && !isBusy
  const totalCardsInShoe = game.shoe.length + game.discard.length
  const dealtPercent = totalCardsInShoe > 0 ? (game.discard.length / totalCardsInShoe) * 100 : 0
  const cutCardPercentRaw =
    totalCardsInShoe > 0 ? ((totalCardsInShoe - game.cutCardRemaining) / totalCardsInShoe) * 100 : 0
  const cutCardPercent = Math.min(96, Math.max(4, cutCardPercentRaw))
  const cardsUntilCut = Math.max(game.shoe.length - game.cutCardRemaining, 0)
  const spacebarActionLabel = (() => {
    if (game.phase === 'finished' && !isBusy) {
      return 'Next Round'
    }

    if (game.phase === 'playing' && activePlayer && isYouHand(activePlayer.id) && !isBusy) {
      const action = getActionFromStrategyTip(basicStrategyTip)
      if (action === 'split') {
        return 'Split'
      }
      if (action === 'double') {
        return 'Double'
      }
      if (action === 'stand') {
        return 'Stand'
      }
      return 'Hit'
    }

    return 'Waiting'
  })()

  const botSeats = BOT_SEAT_LAYOUTS[settings.extraPlayers] || BOT_SEAT_LAYOUTS[4]

  return (
    <div className={`app-shell theme-${settings.theme}`}>
      {menuOpen ? (
        <section className="menu-screen">
          <div className="menu-card">
            <p className="eyebrow">Blackjack Practice</p>
            <h1>Table Setup</h1>
            {/* Player count hidden: single-player only
            <label htmlFor="menu-extra-players">Players besides you and the dealer</label>
            <input
              id="menu-extra-players"
              type="range"
              min="0"
              max="4"
              value={settingsDraft.extraPlayers}
              onChange={(event) =>
                setSettingsDraft((previous) => ({
                  ...previous,
                  extraPlayers: Number(event.target.value),
                }))
              }
            />
            <p className="menu-count">{settingsDraft.extraPlayers} additional player(s)</p>
            */}
            <button
              className="primary"
              onClick={async () => {
                const nextSettings = {
                  ...settings,
                  extraPlayers: Number(settingsDraft.extraPlayers),
                  theme: sanitizeTheme(settingsDraft.theme),
                }
                setSettings(nextSettings)
                settingsRef.current = nextSettings
                setMenuOpen(false)
                resetTable(nextSettings.extraPlayers)
                await startRound()
              }}
            >
              Start Game
            </button>
          </div>
        </section>
      ) : (
        <>
          <header className="top-bar">
            <div>
              <h1>Blackjack Practice</h1>
              <p>{game.message}</p>
            </div>
            {!isMobileLayout ? (
              <section className="shoe-visual" aria-label="Current shoe status">
                <div className="shoe-visual-head">
                  <strong>Shoe</strong>
                  <span>
                    {game.shoe.length}/{totalCardsInShoe}
                  </span>
                </div>
                <div className="shoe-track" role="presentation">
                  <div className="shoe-progress" style={{ width: `${dealtPercent}%` }} />
                  <div className="cut-card-marker" style={{ left: `${cutCardPercent}%` }}>
                    CUT
                  </div>
                </div>
                <p className="shoe-visual-note">
                  {game.cutCardReached ? 'Cut card reached: reshuffle on next hand' : `${cardsUntilCut} cards to cut`}
                </p>
              </section>
            ) : null}
            {!isMobileLayout ? (
              <div className="bar-actions">
                <button className="soft" onClick={toggleCheatSheet}>
                  Cheat Sheet: {settings.showCheatSheet ? 'On' : 'Off'}
                </button>
                <button className="soft" onClick={openSettings}>
                  Game Settings
                </button>
              </div>
            ) : null}
          </header>

          <main className="table-area">
            <div className="felt">
              <div className="deck" aria-hidden="true">
                <span>DECK</span>
              </div>

              <section className="seat dealer">
                <div className="seat-header">
                  <h2>Dealer</h2>
                  <span>{handValue(game.dealer.cards.filter((card) => !card.hidden)).total || '?'}</span>
                </div>
                <div className="hand">
                  {game.dealer.cards.map((card) => (
                    <article
                      key={card.id}
                      className={`playing-card ${card.hidden ? 'hidden' : ''} ${
                        card.suit === '♥' || card.suit === '♦' ? 'red' : ''
                      }`}
                      style={{ '--deal-order': card.dealtAt }}
                    >
                      {card.hidden ? (
                        <div className="card-back" />
                      ) : (
                        <>
                          <span>{card.rank}</span>
                          <span>{card.suit}</span>
                        </>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              {game.players
                .filter((player) => player.type === 'bot')
                .map((player, index) => {
                  const value = handValue(player.cards).total
                  const seat = botSeats[index] || 'bot-right'
                  const isActive = activePlayer?.id === player.id && game.phase === 'playing'

                  return (
                    <section key={player.id} className={`seat ${seat} ${isActive ? 'active' : ''}`}>
                      <div className="seat-header">
                        <h2>{player.name}</h2>
                        <span>{value || '-'}</span>
                      </div>
                      <div className="hand">
                        {player.cards.map((card) => (
                          <article
                            key={card.id}
                            className={`playing-card ${card.suit === '♥' || card.suit === '♦' ? 'red' : ''}`}
                            style={{ '--deal-order': card.dealtAt }}
                          >
                            <span>{card.rank}</span>
                            <span>{card.suit}</span>
                          </article>
                        ))}
                      </div>
                      {game.phase === 'finished' ? <p className="result-chip">{player.result}</p> : null}
                    </section>
                  )
                })}

              <div className="you-hands-row">
                {game.players.filter((player) => isYouHand(player.id)).map((hand, handIndex) => {
                  const handTotal = handValue(hand.cards).total
                  const isHandActive = activePlayer?.id === hand.id && game.phase === 'playing'
                  const youHandCount = game.players.filter((p) => isYouHand(p.id)).length
                  return (
                    <section key={hand.id} className={`seat you ${isHandActive ? 'active' : ''}`}>
                      {handIndex === 0 ? (
                        <p className="spacebar-pill">Spacebar: {spacebarActionLabel}</p>
                      ) : null}
                      <div className="seat-header">
                        <h2>{youHandCount > 1 ? `Hand ${handIndex + 1}` : 'You'}</h2>
                        <span>{handTotal || '-'}</span>
                      </div>
                      <div className="hand">
                        {hand.cards.map((card) => (
                          <article
                            key={card.id}
                            className={`playing-card ${card.suit === '♥' || card.suit === '♦' ? 'red' : ''}`}
                            style={{ '--deal-order': card.dealtAt }}
                          >
                            <span>{card.rank}</span>
                            <span>{card.suit}</span>
                          </article>
                        ))}
                      </div>
                      <div className="seat-footer">
                        {hand.doubled ? <p className="result-chip">Doubled</p> : null}
                        {game.phase === 'finished' ? <p className="result-chip">{hand.result}</p> : null}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>

            <aside className={`sidebar ${isMobileLayout ? 'mobile-sidebar' : ''}`}>
              {isMobileLayout ? (
                <>
                  <section className="mobile-tabs" role="tablist" aria-label="Mobile control tabs">
                    <button
                      type="button"
                      className={`soft ${mobileTab === 'play' ? 'is-selected' : ''}`}
                      role="tab"
                      aria-selected={mobileTab === 'play'}
                      onClick={() => setMobileTab('play')}
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      className={`soft ${mobileTab === 'bet' ? 'is-selected' : ''}`}
                      role="tab"
                      aria-selected={mobileTab === 'bet'}
                      onClick={() => setMobileTab('bet')}
                    >
                      Bet
                    </button>
                    <button
                      type="button"
                      className={`soft ${mobileTab === 'settings' ? 'is-selected' : ''}`}
                      role="tab"
                      aria-selected={mobileTab === 'settings'}
                      onClick={() => {
                        setSettingsDraft({ ...settingsRef.current })
                        setMobileTab('settings')
                      }}
                    >
                      Settings
                    </button>
                  </section>

                  <div className="mobile-tab-panel">
                    {mobileTab === 'play' ? (
                      <>
                        <section className="controls">
                          <button className="primary" disabled={!canAct} onClick={() => void handleHit()}>
                            Hit
                          </button>
                          <button className="primary" disabled={!canAct} onClick={handleStand}>
                            Stand
                          </button>
                          <button
                            className="primary"
                            disabled={!canAct || you.cards.length !== 2}
                            onClick={() => void handleDouble()}
                          >
                            Double
                          </button>
                          {canSplit && (
                            <button
                              className="primary"
                              onClick={() => void handleSplit()}
                            >
                              Split
                            </button>
                          )}
                          <button
                            className="soft"
                            onClick={() => void startRound()}
                            disabled={game.phase === 'dealing'}
                          >
                            {game.phase === 'finished' ? 'Next' : 'Redeal'}
                          </button>
                          <p className="mobile-play-tip">
                            Best Move: <strong>{basicStrategyTip}</strong>
                          </p>
                          <p className="mobile-play-why">
                            Why: {basicStrategyAdvice.reason}
                          </p>
                        </section>

                        <section className="summary-card mobile-summary-card">
                          <h3>Round Summary</h3>
                          <p>
                            You: {game.record.wins}W / {game.record.losses}L / {game.record.pushes}P
                          </p>
                          <p>Hand Bet: {formatMoney(game.activeBet)}</p>
                          <p>Last Hand: {formatSignedMoney(game.money.lastChange)}</p>
                          <p>Total Net: {formatSignedMoney(game.money.net)}</p>
                        </section>

                        <section className="shoe-visual mobile-shoe-visual" aria-label="Current shoe status">
                          <div className="shoe-visual-head">
                            <strong>Shoe</strong>
                            <span>
                              {game.shoe.length}/{totalCardsInShoe}
                            </span>
                          </div>
                          <div className="shoe-track" role="presentation">
                            <div className="shoe-progress" style={{ width: `${dealtPercent}%` }} />
                            <div className="cut-card-marker" style={{ left: `${cutCardPercent}%` }}>
                              CUT
                            </div>
                          </div>
                          <p className="shoe-visual-note">
                            {game.cutCardReached
                              ? 'Cut card reached: reshuffle on next hand'
                              : `${cardsUntilCut} cards to cut`}
                          </p>
                        </section>

                      </>
                    ) : null}

                    {mobileTab === 'bet' ? (
                      <section className="bet-panel">
                        <h3>Betting</h3>
                        <p className="bankroll-line">Bankroll: <strong>∞</strong></p>

                        <label htmlFor="mobile-bet-amount">Next hand wager</label>
                        <input
                          id="mobile-bet-amount"
                          type="number"
                          min="1"
                          step="1"
                          value={selectedBet}
                          disabled={!canEditBet}
                          onChange={(event) => {
                            const numeric = Number(event.target.value)
                            const nextBet = Math.max(
                              1,
                              Number.isFinite(numeric) ? Math.floor(numeric) : DEFAULT_BET,
                            )
                            setSelectedBet(nextBet)
                          }}
                        />

                        <div className="bet-presets" role="group" aria-label="Preset bet amounts">
                          {BET_PRESET_AMOUNTS.map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              className={`soft ${selectedBet === amount ? 'is-selected' : ''}`}
                              disabled={!canEditBet}
                              onClick={() => setSelectedBet(amount)}
                            >
                              {formatMoney(amount)}
                            </button>
                          ))}
                        </div>

                        <p className="bet-lock-note">
                          {canEditBet ? 'Bet locks in when you deal.' : 'Finish this hand to change your next bet.'}
                        </p>
                      </section>
                    ) : null}

                    {mobileTab === 'settings' ? (
                      <section className="settings-card">
                        <h3>Game Settings</h3>

                        {/* Player count hidden: single-player only
                        <label htmlFor="mobile-settings-extra-players">
                          Players besides you and the dealer
                        </label>
                        <input
                          id="mobile-settings-extra-players"
                          type="range"
                          min="0"
                          max="4"
                          value={settingsDraft.extraPlayers}
                          onChange={(event) =>
                            setSettingsDraft((previous) => ({
                              ...previous,
                              extraPlayers: Number(event.target.value),
                            }))
                          }
                        />
                        <p>{settingsDraft.extraPlayers} additional player(s)</p>
                        */}

                        <label htmlFor="mobile-settings-theme">Theme</label>
                        <select
                          id="mobile-settings-theme"
                          value={settingsDraft.theme}
                          onChange={(event) =>
                            setSettingsDraft((previous) => ({
                              ...previous,
                              theme: event.target.value,
                            }))
                          }
                        >
                          {THEME_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <label className="check-row" htmlFor="mobile-settings-cheat-sheet">
                          <input
                            id="mobile-settings-cheat-sheet"
                            type="checkbox"
                            checked={settingsDraft.showCheatSheet}
                            onChange={(event) =>
                              setSettingsDraft((previous) => ({
                                ...previous,
                                showCheatSheet: event.target.checked,
                              }))
                            }
                          />
                          Show cheat sheet card
                        </label>

                        <button className="primary" onClick={() => void applySettings()}>
                          Save Settings
                        </button>
                      </section>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <section className="bet-panel">
                    <h3>Betting</h3>
                    <p className="bankroll-line">Bankroll: <strong>∞</strong></p>

                    <label htmlFor="bet-amount">Next hand wager</label>
                    <input
                      id="bet-amount"
                      type="number"
                      min="1"
                      step="1"
                      value={selectedBet}
                      disabled={!canEditBet}
                      onChange={(event) => {
                        const numeric = Number(event.target.value)
                        const nextBet = Math.max(1, Number.isFinite(numeric) ? Math.floor(numeric) : DEFAULT_BET)
                        setSelectedBet(nextBet)
                      }}
                    />

                    <div className="bet-presets" role="group" aria-label="Preset bet amounts">
                      {BET_PRESET_AMOUNTS.map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          className={`soft ${selectedBet === amount ? 'is-selected' : ''}`}
                          disabled={!canEditBet}
                          onClick={() => setSelectedBet(amount)}
                        >
                          {formatMoney(amount)}
                        </button>
                      ))}
                    </div>

                    <p className="bet-lock-note">
                      {canEditBet ? 'Bet locks in when you deal.' : 'Finish this hand to change your next bet.'}
                    </p>
                  </section>

                  <section className="controls">
                    <button className="primary" disabled={!canAct} onClick={() => void handleHit()}>
                      Hit
                    </button>
                    <button className="primary" disabled={!canAct} onClick={handleStand}>
                      Stand
                    </button>
                    <button
                      className="primary"
                      disabled={!canAct || you.cards.length !== 2}
                      onClick={() => void handleDouble()}
                    >
                      Double
                    </button>
                    {canSplit && (
                      <button
                        className="primary"
                        onClick={() => void handleSplit()}
                      >
                        Split
                      </button>
                    )}
                    <button className="soft" onClick={() => void startRound()} disabled={game.phase === 'dealing'}>
                      {game.phase === 'finished' ? 'Next Round' : 'Redeal'}
                    </button>
                  </section>

                  {settings.showCheatSheet ? (
                    <section className="cheat-sheet">
                      <h3>Basic Strategy</h3>
                      <p>
                        Dealer Up Card:{' '}
                        <strong>{dealerUpCard ? `${dealerUpCard.rank}${dealerUpCard.suit}` : '-'}</strong>
                      </p>
                      <p>
                        Your Hand: <strong>{basicStrategyAdvice.handLabel}</strong>
                      </p>
                      <p>
                        Your Best Move: <strong>{basicStrategyTip}</strong>
                      </p>
                      <p className="strategy-reason">
                        Why: {basicStrategyAdvice.reason}
                      </p>
                      <small>Static chart advice. No card counting adjustments.</small>
                    </section>
                  ) : null}

                  <section className="summary-card">
                    <h3>Round Summary</h3>
                    <p>
                      You: {game.record.wins}W / {game.record.losses}L / {game.record.pushes}P
                    </p>
                    <p>Hand Bet: {formatMoney(game.activeBet)}</p>
                    <p>Last Hand: {formatSignedMoney(game.money.lastChange)}</p>
                    <p>Total Net: {formatSignedMoney(game.money.net)}</p>
                  </section>
                </>
              )}
            </aside>
          </main>
        </>
      )}

      {settingsOpen ? (
        <div className="modal-layer" role="presentation" onClick={() => setSettingsOpen(false)}>
          <section className="settings-modal" onClick={(event) => event.stopPropagation()}>
            <h2>Game Settings</h2>

            {/* Player count hidden: single-player only
            <label htmlFor="settings-extra-players">Players besides you and the dealer</label>
            <input
              id="settings-extra-players"
              type="range"
              min="0"
              max="4"
              value={settingsDraft.extraPlayers}
              onChange={(event) =>
                setSettingsDraft((previous) => ({
                  ...previous,
                  extraPlayers: Number(event.target.value),
                }))
              }
            />
            <p>{settingsDraft.extraPlayers} additional player(s)</p>
            */}

            <label htmlFor="settings-theme">Theme</label>
            <select
              id="settings-theme"
              value={settingsDraft.theme}
              onChange={(event) =>
                setSettingsDraft((previous) => ({
                  ...previous,
                  theme: event.target.value,
                }))
              }
            >
              {THEME_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="check-row" htmlFor="settings-cheat-sheet">
              <input
                id="settings-cheat-sheet"
                type="checkbox"
                checked={settingsDraft.showCheatSheet}
                onChange={(event) =>
                  setSettingsDraft((previous) => ({
                    ...previous,
                    showCheatSheet: event.target.checked,
                  }))
                }
              />
              Show cheat sheet card
            </label>

            <div className="modal-actions">
              <button className="soft" onClick={() => setSettingsOpen(false)}>
                Cancel
              </button>
              <button className="primary" onClick={() => void applySettings()}>
                Save Settings
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App
