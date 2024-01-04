import { Fragment, h, JSX } from 'preact'
import { useContext, useEffect, useMemo } from 'preact/hooks'
import { HTMLDocumentContext } from './document-metadata-aggregator.js'

export interface HeadContentProps {
  children?: JSX.Element[] | JSX.Element
  lang?: string
}

/**
 * Renders head content into the document.
 * @param props the content that should be inserted into the head. Must be plain old elements or plain old elements
 * which render simple elements, without the use of hooks
 */
export function HeadContent(props: HeadContentProps) {
  try {
    const context = useContext(HTMLDocumentContext)
    const container = useMemo(() => context.createContainer(), [context])

    container.update(props)

    useEffect(() => {
      container.markRendered()
      return () => container.remove()
    }, [container])
  } catch (err) {
    // during hot-reload, we sometimes get exceptions
    if (import.meta.hot) {
      console.error('Error in HeadContent (expected in hot-reloads): ', err)
    } else {
      throw err
    }
  }

  return <Fragment></Fragment>
}
