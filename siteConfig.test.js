import { describe, expect, it } from 'vitest'
import { gamePages, getBasePath, getGamePagePath, getRepoName, parseGitHubRepo } from './siteConfig'

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
    expect(getGamePagePath(gamePages[0].slug)).toBe('./blackjack-practice/')
  })
})

describe('parseGitHubRepo', () => {
  it('extracts owner/repo from a GitHub Pages location', () => {
    expect(
      parseGitHubRepo({ hostname: 'lucas-cp-test.github.io', pathname: '/blackjack-practice/kub-leader/' }),
    ).toBe('lucas-cp-test/blackjack-practice')
  })

  it('returns null when not on a github.io hostname', () => {
    expect(parseGitHubRepo({ hostname: 'localhost', pathname: '/kub-leader/' })).toBeNull()
  })

  it('returns null when there is no path segment after the hostname', () => {
    expect(parseGitHubRepo({ hostname: 'lucas-cp-test.github.io', pathname: '/' })).toBeNull()
  })
})
