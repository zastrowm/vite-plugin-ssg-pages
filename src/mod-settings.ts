import { normalizePath } from 'vite'
import { StaticSiteGeneratorPluginOptions } from './static-site-generator-plugin-runner.js'

/**
 * The options passed in from the user, but normalized/enhanced as needed.
 */
export class ModSettings {
  public readonly contentPath: string
  public readonly contentGlob: string

  constructor(private userOptions: StaticSiteGeneratorPluginOptions) {
    // content-directory
    this.contentPath = normalizePath(userOptions.content.directory)
    if (!this.contentPath.endsWith('/')) {
      this.contentPath += '/'
    }

    // content-glob
    this.contentGlob = this.contentPath + userOptions.content.glob
  }

  public get mods() {
    return this.userOptions.mods
  }

  public get configFilenames() {
    return this.userOptions.configFilenames
  }

  public get styleExtensions() {
    return this.userOptions.styleExtensions
  }
}
