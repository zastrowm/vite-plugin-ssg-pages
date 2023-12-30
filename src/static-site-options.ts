import { Renderer } from './renderer'

import { ModInitializer, StaticSiteMod } from './static-site-mod'
import { ModuleEntry } from './module-parser'
import { ContentContributor } from './content-contributors/content-contributor'
import { normalizePath } from 'vite'

export interface StaticSiteOptions {
  readonly contentPath: string
  readonly contentRetriever: () => Record<string, unknown>
  readonly configFilenames: string[]

  readonly styleExtensions: string[]

  readonly mods?: StaticSiteMod[]
}

export class PluginLoader implements ModInitializer {
  public renderers = new Map<string, Renderer>()
  public contentContributors: ContentContributor[] = []

  public addRenderer(name: string, renderer: Renderer): void {
    this.renderers.set(name, renderer)
  }

  public addContentProvider(contributor: ContentContributor): void {
    this.contentContributors.push(contributor)
  }
}

export class StaticSiteUtils {
  private loader = new PluginLoader()

  constructor(public options: StaticSiteOptions) {
    if (this.options.mods) {
      this.options.mods.forEach((mod) => {
        mod.initialize(this.loader)
      })
    }
  }

  public getRenderer(name: string, extra: string = '') {
    const renderer = this.loader.renderers.get(name)

    if (!renderer) {
      throw new Error(`No renderer with the name '${name}' found!${extra}`)
    }

    return renderer
  }

  public getSearchParamsFromPartialUrl(partialUrl: string) {
    const url = new URL(partialUrl, 'https://localhost')
    return url.searchParams
  }

  public getPageSlug(entry: ModuleEntry): string | null {
    for (const contributor of this.loader.contentContributors) {
      const slug = contributor.computeDefaultSlug?.(entry)

      if (slug) {
        return normalizePath(this.updateSlug(entry, slug))
      }
    }

    return null
  }

  private updateSlug(entry: ModuleEntry, slug: string): string {
    for (const contributor of this.loader.contentContributors) {
      const newSlug = contributor.updateSlug?.(entry, slug)
      if (newSlug) {
        slug = normalizePath(newSlug)
      }
    }

    return slug
  }
}
