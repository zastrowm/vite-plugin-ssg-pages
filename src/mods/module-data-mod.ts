import { ModInitializer, PageModule, StaticSiteMod } from '../static-site-mod.js'

export interface ModuleDataModOptions {
  // A list of named properties to copy over from a module into it's metadata
  copyModuleProperties?: string[] | Record<string, string>
}

/**
 * Copies data from a module into it's metadata
 */
export class ModuleDataMod implements StaticSiteMod {
  public readonly name = 'default.module-data'
  private readonly moduleProperties: Array<[from: string, to: string]>

  constructor(options: ModuleDataModOptions) {
    this.moduleProperties = Array.isArray(options.copyModuleProperties)
      ? options.copyModuleProperties.map((it) => [it, it])
      : Object.entries(options.copyModuleProperties ?? {})
  }

  public initialize(loader: ModInitializer): void {
    loader.contributeData.add((entry) => this.copyProperties(entry))
  }

  // copy the specified properties from the module to the metadata
  private copyProperties(content: PageModule) {
    for (const entry of this.moduleProperties) {
      const [from, to] = Array.isArray(entry) ? entry : [entry, entry]

      const value = this.getModuleProperty(content, from)
      if (value) {
        content.metadata.add(to, value)
      }
    }
  }

  private getModuleProperty(content: PageModule, fromProperty: string) {
    // we allow it to be configured with sub properties via X.Y.Z
    const parts = fromProperty.split('.')
    let value = content.module

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      value = value[part]
      if (value == null) {
        return null
      }
    }

    return value
  }
}
