import { useState } from 'react'
import './Leaderboard.css'

const INITIAL_PLAYERS = [
  { name: 'Lucas', score: 7 },
  { name: 'Logan', score: 13 },
  { name: 'Meg', score: 15 },
  { name: 'Tessa', score: 17 },
]

export default function Leaderboard() {
  const [players, setPlayers] = useState(INITIAL_PLAYERS)
  const [winnerMenuOpen, setWinnerMenuOpen] = useState(false)

  const maxScore = Math.max(...players.map((p) => p.score))
  const sorted = [...players].sort((a, b) => b.score - a.score)

  function incrementScore(name) {
    setPlayers((prev) => prev.map((p) => (p.name === name ? { ...p, score: p.score + 1 } : p)))
    setWinnerMenuOpen(false)
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
    </div>
  )
}
