import { ModInitializer, ModNamedOrders, PageModule, StaticSiteMod } from '../static-site-mod.js'
import { is } from '@kreativ/core/typing/is.js'
import path from 'path'
import { DescribedProperty } from '../module-parser.js'

export type SlugPartFactory = (entry: PageModule) => string
export type StringOrFactory = string | SlugPartFactory

export type MetaSlugConfig =
  | StringOrFactory
  | {
      name: StringOrFactory
    }
  | {
      path: StringOrFactory
    }
  | {
      path: StringOrFactory
      name: StringOrFactory
    }

enum SlugModificationType {
  slug,
  name,
  path,
}

/**
 * Allows customizing the slug used for a specific page. By providing an object or value for
 * the `slug` property, pages can customize the slug that is used for a page.
 *
 * - If `slug` is provided, the given value becomes the entire slug
 * - If `slug.path` is provided, the prefix/directory of the slug is changed to the provided
 *   value; for instance if the default slug is `child/name` and `slug.path` is `parent/_`, then the
 *   `slug` becomes `parent/_/name`
 * - If `slug.name` is provided, the provided value is appended to the prefix/directory portion
 *   value; for instance if the default slug is `parent/child/name` and `slug.name` is `test`,
 *   then the `slug` becomes `parent/child/test`
 *
 * This mod may set the following contentProperties:
 *
 *  - `slug`: the value of the slug after modification
 *  - `slug.name.modified`: true if the slug name has been modified or customized by metadata
 *  - `slug.path.modified`: true if the slug path has been modified or customized by metadata
 */
export class CustomizedSlugMod implements StaticSiteMod {
  public readonly name = 'default.slug-specifier'

  public initialize(loader: ModInitializer): void {
    loader.slugNormalization.add((entry) => this.useSlugFromMetadata(entry), ModNamedOrders.pre)
  }

  private useSlugFromMetadata(entry: PageModule): void {
    const slugProperties = Array.from(entry.metadata.describeAll<MetaSlugConfig>('slug'))
      .map((it) => this.convert(it)!)
      .filter((it) => it != null)

    // get the slug, as-is
    let slug = entry.contentData.get('slug') as string

    for (const property of slugProperties) {
      const updateSlug = (newSlug: string) => {
        // keep it updated so that if callers access the current value it will be up to date
        entry.contentData.set('slug', newSlug)

        switch (property.type) {
          case SlugModificationType.slug:
            entry.contentData.set('slug.name.modified', true)
            entry.contentData.set('slug.path.modified', true)
            break
          case SlugModificationType.name:
            entry.contentData.set('slug.name.modified', true)
            break
          case SlugModificationType.path:
            entry.contentData.set('slug.path.modified', true)
            break
        }

        return newSlug
      }

      switch (property.type) {
        case SlugModificationType.slug: {
          const newSlug = property.value(entry)
          slug = updateSlug(newSlug)
          break
        }
        case SlugModificationType.path: {
          const parsed = path.parse(slug)
          const pathValue = property.value(entry)
          slug = updateSlug(
            path.format({
              name: parsed.name,
              root: parsed.root,
              dir: pathValue,
            }),
          )
          break
        }
        case SlugModificationType.name: {
          const parsed = path.parse(slug)
          const nameValue = property.value(entry)
          slug = updateSlug(
            path.format({
              name: nameValue,
              root: parsed.root,
              dir: parsed.dir,
            }),
          )
          break
        }
      }
    }
  }

  /**
   * Map the given slug property into its corresponding parts; if it's a StringOrFactory then return
   * that, otherwise return the "slug.path" or "slug.name" part as a StringOrFactory
   */
  private convert(slugProperty: DescribedProperty<MetaSlugConfig>): null | {
    type: SlugModificationType
    value: SlugPartFactory
    priority: number
  } {
    const value = slugProperty.value

    const createProperty = (type: SlugModificationType, value: StringOrFactory) => {
      {
        return {
          type: type,
          value: is.string(value) ? () => value : value,
          priority: slugProperty.priority,
        }
      }
    }

    if (is.string(value) || is.function<SlugPartFactory>(value)) {
      return createProperty(SlugModificationType.slug, value)
    }

    if (is.object(value)) {
      if ('path' in value && (is.string(value['path']) || is.function(value['path']))) {
        return createProperty(SlugModificationType.path, value['path'])
      }

      if ('name' in value && (is.string(value['name']) || is.function(value['name']))) {
        return createProperty(SlugModificationType.name, value['name'])
      }
    }

    return null
  }
}
