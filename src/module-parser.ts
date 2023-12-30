import { normalizePath } from 'vite'
import path from 'path'
import { StaticSiteUtils } from './static-site-options'
import { escapeRegex } from './util/regex'
import { CachingPageDataApi, PageDataApi } from './page-data-api'
import { ContentModule } from './content-contributors/content-contributor'

export type ModuleMetadata = Record<string, unknown>
type CustomMetadata = {
  $renderer?: string
  $metadata_sources?: string[]
  $original_path: string
}

export interface ModuleEntry extends ContentModule {
  isConfig: boolean
  rootedPath: string
  dataGetter: () => Promise<any> | null
}

const cachedPageDataApi = new CachingPageDataApi()

/**
 * Pareses the file system to extract metadata and include properties about the content.  Does not post-process any
 * of the information retrieved from the modules.
 */
export class ModuleParser {
  private cachedMetadata: Record<string, ModuleMetadata & CustomMetadata> = {}

  public debugMode = false

  constructor(
    private readonly utils: StaticSiteUtils,
    private modules: Record<string, unknown>,
  ) {}

  public *getAllEntries(): Iterable<ModuleEntry> {
    const filenameMatches = this.utils.options.configFilenames.map((it) => escapeRegex(it)).join('|')
    const configMatch = new RegExp('(?:^|/)' + filenameMatches)

    for (const key in this.modules) {
      const contentPath = normalizePath(key).substring(this.utils.options.contentPath.length)

      const metadatas = this.getCombinedMetadataFor(contentPath)
      const module = this.modules[key]
      const getter = module?.['getData'] as (api: PageDataApi) => Promise<any>

      yield {
        isConfig: key.match(configMatch) !== null,
        rootedPath: key,
        contentPath: contentPath,
        dataGetter: typeof getter == 'function' ? () => getter(cachedPageDataApi) : null,
        metadata: metadatas,
        pluginMetadata: {},
        module: module,
      }
    }
  }

  /**
   * Gets the metadata for the given content file and all the metadata walking up the tree
   */
  private getCombinedMetadataFor(contentPath: string): CombinedMetadata {
    let dir = contentPath

    let sources = [this.getModuleMetadata(normalizePath(path.join(this.utils.options.contentPath, contentPath)))]
    let times = 0

    while (dir != '' && dir != '.' && times < 128) {
      dir = path.dirname(dir)
      times++

      for (const configFile of this.utils.options.configFilenames) {
        const configFilePath = normalizePath(path.join(this.utils.options.contentPath, dir, configFile))
        if (this.modules[configFilePath]) {
          const metadata = this.getModuleMetadata(configFilePath)
          sources.push(metadata)
        }
      }
    }

    return new CombinedMetadata(sources)
  }

  private getModuleMetadata(path: string) {
    const cached = this.cachedMetadata[path]
    if (cached) {
      return cached
    }

    const newEntry = this.parseMetadata(path, this.modules[path])
    this.cachedMetadata[path] = newEntry
    return newEntry
  }

  private parseMetadata(path: string, module: unknown): ModuleMetadata & CustomMetadata {
    const metadata: Record<string, unknown> =
      typeof module === 'object' && 'meta' in module && typeof module.meta === 'object'
        ? (module.meta as ModuleMetadata)
        : {}

    metadata.$original_path = path
    return metadata as any
  }
}

export interface DescribedProperty<T> {
  name: string
  value: T
  source: string
}

export class CombinedMetadata {
  constructor(private metadata: ModuleMetadata[]) {}

  public get<T = unknown>(key: string): T | undefined {
    return this.describe<T>(key)?.value
  }

  public describe<T>(key: string): DescribedProperty<T> | undefined {
    for (const item of this.metadata) {
      if (key in item) {
        return {
          value: item[key] as T,
          source: (item as CustomMetadata).$original_path,
          name: key,
        }
      }
    }

    return undefined
  }
}

export function combinedMetadataToJson(metadata: CombinedMetadata) {
  const m = {}
  for (const module of metadata['metadata']) {
    Object.entries(module).forEach(([key, value]) => {
      if (!(key in m)) {
        m[key] = value
        if (typeof value == 'function') {
          m[key] = '$$FUNCTION$$'
        }
      }
    })
  }

  return m
}
