import { Renderer } from './renderer'
import { ContentContributor } from './content-contributors/content-contributor'

export const ModNamedOrders = {
  first: -100,
  pre: -10,
  normal: 0,
  post: 10,
  last: 100,
}

/**
 * A plugin to the way that static-sites are rendered.
 */
export interface StaticSiteMod {
  name: string
  order?: number

  initialize(loader: ModInitializer): void
}

export interface ModInitializer {
  addRenderer(name: string, renderer: Renderer): void
  addContentProvider(contributor: ContentContributor): void
}
