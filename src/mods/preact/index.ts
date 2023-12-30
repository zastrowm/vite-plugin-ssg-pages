import { PreactRenderer } from './preact-renderer.js'

import { ModInitializer, StaticSiteMod } from 'vite-plugin-ssg-pages'

export { HeadContent } from './head-content.js'
export { BodyContent } from './body-content.js'

interface PreactModeOptions {
  // The renderer-names to register for the preact-renderer; suggested to be ["preact"]
  rendererNames: string[]
}

/**
 * Enables rendering pages using preact.
 */
export class PreactMod implements StaticSiteMod {
  public name: 'Preact'

  constructor(private options: PreactModeOptions) {}

  public initialize(loader: ModInitializer): void {
    const renderer = new PreactRenderer()

    for (const name of this.options.rendererNames) {
      loader.addRenderer(name, renderer)
    }
  }
}