import { Fragment, h, JSX } from 'preact'

/**
 * Renders body content into the document; equivalent to using a fragment but provides a similar construct to the
 * HeadContent element.
 */
export function BodyContent(props: { children: JSX.Element[] | JSX.Element }) {
  return <Fragment>{props.children}</Fragment>
}
