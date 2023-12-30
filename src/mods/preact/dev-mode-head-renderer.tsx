import { useContext, useEffect, useState } from 'preact/hooks'
import { ComponentType, Fragment, h, render } from 'preact'
import { unmountComponentAtNode } from 'preact/compat'
import { HTMLStructuredDocument } from './html-structured-document.js'
import { DocumentMetadataAggregator, HTMLDocumentContext } from './document-metadata-aggregator.js'

/**
 * Renders the html document context that should be applied to the head
 */
export function DocumentHeadRenderer(props: { context: DocumentMetadataAggregator }) {
  const context = props.context
  const [_, setState] = useState(0)

  context.onMarkDirty = () => setState((s) => s + 1)

  return (
    <Fragment>
      <meta charSet="utf-8" />
      {context.renderHead()}
    </Fragment>
  )
}

export function DevModeHeadRenderer() {
  const head = useContext(HTMLDocumentContext)

  const lang = head.getLang()

  useEffect(() => {
    if (globalThis.document && lang) {
      document.documentElement.setAttribute('lang', lang)
    }
  }, [lang])

  useEffect(() => {
    if (globalThis.document) {
      render(<DocumentHeadRenderer context={head} />, globalThis.document.head)
    }

    return () => {
      if (globalThis.document) {
        unmountComponentAtNode(global.document.head)
      }
    }
  }, [head])

  return <Fragment />
}

export function renderInDevMode(Component: ComponentType, props: object | null) {
  render(
    <HTMLStructuredDocument>
      <DevModeHeadRenderer />
      {h(Component, props)}
    </HTMLStructuredDocument>,
    document.body,
  )
}
