import { ViteDevServer } from 'vite'
import { PluginGeneratedPagePrefix } from './constants.js'
import { jsonEncoding } from './json-encoding.js'
import { Json, PageRenderResult } from './renderer.js'

/**
 * Helper methods for renderers; facilitates generating and importing virtual files
 */
export class RendererUtils {
  constructor(
    public readonly vite: ViteDevServer,
    public readonly rendererName: string,
  ) {}

  /**
   * Generate a unique html index file to be served by vite
   * @param inputProps the properties to use as an import for the file; whenever the input is the same, a cached
   *                   copy of the index is used
   * @param html the html to return as part of the response; even if the html differs from last time, if the same
   *             inputProps are used a cached copy of original html is returned.
   */
  public async transformHtmlResponse(inputProps: Json, html: string): Promise<PageRenderResult> {
    const transformedHtml = await this.vite.transformIndexHtml(this.generateHtmlUrl(inputProps), html)

    return {
      type: 'text/html',
      body: transformedHtml,
    }
  }

  private generateHtmlUrl(props: Json): string {
    return `$/renderers${this.getPropsAsSearch(props)}`
  }

  /**
   * Generates a virtual import for the given props; use this when generating virtual files to be rendered by a mod.
   */
  public generateVirtualImport(props: Json): string {
    return `${PluginGeneratedPagePrefix}${this.getPropsAsSearch(props)}`
  }

  private getPropsAsSearch(props: Json) {
    const url = new URL('/', 'https://localhost')
    url.searchParams.set('renderer', this.rendererName)
    url.searchParams.set('props', jsonEncoding.encodeJsonForUrl(props))
    return url.search
  }
}
