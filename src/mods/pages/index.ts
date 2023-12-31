import { ContentContributor, ContentModule, ModInitializer, StaticSiteMod } from '../../index.js'
import path from 'path'

interface PagesOptions {
  // Suffixes that turn a file into a page; the suggested value is `page`. If `page` was provided, the expected file
  // format ends up being `adir/aslug.page.tsx` where the slug would be `adir/aslug`
  pageSuffixes: string[]

  // File extensions which become pages automatically without needing a specific suffix. For example, if `md` was
  // provided, then a file of the form `blog/example.md` would end up having a slug of `blog/example`
  pageExtensions?: string[]
}

/**
 * Marks files ending in ".page." as pages, and removes ".page" from the corresponding slug.
 */
export class PagesMod implements StaticSiteMod, ContentContributor {
  public readonly name = 'Pages'

  private readonly suffixes: string[]
  private readonly extensions: Set<string>

  constructor(options: PagesOptions) {
    this.suffixes = options.pageSuffixes.map((it) => `.${it}`)
    this.extensions = new Set(options.pageExtensions?.map((it) => `.${it}`) ?? [])
  }

  public initialize(loader: ModInitializer): void {
    loader.addContentProvider(this)
  }

  public updateSlug(entry: ContentModule, slug: string) {
    const property = entry.metadata.describe('slug')
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

  public computeDefaultSlug(entry: ContentModule): string | null {
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
}
