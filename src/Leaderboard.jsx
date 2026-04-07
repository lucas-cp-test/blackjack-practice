import { useState } from 'react'
import './Leaderboard.css'
import { parseGitHubRepo } from '../siteConfig.js'

const INITIAL_PLAYERS = [
  { name: 'Lucas', score: 8 },
  { name: 'Logan', score: 13 },
  { name: 'Meg', score: 15 },
  { name: 'Tessa', score: 17 },
]

const WORKFLOW_FILE = 'save-scores.yml'
const TOKEN_KEY = 'kub-leader-gh-token'

// sessionStorage keeps the token for this browser session only,
// reducing the risk of long-term exposure compared to localStorage.
const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (v) => sessionStorage.setItem(TOKEN_KEY, v),
}

export default function Leaderboard() {
  const [players, setPlayers] = useState(INITIAL_PLAYERS)
  const [winnerMenuOpen, setWinnerMenuOpen] = useState(false)
  const [pendingSave, setPendingSave] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // null | 'loading' | 'success' | 'error'
  const [saveError, setSaveError] = useState('')
  const [showTokenForm, setShowTokenForm] = useState(false)
  const [tokenInput, setTokenInput] = useState('')

  const maxScore = Math.max(...players.map((p) => p.score))
  const sorted = [...players].sort((a, b) => b.score - a.score)

  function incrementScore(name) {
    setPlayers((prev) => prev.map((p) => (p.name === name ? { ...p, score: p.score + 1 } : p)))
    setWinnerMenuOpen(false)
    setPendingSave(true)
    setSaveStatus(null)
    setSaveError('')
    setShowTokenForm(false)
  }

  async function dispatchSaveWorkflow(token, currentPlayers) {
    const repo = parseGitHubRepo(window.location)
    if (!repo) {
      setSaveStatus('error')
      setSaveError('Could not determine the GitHub repo from the page URL.')
      return
    }

    setSaveStatus('loading')
    const scores = currentPlayers.map(({ name, score }) => ({ name, score }))

    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          body: JSON.stringify({ ref: 'main', inputs: { scores: JSON.stringify(scores) } }),
        },
      )

      if (res.status === 204) {
        setSaveStatus('success')
        setPendingSave(false)
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveStatus('error')
        setSaveError(data.message ?? `HTTP ${res.status}`)
      }
    } catch (err) {
      setSaveStatus('error')
      setSaveError(err.message)
    }
  }

  function handleSaveClick() {
    const stored = tokenStore.get()
    if (stored) {
      dispatchSaveWorkflow(stored, players)
    } else {
      setShowTokenForm(true)
    }
  }

  function handleTokenSubmit(e) {
    e.preventDefault()
    const token = tokenInput.trim()
    if (!token) return
    tokenStore.set(token)
    setShowTokenForm(false)
    setTokenInput('')
    dispatchSaveWorkflow(token, players)
  }

  return (
    <div className="lb-shell">
      <h1 className="lb-title">KubLeader</h1>

      <ul className="lb-list">
        {sorted.map((player) => {
          const isTop = player.score === maxScore
          return (
            <li key={player.name} className={`lb-row${isTop ? ' lb-row--top' : ''}`}>
              {isTop && <span className="lb-crown">👑</span>}
              <span className="lb-name">{player.name}</span>
              <span className="lb-score">{player.score}</span>
            </li>
          )
        })}
      </ul>

      <div className="lb-winner-area">
        <button className="lb-winner-btn" onClick={() => setWinnerMenuOpen((o) => !o)}>
          Winner
        </button>

        {winnerMenuOpen && (
          <ul className="lb-winner-menu">
            {sorted.map((player) => (
              <li key={player.name}>
                <button className="lb-winner-option" onClick={() => incrementScore(player.name)}>
                  {player.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingSave && (
        <div className="lb-save-area">
          {saveStatus !== 'success' && (
            <button
              className="lb-save-btn"
              onClick={handleSaveClick}
              disabled={saveStatus === 'loading'}
            >
              {saveStatus === 'loading' ? 'Creating PR…' : 'Save Scores → PR'}
            </button>
          )}

          {saveStatus === 'success' && (
            <p className="lb-save-msg lb-save-msg--success">✅ PR created! Check GitHub.</p>
          )}

          {saveStatus === 'error' && (
            <p className="lb-save-msg lb-save-msg--error">❌ {saveError}</p>
          )}

          {showTokenForm && (
            <form className="lb-token-form" onSubmit={handleTokenSubmit}>
              <label className="lb-token-label" htmlFor="lb-token-input">
                GitHub token (repo + workflow scopes):
              </label>
              <input
                id="lb-token-input"
                className="lb-token-input"
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ghp_…"
                autoFocus
              />
              <button className="lb-token-submit" type="submit">
                Save &amp; Create PR
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
