import { DocumentMetadataAggregator, HTMLDocumentContext } from './document-metadata-aggregator.js'
import { useMemo } from 'preact/hooks'
import { h } from 'preact'

export function HTMLStructuredDocument(props: { children: any; aggregator?: DocumentMetadataAggregator }) {
  const head = useMemo(() => props.aggregator ?? new DocumentMetadataAggregator(), [])

  return <HTMLDocumentContext.Provider value={head}>{props.children}</HTMLDocumentContext.Provider>
}
