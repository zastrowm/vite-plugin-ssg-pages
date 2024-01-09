import { ModInitializer, ModNamedOrders, PageModule, StaticSiteMod } from '../../index.js'
import { ContentType } from '../../mod/mod-loader.js'
import path from 'path'

interface PagesOptions {
  // Suffixes that turn a file into a page; the suggested value is `page`. If `page` was provided, the expected file
  // format ends up being `adir/aslug.page.tsx` where the slug would be `adir/aslug`
  pageSuffixes: string[]

  // File extensions which become pages automatically without needing a specific suffix. For example, if `md` was
  // provided, then a file of the form `blog/example.md` would end up having a slug of `blog/example`
  pageExtensions?: string[]

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

  constructor(options: PagesOptions) {
    this.suffixes = options.pageSuffixes.map((it) => `.${it}`)
    this.extensions = new Set(options.pageExtensions?.map((it) => `.${it}`) ?? [])
    this.enableIndexSlugs = options.enableIndexSlugs
  }

  public initialize(loader: ModInitializer): void {
    loader.determineContentType.add((entry) => this.determineContentType(entry))
    loader.slugNormalization.add((entry) => this.cleanSlug(entry), ModNamedOrders.first)

    if (this.enableIndexSlugs) {
      loader.slugNormalization.add((entry) => this.updateIndexSlug(entry), ModNamedOrders.last)
    }
  }

  // If the module has a matching file type or a matching file suffix, it's a page
  private determineContentType(entry: PageModule): ContentType {
    const parsed = path.parse(entry.contentPath)

    if (this.extensions.has(parsed.ext)) {
      return 'page'
    }

    for (const suffix of this.suffixes) {
      if (parsed.name.endsWith(suffix)) {
        return 'page'
      }
    }

    return null
  }

  // If the entry has a slug that has one of our suffixes (and the original content path did to) go
  // ahead and remove the slug suffixes
  private cleanSlug(entry: PageModule): void {
    // if they modified the slug name, it's up to them to remove any ()
    if (entry.contentData.get('slug.name.modified') === true) {
      return
    }

    const currentSlug = entry.contentData.get('slug')?.toString()
    if (!currentSlug) {
      return
    }

    const newSlug = this.determineNewSlug(entry, currentSlug)
    if (newSlug) {
      entry.contentData.set('slug', newSlug)
    }
  }

  private determineNewSlug(entry: PageModule, currentSlug: string) {
    const parsed = path.parse(entry.contentPath)

    // if it's a page that doesn't have any of our suffixes, then bail out
    if (this.extensions.has(parsed.ext)) {
      return
    }

    const parsedSlug = path.parse(currentSlug)

    for (const suffix of this.suffixes) {
      if (parsed.name.endsWith(suffix) && parsedSlug.name.endsWith(suffix)) {
        // remove the suffix
        const name = parsedSlug.name.substring(0, parsedSlug.name.length - suffix.length)
        return path.format({
          name: name,
          root: parsedSlug.root,
          dir: parsedSlug.dir,
        })
      }
    }

    return
  }

  private updateIndexSlug(entry: PageModule) {
    // if they modified the slug name, it's up to them to remove any ()
    if (entry.contentData.get('slug.name.modified') === true) {
      return
    }

    const currentSlug = entry.contentData.get('slug') as string
    const parsed = path.parse(currentSlug)

    let { name, dir } = parsed

    if (!(name.startsWith('(') && name.endsWith(')'))) {
      return
    }

    name = dir
    dir = path.dirname(dir)

    // we have to special case the web root to be index
    if (dir == '.' && name == '') {
      name = 'index'
    }

    const newSlug = path.format({
      name: name,
      root: parsed.root,
      dir: dir,
    })

    entry.contentData.set('slug', newSlug)
  }
}
