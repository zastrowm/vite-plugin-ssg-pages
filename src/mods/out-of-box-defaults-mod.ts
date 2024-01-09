import { ModInitializer, StaticSiteMod } from '../static-site-mod.js'
import { ModuleDataMod } from './module-data-mod.js'
import { CustomizedSlugMod } from './metadata-slug-mod.js'
import { PagesMod } from './pages/pages-mod.js'

/**
 * Includes a reasonable set of default mods to be added to make it less configuration driven
 */
export class OutOfBoxDefaultsMod implements StaticSiteMod {
  public name: string = 'default.out-of-box'

  public initialize(loader: ModInitializer): void {
    const defaultedMods: StaticSiteMod[] = []

    // if the user added it then we won't add it ourselves; this allows them to effectively
    // "override" the mods
    const addIfNotIncluded = (mod: StaticSiteMod) => {
      const hasMod = loader.mods.some((it) => it.name == mod.name)
      if (!hasMod) {
        defaultedMods.push(mod)
      }
    }

    addIfNotIncluded(
      new PagesMod({
        pageSuffixes: ['page'], // example.page.tsx      -> `example`
        pageExtensions: ['md'], // example.md            -> `example`
        enableIndexSlugs: true, // someDir/(example).tsx -> `someDir`
      }),
    )

    addIfNotIncluded(
      new ModuleDataMod({
        copyModuleProperties: [
          'frontmatter', //      copy all markdown properties to expose them to pages
          'frontmatter.slug', // copy markdown slugs
        ],
      }),
    )

    addIfNotIncluded(new CustomizedSlugMod())

    defaultedMods.forEach((mod) => mod.initialize(loader))
  }
}
