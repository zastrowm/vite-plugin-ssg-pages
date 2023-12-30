import { ModuleNode, ViteDevServer } from 'vite'
import { StaticSiteOptions } from '../static-site-options.js'
import { RendererUtils } from '../renderer-utils.js'

export class StaticHtmlHelper extends RendererUtils {
  public readonly STYLE_REPLACEMENT_TOKEN = 'STYLES_GO_HERE'

  constructor(
    vite: ViteDevServer,
    rendererName: string,
    private options: StaticSiteOptions,
    private useInlineStyles: boolean,
  ) {
    super(vite, rendererName)
  }

  /**
   * Finds any dependent styles for the given path and returns them as an html element.
   */
  public async getStyleFragment(module: ModuleNode) {
    if (!this.useInlineStyles) {
      return this.STYLE_REPLACEMENT_TOKEN
    }

    // In this case, we want to inline all styles, meaning we have to walk the import match gathering all the
    // css sources; if we wanted to support different types of style pre-rendering (like JS in CSS), we'd have
    // to be smarter, but for now we only allow the user to customize the css imports that we allow

    const nodes = [...module.importedModules.values()]
    const alreadyProcessed = new Set<ModuleNode>()

    const styleImports: string[] = []

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]

      if (alreadyProcessed.has(node)) {
        continue
      }

      alreadyProcessed.add(node)

      if (this.options.styleExtensions.some((ext) => node.url.endsWith(ext))) {
        styleImports.push(node.url)
      } else {
        nodes.push(...node.importedModules)
      }
    }

    // get the actual code
    const cssImports = (await Promise.all(styleImports.map(async (it) => await this.vite.ssrLoadModule(it)))).map(
      (it) => it.default,
    )

    return `<style>` + cssImports.join('\n') + `</style>`
  }
}
