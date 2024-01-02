import { PageModule } from '../static-site-mod.js'

export interface ContentContributor {
  // Calculates the default slug for the given content-module or null if this should not be marked a page per
  // this contributor
  computeDefaultSlug?: (module: PageModule) => string | null

  // Allows changing the slug of the given entry
  updateSlug?: (module: PageModule, currentSlug: string) => string
}
