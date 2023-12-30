import type {
  DevEntryInput,
  DevEntryOutput,
  EntryPoints,
  StaticEntryInput,
  StaticEntryOutput,
  VirtualModuleInput,
} from './program-interop'
import { jsonEncoding } from './json-encoding'
import { ContentProvider } from './content-provider'
import { StaticHtmlHelper } from './renderers/static-html-helper'
import { normalizePath } from 'vite'
import { StaticSiteOptions, StaticSiteUtils } from './static-site-options'
import { RendererUtils } from './renderer-utils'
import { combinedMetadataToJson } from './module-parser'
import { StaticPageContract } from './renderers/page-context'
import { toSortedArray } from './util/array'
import { ModNamedOrders } from './static-site-mod'

export class PluginEntry implements EntryPoints {
  private readonly optionsHelper: StaticSiteUtils

  constructor(options: StaticSiteOptions) {
    const ordered = toSortedArray(options.mods, (it) => it.order ?? ModNamedOrders.normal)

    this.optionsHelper = new StaticSiteUtils({
      ...options,
      mods: ordered,
      contentPath: normalizePath(options.contentPath),
    })
  }

  /**
   * Entry point to resolve virtual modules that renderers created.
   */
  async handleVirtual({ vite, id }: VirtualModuleInput) {
    const searchParams = this.optionsHelper.getSearchParamsFromPartialUrl(id)
    const renderer = this.optionsHelper.getRenderer(
      searchParams.get('renderer'),
      'This is while looking for a virtual renderer',
    )

    const json = jsonEncoding.decodeJsonForUrl(searchParams.get('props'))
    return await renderer.resolveVirtual(vite, json)
  }

  /**
   * Entry point to serve the given file in developer mode.
   */
  async handleDynamic({ vite, url }: DevEntryInput): Promise<DevEntryOutput> {
    const contentProvider = new ContentProvider(vite, this.optionsHelper)

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

    const renderer = this.optionsHelper.getRenderer(page.renderer, `This is for file: ${page.source}`)

    if (url.searchParams.get('prerender') != null) {
      const staticHelper = new StaticHtmlHelper(vite, page.renderer, this.optionsHelper.options, true)
      const virtualFile = await renderer.generateImportForStaticPage(staticHelper, page)

      const module = (await vite.ssrLoadModule(virtualFile)) as StaticPageContract

      const html = await module.generatePage({
        async getStyleFragment(): Promise<string> {
          const moduleNode = staticHelper.vite.moduleGraph.urlToModuleMap.get(virtualFile)
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
    const contentProvider = new ContentProvider(vite, this.optionsHelper)

    const inputHtmlMapping: StaticEntryOutput = []

    for (const page of contentProvider.getAllContent()) {
      const renderer = this.optionsHelper.getRenderer(page.renderer)
      if (!renderer) {
        throw new Error(`No renderer with the name '${page.renderer}' found! This is for file: ${page.source}`)
      }

      const virtualFile = await renderer.generateImportForStaticPage(
        new StaticHtmlHelper(vite, page.renderer, this.optionsHelper.options, false),
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
