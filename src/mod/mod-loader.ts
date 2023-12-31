import { HookCallback, ModInitializer, ModNamedOrders, PageModule, StaticSiteMod } from '../static-site-mod.js'
import { Renderer } from '../renderer.js'
import { toSortedArray } from '../util/array.js'

/**
 * Tracks the mods used for the current environment + helper methods for retrieving data from mods
 */
export class ModLoader implements ModInitializer {
  public renderers = new Map<string, Renderer>()

  constructor(mods: StaticSiteMod[]) {
    const ordered = toSortedArray(mods ?? [], (it) => it.order ?? ModNamedOrders.normal)

    ordered.forEach((mod) => {
      mod.initialize(this)
    })
  }

  public readonly generatePageSlug = new CallbackList<(module: PageModule) => string | null>()
  public readonly updatePageSlug = new CallbackList<(module: PageModule, currentSlug: string) => string>()

  public addRenderer(name: string, renderer: Renderer): void {
    this.renderers.set(name, renderer)
  }

  public getRenderer(name: string, extra: string = '') {
    const renderer = this.renderers.get(name)

    if (!renderer) {
      throw new Error(`No renderer with the name '${name}' found!${extra}`)
    }

    return renderer
  }
}

/**
 * Tracks callbacks that can be added by various mods
 */
export class CallbackList<T extends Function> implements HookCallback<T> {
  private didChange = false
  private items = [] as Array<{ value: T; order: number }>

  public *[Symbol.iterator]() {
    if (this.didChange) {
      this.items = toSortedArray(this.items, (it) => it.order)
      this.didChange = false
    }

    for (const entry of this.items) {
      yield entry.value
    }
  }

  public add(item: T, order: number = ModNamedOrders.normal) {
    this.items.push({ value: item, order: order })
    this.didChange = true
  }

  public forEach(callback: (item: T) => boolean) {
    if (this.didChange) {
      this.items = toSortedArray(this.items, (it) => it.order)
      this.didChange = false
    }

    for (const item of this.items) {
      if (!callback(item.value)) {
        return
      }
    }
  }
}
