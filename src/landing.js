import { gamePages, getGamePagePath } from '../siteConfig'

const gameList = document.querySelector('[data-game-list]')

if (gameList) {
  gameList.replaceChildren(
    ...gamePages.map((game) => {
      const item = document.createElement('li')
      const link = document.createElement('a')
      const title = document.createElement('strong')
      const description = document.createElement('span')

      link.href = getGamePagePath(game.slug)
      title.textContent = game.title
      description.textContent = game.description
      link.append(title, description)
      item.append(link)

      return item
    }),
  )
}
