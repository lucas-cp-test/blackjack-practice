export const gamePages = [
  {
    slug: 'blackjack-practice',
    title: 'Blackjack Practice',
    description: 'Train basic strategy and play quick blackjack hands.',
  },
  {
    slug: 'kub-leader',
    title: 'KubLeader',
    description: 'Track scores and crown the top player.',
  },
]

function getEnvValue(name) {
  return globalThis.process?.env?.[name]
}

export function getRepoName(repository = getEnvValue('GITHUB_REPOSITORY')) {
  return repository?.split('/')[1] ?? ''
}

export function getBasePath({
  githubActions = getEnvValue('GITHUB_ACTIONS'),
  repository = getEnvValue('GITHUB_REPOSITORY'),
} = {}) {
  const repoName = getRepoName(repository)
  return githubActions === 'true' && repoName ? `/${repoName}/` : '/'
}

export function getGamePagePath(slug) {
  return `./${slug}/`
}

/**
 * Derives "owner/repo" from a GitHub Pages location object.
 * On GitHub Pages the hostname is `{owner}.github.io` and the first
 * path segment is the repository name.
 *
 * @param {{ hostname: string, pathname: string }} location
 * @returns {string|null}
 */
export function parseGitHubRepo({ hostname, pathname }) {
  const match = hostname.match(/^([^.]+)\.github\.io$/)
  if (!match) return null
  const owner = match[1]
  const repo = pathname.split('/').filter(Boolean)[0] ?? ''
  return repo ? `${owner}/${repo}` : null
}
