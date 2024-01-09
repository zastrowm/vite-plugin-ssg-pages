import { ModInitializer, PageModule, StaticSiteMod } from '../static-site-mod.js'

export interface ModuleDataModOptions {
  // A list of named properties to copy over from a module into it's metadata
  copyModuleProperties: string[] | Record<string, string>
}

/**
 * Copies data from a module into it's metadata
 */
export class ModuleDataMod implements StaticSiteMod {
  public readonly name = 'default.module-data'
  private readonly moduleProperties: string[] | Record<string, string>

  constructor(options: ModuleDataModOptions) {
    this.moduleProperties = options.copyModuleProperties ?? []
  }

  public initialize(loader: ModInitializer): void {
    loader.contributeData.add((entry) => this.copyProperties(entry))
  }

  // copy the specified properties from the module to the metadata
  private copyProperties(content: PageModule) {
    if (Array.isArray(this.moduleProperties)) {
      // if it's an array, then it's an array of properties to copy;
      // example for "X.Y.Z", then we try to copy "X.Y.Z" to property "Z"
      this.moduleProperties.forEach((from) => {
        this.copyProperty(content, from, null)
      })
    } else {
      // if it's an object, then each property-value pair represents the "from" and "to" properties
      Object.entries(this.moduleProperties).forEach(([from, to]) => {
        this.copyProperty(content, from, to)
      })
    }
  }

  private copyProperty(content: PageModule, from: string, to: string | null) {
    const nameAndValue = this.getModuleProperty(content, from)
    if (nameAndValue) {
      content.metadata.add(to ?? nameAndValue.name, nameAndValue.value)
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

    return { name: parts[parts.length - 1], value }
  }
}
