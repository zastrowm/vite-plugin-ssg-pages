import { HeadContentProps } from './head-content.js'
import { DocumentMetadataAggregator } from './document-metadata-aggregator.js'

/**
 * Container for holding the content that a caller would like to render into the document.
 */
export class RenderingContainer {
  public isActive: boolean = false
  public props: HeadContentProps = {}

  public id = generateUUID()

  constructor(private parent: DocumentMetadataAggregator) {}

  public update(props: HeadContentProps) {
    this.props = props
    if (this.isActive) {
      this.notify()
    }
  }

  public remove() {
    if (this.isActive) {
      this.isActive = false
      this.notify()
    }
  }

  public markRendered() {
    if (!this.isActive) {
      this.isActive = true
      this.notify()
    }
  }

  private notify() {
    this.parent.notify(this)
  }
}

function generateUUID() {
  // Public Domain/MIT
  if (globalThis?.window?.crypto) {
    return globalThis.window.crypto.randomUUID()
  }

  // https://stackoverflow.com/a/8809472/548304
  let d = new Date().getTime()
  let d2 = (typeof performance !== 'undefined' && performance.now && performance.now() * 1000) || 0
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16
    if (d > 0) {
      r = (d + r) % 16 | 0
      d = Math.floor(d / 16)
    } else {
      r = (d2 + r) % 16 | 0
      d2 = Math.floor(d2 / 16)
    }
    return (c == 'x' ? r : (r & 0x7) | 0x8).toString(16)
  })
}
