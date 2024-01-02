import { ModInitializer, ModNamedOrders, StaticSiteMod } from '../static-site-mod.js'
import { Renderer } from '../renderer.js'
import { ContentContributor } from '../content-contributors/content-contributor.js'
import { toSortedArray } from '../util/array.js'

/**
 * Tracks the mods used for the current environment + helper methods for retrieving data from mods
 */
export class ModLoader implements ModInitializer {
  public renderers = new Map<string, Renderer>()
  public contentContributors: ContentContributor[] = []

  constructor(mods: StaticSiteMod[]) {
    const ordered = toSortedArray(mods ?? [], (it) => it.order ?? ModNamedOrders.normal)

    ordered.forEach((mod) => {
      mod.initialize(this)
    })
  }

  public addRenderer(name: string, renderer: Renderer): void {
    this.renderers.set(name, renderer)
  }

  public addContentProvider(contributor: ContentContributor): void {
    this.contentContributors.push(contributor)
  }

  public getRenderer(name: string, extra: string = '') {
    const renderer = this.renderers.get(name)

    if (!renderer) {
      throw new Error(`No renderer with the name '${name}' found!${extra}`)
    }

    return renderer
  }
}
