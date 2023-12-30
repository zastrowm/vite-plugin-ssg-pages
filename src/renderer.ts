import { ViteDevServer } from 'vite'
import { StaticHtmlHelper } from './renderers/static-html-helper.js'
import { CombinedMetadata } from './module-parser.js'
import { RendererUtils } from './renderer-utils.js'

export interface PageRenderResult {
  type: string
  body: string
}

export interface PageContent {
  source: string
  slug: string
  renderer: string
  dataGetter: null | (() => Promise<any>)
  metadata: CombinedMetadata
  module: any
}

/**
 * Represents page-content provider that can render contents to html; both in developer mode and in build mode.
 */
export interface Renderer {
  /**
   * Render the given page for the development-server; ideally, this would render the content using client-side
   * technology to take advantage of hot-reload etc.
   */
  renderForDevMode(rendererUtils: RendererUtils, page: PageContent): Promise<PageRenderResult>

  /**
   * Generate an import to be used for a static page; it is expected, though not required, that this point
   * to a virtual file.
   */
  generateImportForStaticPage(staticHelper: StaticHtmlHelper, page: PageContent): Promise<string>

  /**
   * Resolve the given virtual file for this renderer; this should only be called if
   * `staticHelper.generateVirtualImport` was previously invoked.
   */
  resolveVirtual?: (vite: ViteDevServer, props: Json) => Promise<string>
}

export type Json = {
  [key: string]: PlainOldData
}

type PlainOldData = string | number | Json | boolean
