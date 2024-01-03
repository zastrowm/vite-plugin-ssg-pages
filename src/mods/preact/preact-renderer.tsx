import { ViteDevServer } from 'vite'
import { Json, PageContent, PageRenderResult, Renderer, RendererUtils, StaticHtmlHelper } from '../../index.js'
import { filePaths } from '../../file-paths.js'

const salt = 3

export class PreactRenderer implements Renderer {
  // static rendering
  public async generateImportForStaticPage(staticHelper: StaticHtmlHelper, page: PageContent): Promise<string> {
    return staticHelper.generateVirtualImport(await this.convertPageToProps(page))
  }

  public async resolveVirtual(_: ViteDevServer, props: Json): Promise<string> {
    const layout = props['layout']
    const pageSrc = props['page']
    const data = props['data']
    const metadata = props['metadata']

    // language=JavaScript
    return layout
      ? `
import { h } from 'preact'
import { generateHtml } from ${filePaths.preact.generateHtml.runtimePathQuoted}
import { meta } from ${JSON.stringify(layout)}
import TheComponent from ${JSON.stringify(pageSrc)}

const data = ${data !== undefined ? JSON.stringify(data) : 'undefined'}
const metadata = ${JSON.stringify(metadata)}

export function getElement() {
  return h(meta.layout, { data, metadata }, h(TheComponent, { data, metadata }))
}

export function generatePage(context) {
  const tree = getElement()
  return generateHtml({
    component: tree,
    context: context,
  })
}`
      : `
import { h } from 'preact'
import { generateHtml } from ${filePaths.preact.generateHtml.runtimePathQuoted}
import TheComponent from ${JSON.stringify(pageSrc)}

const data = ${data !== undefined ? JSON.stringify(data) : 'undefined'}
const metadata = ${JSON.stringify(metadata)}

export function getElement() {
  return h(TheComponent, { data, metadata })
}

export function generatePage(context) {
  const tree = getElement()
  return generateHtml({ 
    component: tree,
    context: context,
  })
}`
  }

  // Dev rendering
  public async renderForDevMode(helper: RendererUtils, page: PageContent): Promise<PageRenderResult> {
    const props = await this.convertPageToProps(page)
    const virtualModule = helper.generateVirtualImport(props)

    return await helper.transformHtmlResponse(
      props,
      `
<!DOCTYPE html>
<head>
<script type='module'>
import { renderInDevMode } from ${filePaths.preact.devModeRenderer.runtimePathQuoted}
import { getElement } from '${virtualModule}'

renderInDevMode(getElement)
</script>
</head>
<body></body>`,
    )
  }

  private async convertPageToProps(page: PageContent): Promise<Json> {
    const layoutProperty = page.metadata.describe('layout')
    const data = typeof page.dataGetter == 'function' ? await page.dataGetter() : undefined

    return {
      metadata: page.metadata.asJson(),
      page: page.source,
      layout: layoutProperty?.value ? page.metadata.describe('layout')?.source : undefined,
      salt: salt,
      data: data,
    }
  }
}
