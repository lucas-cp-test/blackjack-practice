import { gamePages, getGamePagePath } from '../siteConfig'

const gameList = document.querySelector('[data-game-list]')

if (gameList) {
  gameList.replaceChildren(
    ...gamePages.map((game) => {
      const item = document.createElement('li')
      const link = document.createElement('a')
      const title = document.createElement('strong')

      link.href = getGamePagePath(game.slug)
      title.textContent = game.title
      link.append(title, game.description)
      item.append(link)

      return item
    }),
  )
}
