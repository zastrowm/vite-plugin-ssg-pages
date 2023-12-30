import { ContentContributor, ContentModule, ModInitializer, ModNamedOrders, StaticSiteMod } from '../../index.js'
import path from 'path'

/**
 * Automatically converts parenthesized names into the corresponding parent slug; for example
 * `some/sub/(child)` would be converted to `/some/sub`
 */
export class IndexPageMod implements StaticSiteMod, ContentContributor {
  public readonly name = 'IndexPage'
  public readonly order = ModNamedOrders.post

  public initialize(loader: ModInitializer): void {
    loader.addContentProvider(this)
  }

  public updateSlug(entry: ContentModule, currentSlug: string): string {
    if (entry.pluginMetadata['readonly-slug'] === true) {
      return currentSlug
    }

    const parsed = path.parse(currentSlug)
    let { name, dir } = parsed

    if (name.startsWith('(') && name.endsWith(')')) {
      name = dir
      dir = path.dirname(dir)

      // we have to special case the web root to be index
      if (dir == '.' && name == '') {
        name = 'index'
      }

      return path.format({
        name: name,
        root: parsed.root,
        dir: dir,
      })
    } else {
      return currentSlug
    }
  }
}
