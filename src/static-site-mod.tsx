import { Renderer } from './renderer.js'
import type { CombinedMetadata } from './module-parser.js'
import { ContentType } from './mod/mod-loader.js'

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
  contentData: ContentData
  module: any
}

export type ModInitializer = {
  // All the mods added to the system
  mods: StaticSiteMod[]

  addRenderer(name: string, renderer: Renderer): void
} & {
  [TKey in keyof HookApis]: HookCallback<HookApis[TKey]>
}

export interface HookApis {
  // Determines the type of content a module represents
  readonly determineContentType: (module: PageModule) => ContentType

  // Invoked when content has been generated and gives plugins the opportunity to contribute
  // or add data
  readonly contributeData: (module: PageModule) => void

  // Invoked before the renderer & slugs are updated; useful for contributing additional data to
  // the content before rendering
  readonly preprocess: (module: PageModule) => void

  // Invoked when slugs should be updated & before the renderer has been determined
  readonly slugNormalization: (module: PageModule) => void

  // Invoked after the renderer has been determined & after preprocessing
  readonly postprocess: (module: PageModule) => void
}

export interface HookCallback<T> {
  add(item: T, order?: number): void
}

export type HookCallbackFunction<T> = T extends HookCallback<infer Callback> ? Callback : never

export interface ContentData {
  get(name: string): unknown | null
  set(name: string, value: unknown): void
}
