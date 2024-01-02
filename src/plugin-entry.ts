import type {
  DevEntryInput,
  DevEntryOutput,
  EntryPoints,
  StaticEntryInput,
  StaticEntryOutput,
  VirtualModuleInput,
} from './program-interop.js'
import { jsonEncoding } from './json-encoding.js'
import { ContentProvider } from './content-provider.js'
import { StaticHtmlHelper } from './renderers/static-html-helper.js'
import { RendererUtils } from './renderer-utils.js'
import { combinedMetadataToJson } from './module-parser.js'
import { StaticPageContract } from './renderers/page-context.js'
import { ModSettings } from './mod-settings.js'
import { ModLoader } from './mod/mod-loader.js'

export class PluginEntry implements EntryPoints {
  private readonly loader: ModLoader

  constructor(
    private options: ModSettings,
    private contentRetriever: () => Record<string, unknown>,
  ) {
    this.loader = new ModLoader(options.mods ?? [])
  }

  /**
   * Entry point to resolve virtual modules that renderers created.
   */
  async handleVirtual({ vite, id }: VirtualModuleInput) {
    const url = new URL(id, 'https://localhost')
    const searchParams = url.searchParams
    const rendererName = searchParams.get('renderer')

    if (!rendererName) {
      throw new Error(`Renderer parameter not found for virtual file; this indicates a critical error; ${id}`)
    }

    const renderer = this.loader.getRenderer(rendererName, 'This is while looking for a virtual renderer')

    if (!renderer.resolveVirtual) {
      throw new Error(`Renderer ('${rendererName}') was found, but does not support 'resolveVirtual' callback`)
    }

    const props = searchParams.get('props')
    if (!props) {
      throw new Error(`Props parameter not found for virtual file; this indicates a critical error; ${id}`)
    }

    const json = jsonEncoding.decodeJsonForUrl(props)
    return await renderer.resolveVirtual(vite, json)
  }

  /**
   * Entry point to serve the given file in developer mode.
   */
  async handleDynamic({ vite, url }: DevEntryInput): Promise<DevEntryOutput> {
    const contentProvider = new ContentProvider(vite, this.options, this.contentRetriever, this.loader)

    if (url.pathname == '/$/debug') {
      const content = Array.from(contentProvider.getAllContent()).map((it) => {
        return {
          ...it,
          metadata: combinedMetadataToJson(it.metadata),
        }
      })

      return renderJson({
        content,
      })
    }

    const desiredSlug = url.pathname.substring(1)

    const page = await contentProvider.getContent(desiredSlug)
    if (page == null) {
      return {
        type: 'text/plain',
        body: `404 does not exist - ${url.pathname}`,
        status: 404,
      }
    }

    const renderer = this.loader.getRenderer(page.renderer, `This is for file: ${page.source}`)

    if (url.searchParams.get('prerender') != null) {
      const staticHelper = new StaticHtmlHelper(vite, page.renderer, this.options, true)
      const virtualFile = await renderer.generateImportForStaticPage(staticHelper, page)

      const module = (await vite.ssrLoadModule(virtualFile)) as StaticPageContract

      const html = await module.generatePage({
        async getStyleFragment(): Promise<string> {
          const moduleNode = staticHelper.vite.moduleGraph.urlToModuleMap.get(virtualFile)
          if (!moduleNode) {
            throw new Error(`Could not find module entry for: ${virtualFile}`)
          }

          return await staticHelper.getStyleFragment(moduleNode)
        },
      })

      return {
        type: 'text/html',
        body: html,
        status: 200,
      }
    } else {
      return {
        status: 200,
        ...(await renderer.renderForDevMode(new RendererUtils(vite, page.renderer), page)),
      }
    }
  }

  /**
   * Entry point to find all files that should be generated statically; used as part of the build.
   */
  async handleStatic({ vite }: StaticEntryInput): Promise<StaticEntryOutput> {
    const contentProvider = new ContentProvider(vite, this.options, this.contentRetriever, this.loader)

    const inputHtmlMapping: StaticEntryOutput = []

    for (const page of contentProvider.getAllContent()) {
      const renderer = this.loader.getRenderer(page.renderer)
      if (!renderer) {
        throw new Error(`No renderer with the name '${page.renderer}' found! This is for file: ${page.source}`)
      }

      const virtualFile = await renderer.generateImportForStaticPage(
        new StaticHtmlHelper(vite, page.renderer, this.options, false),
        page,
      )

      inputHtmlMapping.push({
        filename: page.slug + '.html',
        entryPoint: virtualFile,
      })
    }

    return inputHtmlMapping
  }
}

export function renderJson(data: any): DevEntryOutput {
  return {
    status: 200,
    type: 'text/plain',
    body: JSON.stringify(data, null, 2),
  }
}
