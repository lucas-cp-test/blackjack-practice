export const gamePages = [
  {
    slug: 'blackjack-practice',
    title: 'Blackjack Practice',
    description: 'Train basic strategy and play quick blackjack hands.',
  },
  {
    slug: 'leaderboard',
    title: 'Leaderboard',
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
