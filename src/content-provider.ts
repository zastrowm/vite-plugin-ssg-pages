import { ViteDevServer } from 'vite'
import { ModuleParser } from './module-parser.js'
import { StaticSiteUtils } from './static-site-options.js'
import { PageContent } from './renderer.js'

/**
 * Responsible for listing available content and for transforming content where necessary.
 */
export class ContentProvider {
  constructor(
    _: ViteDevServer,
    private helper: StaticSiteUtils,
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
    const lazyContent = this.helper.options.contentRetriever()
    const metadata = new ModuleParser(this.helper, lazyContent)
    metadata.debugMode = true

    for (const entry of metadata.getAllEntries()) {
      if (entry.isConfig) {
        continue
      }

      const slug = this.helper.getPageSlug(entry)

      if (!slug) {
        continue
      }

      const renderer = entry.metadata.get('$renderer')?.toString()

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
}
