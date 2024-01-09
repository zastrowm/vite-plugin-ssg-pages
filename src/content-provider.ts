import { ViteDevServer } from 'vite'
import { ModuleEntry, ModuleParser } from './module-parser.js'
import { PageContent } from './renderer.js'
import { CallbackList, ContentType, ModLoader } from './mod/mod-loader.js'
import { ModSettings } from './mod-settings.js'
import path from 'path'
import { PageModule } from './static-site-mod.js'

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

      const type = this.getContentType(entry)
      if (type == null) {
        continue
      }

      const parsed = path.parse(entry.contentPath)

      const defaultSlug = path.format({
        name: parsed.name,
        root: parsed.root,
        dir: parsed.dir,
      })

      entry.contentData.set('slug', defaultSlug)

      this.invokeAll(entry, this.modLoader.contributeData)
      this.invokeAll(entry, this.modLoader.preprocess)

      const renderer = entry.metadata.get('renderer')?.toString()
      if (!renderer) {
        throw new Error(`No renderer found for ${entry.contentPath}`)
      }

      this.invokeAll(entry, this.modLoader.postprocess)
      const slug = entry.contentData.get('slug') as string

      if (!slug) {
        continue
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

  private getContentType(entry: ModuleEntry): ContentType {
    for (const callback of this.modLoader.determineContentType) {
      const type = callback(entry)
      if (type) {
        return type
      }
    }

    return null
  }

  private invokeAll(entry: ModuleEntry, list: CallbackList<(module: PageModule) => void>) {
    for (const callback of list) {
      callback(entry)
    }
  }
}
