import { normalizePath, ViteDevServer } from 'vite'
import { ModuleEntry, ModuleParser } from './module-parser.js'
import { PageContent } from './renderer.js'
import { ModLoader } from './mod/mod-loader.js'
import { ModSettings } from './mod-settings.js'

export type ContentRetriever = () => Record<string, unknown>

/**
 * Responsible for listing available content and for transforming content where necessary.
 */
export class ContentProvider {
  constructor(
    _: ViteDevServer,
    private options: ModSettings,
    private contentRetriever: ContentRetriever,
    private modLoader: ModLoader,
  ) {}

  public async getContent(path: string): Promise<PageContent | null> {
    for (const content of this.getAllContent()) {
      if (content.slug == path) {
        return content
      }
    }

    return null
  }

  public *getAllContent(): Iterable<PageContent> {
    const lazyContent = this.contentRetriever()
    const metadata = new ModuleParser(this.options, lazyContent)
    metadata.debugMode = true

    for (const entry of metadata.getAllEntries()) {
      if (entry.isConfig) {
        continue
      }

      const slug = this.getPageSlug(entry)

      if (!slug) {
        continue
      }

      const renderer = entry.metadata.get('$renderer')?.toString()
      if (!renderer) {
        throw new Error(`No renderer found for ${entry.contentPath}`)
      }

      yield {
        source: entry.rootedPath,
        slug: slug,
        renderer: renderer,
        dataGetter: entry.dataGetter,
        metadata: entry.metadata,
        module: entry.module,
      }
    }
  }

  private getPageSlug(entry: ModuleEntry): string | null {
    for (const contributor of this.modLoader.contentContributors) {
      const slug = contributor.computeDefaultSlug?.(entry)

      if (slug) {
        return normalizePath(this.updateSlug(entry, slug))
      }
    }

    return null
  }

  private updateSlug(entry: ModuleEntry, slug: string): string {
    for (const contributor of this.modLoader.contentContributors) {
      const newSlug = contributor.updateSlug?.(entry, slug)
      if (newSlug) {
        slug = normalizePath(newSlug)
      }
    }

    return slug
  }
}
