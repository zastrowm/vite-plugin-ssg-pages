import { ModInitializer, ModNamedOrders, PageModule, StaticSiteMod } from '../../index.js'
import path from 'path'

export type MetaSlugConfig =
  | string
  | {
      prefix: string
    }

interface PagesOptions {
  // Suffixes that turn a file into a page; the suggested value is `page`. If `page` was provided, the expected file
  // format ends up being `adir/aslug.page.tsx` where the slug would be `adir/aslug`
  pageSuffixes: string[]

  // File extensions which become pages automatically without needing a specific suffix. For example, if `md` was
  // provided, then a file of the form `blog/example.md` would end up having a slug of `blog/example`
  pageExtensions?: string[]

  // A list of named properties to copy over from a module into it's metadata
  copyModuleProperties?: string[] | Record<string, string>

  // If true, automatically converts parenthesized names into the corresponding parent slug; for example
  // `some/sub/(child)` would be converted to `/some/sub`.
  enableIndexSlugs: boolean
}

/**
 * Marks files ending in ".page." as pages, and removes ".page" from the corresponding slug.
 */
export class PagesMod implements StaticSiteMod {
  public readonly name = 'Pages'

  private readonly suffixes: string[]
  private readonly extensions: Set<string>
  private readonly enableIndexSlugs: boolean
  private readonly moduleProperties: Array<[from: string, to: string]>

  constructor(options: PagesOptions) {
    this.suffixes = options.pageSuffixes.map((it) => `.${it}`)
    this.extensions = new Set(options.pageExtensions?.map((it) => `.${it}`) ?? [])
    this.enableIndexSlugs = options.enableIndexSlugs

    const properties = options.copyModuleProperties ?? []

    this.moduleProperties = Array.isArray(properties) ? properties.map((it) => [it, it]) : Object.entries(properties)
  }

  public initialize(loader: ModInitializer): void {
    loader.generatePageSlug.add((entry) => this.computeDefaultSlug(entry))
    loader.updatePageSlug.add((...args) => this.updateSlug(...args))

    if (this.enableIndexSlugs) {
      loader.updatePageSlug.add((...args) => this.updateIndexSlug(...args), ModNamedOrders.post)
    }

    if (this.moduleProperties) {
      loader.modifyPage.add((...args) => this.copyProperties(...args))
    }
  }

  private computeDefaultSlug(entry: PageModule): string | null {
    const parsed = path.parse(entry.contentPath)

    if (this.extensions.has(parsed.ext)) {
      // remove the extension
      return path.format({
        name: parsed.name,
        root: parsed.root,
        dir: parsed.dir,
      })
    }

    for (const suffix of this.suffixes) {
      if (!parsed.name.endsWith(suffix)) {
        continue
      }

      // remove the suffix
      const name = parsed.name.substring(0, parsed.name.length - suffix.length)

      return path.format({
        name: name,
        root: parsed.root,
        dir: parsed.dir,
      })
    }

    return null
  }

  private updateSlug(entry: PageModule, slug: string) {
    const property = entry.metadata.describe<MetaSlugConfig>('slug')
    if (!property) {
      return slug
    }

    // slug is a string; return it directly
    const value = property.value
    if (typeof value === 'string') {
      entry.pluginMetadata['readonly-slug'] = true
      return value
    }

    // slug is an object with a prefix specified
    if (value && typeof value === 'object' && 'prefix' in value && typeof value.prefix === 'string') {
      const parsed = path.parse(slug)
      return path.format({
        name: parsed.name,
        root: parsed.root,
        dir: value.prefix,
      })
    }

    return slug
  }

  private updateIndexSlug(entry: PageModule, currentSlug: string) {
    if (entry.pluginMetadata['readonly-slug'] === true) {
      return currentSlug
    }

    const parsed = path.parse(currentSlug)
    let { name, dir } = parsed

    if (name.startsWith('(') && name.endsWith(')')) {
      name = dir
      dir = path.dirname(dir)

      // we have to special case the web root to be index
      if (dir == '.' && name == '') {
        name = 'index'
      }

      return path.format({
        name: name,
        root: parsed.root,
        dir: dir,
      })
    } else {
      return currentSlug
    }
  }

  private copyProperties(content: PageModule) {
    for (const entry of this.moduleProperties) {
      const [from, to] = Array.isArray(entry) ? entry : [entry, entry]

      if (from in content.module) {
        const value = content.module[from]
        content.metadata.add(to, value)
      }
    }
  }
}
