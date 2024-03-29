import { normalizePath } from 'vite'
import path from 'path'
import { CachingPageDataApi } from './page-data-api.js'
import { ModSettings } from './mod-settings.js'
import { ContentData, PageModule } from './static-site-mod.js'
import { DefaultPageMetadataConfig } from './pages/index.js'
import { Json } from './renderer.js'
import { escapeRegex } from '@kreativ/core/regex.js'

export type ModuleMetadata = Record<string, unknown>
type CustomMetadata = {
  $metadata_sources?: string[]
  $original_path: string
}

export interface ModuleEntry extends PageModule {
  isConfig: boolean
  rootedPath: string
  dataGetter: (() => Promise<any>) | null
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
    private readonly options: ModSettings,
    private modules: Record<string, unknown>,
  ) {}

  public *getAllEntries(): Iterable<ModuleEntry> {
    const filenameMatches = this.options.configFilenames.map((it) => escapeRegex(it)).join('|')
    const configMatch = new RegExp('(?:^|/)' + filenameMatches)

    for (const key in this.modules) {
      const contentPath = normalizePath(key).substring(this.options.contentPath.length)

      const metadatas = this.getCombinedMetadataFor(contentPath)
      const module = this.modules[key] as any

      const moduleGetter = metadatas.describe<DefaultPageMetadataConfig['getData']>('getData')
      const getter = moduleGetter?.value

      yield {
        isConfig: key.match(configMatch) !== null,
        rootedPath: key,
        contentPath: contentPath,
        dataGetter: typeof getter == 'function' ? () => getter(cachedPageDataApi) : null,
        metadata: metadatas,
        contentData: new PageContentData(),
        module: module,
      }
    }
  }

  /**
   * Gets the metadata for the given content file and all the metadata walking up the tree
   */
  private getCombinedMetadataFor(contentPath: string): CombinedMetadata {
    let dir = contentPath

    let sources = [this.getModuleMetadata(normalizePath(path.join(this.options.contentPath, contentPath)))]
    let times = 0

    while (dir != '' && dir != '.' && times < 128) {
      dir = path.dirname(dir)
      times++

      for (const configFile of this.options.configFilenames) {
        const configFilePath = normalizePath(path.join(this.options.contentPath, dir, configFile))
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
      module && typeof module === 'object' && 'meta' in module && typeof module.meta === 'object'
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
  priority: number
}

export class CombinedMetadata {
  private modProperties: Record<string, unknown> | null = null

  constructor(private metadata: ModuleMetadata[]) {}

  public get<T = unknown>(key: string): T | undefined {
    return this.describe<T>(key)?.value
  }

  public add<T>(key: string, value: T) {
    if (this.modProperties == null) {
      this.modProperties = {}
    }

    this.modProperties[key] = value
  }

  public describe<T>(key: string): DescribedProperty<T> | undefined {
    // noinspection LoopStatementThatDoesntLoopJS
    for (const property of this.describeAll<T>(key)) {
      return property
    }

    return undefined
  }

  public *describeAll<T>(key: string): Iterable<DescribedProperty<T>> {
    if (this.modProperties && key in this.modProperties) {
      yield {
        value: this.modProperties[key] as T,
        source: 'AMod',
        name: key,
        priority: 0,
      }
    }

    for (let i = 0; i < this.metadata.length; i++) {
      const item = this.metadata[i]
      if (key in item) {
        yield {
          value: item[key] as T,
          source: (item as CustomMetadata).$original_path,
          name: key,
          priority: i + 1,
        }
      }
    }
  }

  public asJson(includePlaceholders: boolean = false): Json {
    const m: Record<string, unknown> = {}
    for (const module of this.metadata) {
      append(m, module, includePlaceholders)
    }

    const modProperties = this.modProperties

    if (modProperties) {
      append(m, modProperties, includePlaceholders)
    }

    return m as Json
  }
}

function append(data: Record<string, unknown>, values: Record<string, unknown>, includePlaceholders: boolean) {
  Object.entries(values).forEach(([key, value]) => {
    if (!(key in data)) {
      if (typeof value == 'function') {
        if (includePlaceholders) {
          data[key] = '$$FUNCTION$$'
        } else {
          data[key] = null
        }
      } else {
        data[key] = value
      }
    }
  })
}

export class PageContentData implements ContentData {
  private data = new Map<string, unknown>()

  public get(name: string): unknown {
    return this.data.get(name)
  }

  public set(name: string, value: unknown): void {
    if (name == 'slug' && typeof value == 'string') {
      value = normalizePath(value)
    }

    this.data.set(name, value)
  }
}
