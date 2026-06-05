export const TIMER_DURATION_SECONDS = 60

export function formatCountdown(totalSeconds) {
  const clampedSeconds = Math.max(0, totalSeconds)
  const minutes = String(Math.floor(clampedSeconds / 60)).padStart(2, '0')
  const seconds = String(clampedSeconds % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function getNextCountdownValue(totalSeconds) {
  return Math.max(0, totalSeconds - 1)
}

export function createInitialTimerState() {
  return { timeLeft: TIMER_DURATION_SECONDS, isRunning: false }
}

export function countdownTimerReducer(state, action) {
  switch (action.type) {
    case 'start':
      if (state.timeLeft === 0) {
        return state
      }
      return { ...state, isRunning: true }
    case 'stop':
      return { ...state, isRunning: false }
    case 'reset':
      return createInitialTimerState()
    case 'tick': {
      if (!state.isRunning || state.timeLeft === 0) {
        return state
      }
      const nextTimeLeft = getNextCountdownValue(state.timeLeft)
      return { timeLeft: nextTimeLeft, isRunning: nextTimeLeft > 0 }
    }
    default:
      return state
  }
}
