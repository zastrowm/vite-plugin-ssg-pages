import { RenderingContainer } from './rendering-container.js'
import { createContext, FunctionComponent, VNode } from 'preact'

/**
 * Aggregates all data from rendering-containers and surfaces the associated data for rendering into the head.
 */
export class DocumentMetadataAggregator {
  private mapping = new Map<string, RenderingContainer>()
  private containers: RenderingContainer[] = []

  public onMarkDirty: null | (() => void) = null

  constructor(private inStaticMode: boolean = false) {}

  /**
   * Determine the lang attribute-value to use on the html tag
   */
  public getLang(): string | undefined {
    for (let i = this.containers.length - 1; i >= 0; i--) {
      const container = this.containers[i]
      if (container.props.lang) {
        return container.props.lang
      }
    }

    return undefined
  }

  /**
   * Retrieves the nodes that should be rendered in to the head of the document
   */
  public renderHead() {
    const nodes = this.getVNodeList()
    return this.removeDuplicates(nodes)
  }

  private getVNodeList() {
    const flattenedNodes: VNode[] = []

    for (const it of this.containers) {
      let children = it.props.children
      if (!children) {
        continue
      }

      if (Array.isArray(children)) {
        for (const child of children) {
          this.flatten(child, flattenedNodes)
        }
      } else {
        this.flatten(children, flattenedNodes)
      }
    }
    for (const child of this.containers.flatMap((it) => it.props.children)) {
      if (child) {
        this.flatten(child, flattenedNodes)
      }
    }

    return flattenedNodes
  }

  private removeDuplicates(nodes: VNode[]) {
    const toRemove = new Set<number>()

    let indexCurrentTitle = -1
    let indexCurrentBase = -1

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      if (node.type === 'title') {
        toRemove.add(indexCurrentTitle)
        indexCurrentTitle = i
      } else if (node.type == 'base') {
        toRemove.add(indexCurrentBase)
        indexCurrentBase = i
      }
    }

    const title = nodes[indexCurrentTitle]
    const base = nodes[indexCurrentBase]

    toRemove.add(indexCurrentTitle)
    toRemove.add(indexCurrentBase)

    const filtered = nodes.filter((_, index) => !toRemove.has(index))

    if (title) {
      filtered.splice(0, 1, title)
    }

    if (base) {
      filtered.splice(0, 1, base)
    }

    return filtered
  }

  private flatten(node: VNode, collection: VNode[]) {
    if (!node) {
      return
    }

    if (typeof node.type === 'function') {
      const res = (node.type as FunctionComponent)(node.props)

      if (res) {
        this.flatten(res, collection)
      }
    } else {
      collection.push(node)
    }
  }

  private markDirty() {
    this.onMarkDirty?.()
  }

  public notify(container: RenderingContainer): void {
    if (container.isActive) {
      if (!this.mapping.has(container.id)) {
        this.mapping.set(container.id, container)
        this.containers.push(container)
      }

      this.markDirty()
    } else {
      if (this.mapping.has(container.id)) {
        this.mapping.delete(container.id)
        const index = this.containers.indexOf(container)
        if (index >= 0) {
          this.containers.splice(index, 1)
        }

        this.markDirty()
      }
    }
  }

  public createContainer() {
    const container = new RenderingContainer(this)

    if (this.inStaticMode) {
      this.containers.push(container)
    }

    return container
  }
}

export const HTMLDocumentContext = createContext<DocumentMetadataAggregator>(null!)
