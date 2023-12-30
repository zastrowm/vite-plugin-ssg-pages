import type { CombinedMetadata } from '../module-parser.js'

export interface ContentModule {
  contentPath: string
  metadata: CombinedMetadata
  pluginMetadata: Record<string, unknown>
  module: any
}

export interface ContentContributor {
  // Calculates the default slug for the given content-module or null if this should not be marked a page per
  // this contributor
  computeDefaultSlug?: (module: ContentModule) => string | null

  // Allows changing the slug of the given entry
  updateSlug?: (module: ContentModule, currentSlug: string) => string
}
