import { describe, expect, it } from 'vitest'
import { gamePages, getBasePath, getGamePagePath, getRepoName } from './siteConfig'

describe('siteConfig', () => {
  it('derives the repo name from the GitHub repository value', () => {
    expect(getRepoName('lucas-cp-test/blackjack-practice')).toBe('blackjack-practice')
  })

  it('uses the repo name as the GitHub Pages base path in Actions', () => {
    expect(
      getBasePath({
        githubActions: 'true',
        repository: 'lucas-cp-test/blackjack-practice',
      }),
    ).toBe('/blackjack-practice/')
  })

  it('falls back to the root path outside GitHub Actions', () => {
    expect(getBasePath({ githubActions: 'false', repository: 'lucas-cp-test/blackjack-practice' })).toBe('/')
  })

  it('creates a nested page path for each game', () => {
    expect(getGamePagePath(gamePages[0].slug)).toBe(`./${gamePages[0].slug}/`)
  })
})
