import { ModInitializer, StaticSiteMod } from '../../static-site-mod.js'
import { PreactRenderer } from './preact-renderer.js'

interface PreactModeOptions {
  // The renderer-names to register for the preact-renderer; defaults to ["preact"] if not provided
  rendererNames?: string[]
}

/**
 * Enables rendering pages using preact.
 */
export class PreactMod implements StaticSiteMod {
  public readonly name = 'Preact'

  constructor(private options: PreactModeOptions = {}) {}

  public initialize(loader: ModInitializer): void {
    const renderer = new PreactRenderer()

    for (const name of this.options.rendererNames ?? ['preact']) {
      loader.addRenderer(name, renderer)
    }
  }
}
