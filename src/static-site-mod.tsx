import { Renderer } from './renderer.js'
import type { CombinedMetadata } from './module-parser.js'

export const ModNamedOrders = {
  first: -100,
  pre: -10,
  normal: 0,
  post: 10,
  last: 100,
}

/**
 * A plugin to the way that static-sites are rendered.
 */
export interface StaticSiteMod {
  name: string
  order?: number

  initialize(loader: ModInitializer): void
}

export interface PageModule {
  contentPath: string
  metadata: CombinedMetadata
  pluginMetadata: Record<string, unknown>
  module: any
}

export interface ModInitializer {
  addRenderer(name: string, renderer: Renderer): void

  // Calculates the default slug for the given content-module or null if this should not be marked a page per
  // this contributor
  readonly generatePageSlug: HookCallback<(module: PageModule) => string | null>

  // Allows changing the slug of the given entry
  readonly updatePageSlug: HookCallback<(module: PageModule, currentSlug: string) => string>
}

export interface HookCallback<T> {
  add(item: T, order?: number): void
}
