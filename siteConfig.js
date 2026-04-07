export const gamePages = [
  {
    slug: 'blackjack-practice',
    title: 'Blackjack Practice',
    description: 'Train basic strategy and play quick blackjack hands.',
  },
]

export function getRepoName(repository = process.env.GITHUB_REPOSITORY) {
  return repository?.split('/')[1] ?? ''
}

export function getBasePath({
  githubActions = process.env.GITHUB_ACTIONS,
  repository = process.env.GITHUB_REPOSITORY,
} = {}) {
  const repoName = getRepoName(repository)
  return githubActions === 'true' && repoName ? `/${repoName}/` : '/'
}

export function getGamePagePath(slug) {
  return `./${slug}/`
}
