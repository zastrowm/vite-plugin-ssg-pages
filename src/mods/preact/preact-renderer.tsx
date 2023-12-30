import { ViteDevServer } from 'vite'
import { Json, PageContent, PageRenderResult, Renderer, RendererUtils, StaticHtmlHelper } from '../../index.js'

const salt = 3

function createImport(relativePath: string) {
  return `vite-plugin-ssg-pages/dist/mods/preact/${relativePath}`
}

export class PreactRenderer implements Renderer {
  // static rendering
  public async generateImportForStaticPage(staticHelper: StaticHtmlHelper, page: PageContent): Promise<string> {
    return staticHelper.generateVirtualImport(await this.convertPageToProps(page))
  }

  public async resolveVirtual(_: ViteDevServer, props: Json): Promise<string> {
    const layout = props['layout']
    const pageSrc = props['page']
    const data = props['data']

    const importGenerateHtml = createImport(`virtual-import.generate-html.js`)
    // language=JavaScript
    return layout
      ? `
import { h } from 'preact'
import { generateHtml } from ${JSON.stringify(importGenerateHtml)}
import { meta } from ${JSON.stringify(layout)}
import TheComponent from ${JSON.stringify(pageSrc)}

const data = ${data !== undefined ? JSON.stringify(data) : 'undefined'}

export function getElement() {
  return h(meta.layout, { data }, h(TheComponent, { data }))
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
import { generateHtml } from ${JSON.stringify(importGenerateHtml)}
import TheComponent from ${JSON.stringify(pageSrc)}

const data = ${data !== undefined ? JSON.stringify(data) : 'undefined'}

export function getElement() {
  return h(TheComponent, { data })
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
    const devModeImport = createImport(`dev-mode-head-renderer.js`)

    return await helper.transformHtmlResponse(
      props,
      `
<!DOCTYPE html>
<head>
<script type='module'>
import { renderInDevMode } from '${devModeImport}'
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
      page: page.source,
      layout: layoutProperty?.value ? page.metadata.describe('layout')?.source : undefined,
      salt: salt,
      data: data,
    }
  }
}
