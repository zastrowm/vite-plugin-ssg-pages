import { Fragment, h, VNode } from 'preact'
import { HTMLStructuredDocument } from './html-structured-document.js'
import { DocumentMetadataAggregator } from './document-metadata-aggregator.js'
import { renderToStaticMarkup } from 'preact-render-to-string'
import { StaticPageContext } from '../../index.js'

interface GenerateHtmlProps {
  component: VNode
  context: StaticPageContext
}

// noinspection JSUnusedGlobalSymbols
export async function generateHtml(props: GenerateHtmlProps): Promise<string> {
  const aggregator = new DocumentMetadataAggregator(true)

  const bodyHtml = renderToStaticMarkup(
    <HTMLStructuredDocument aggregator={aggregator}>
      <Fragment>{props.component}</Fragment>
    </HTMLStructuredDocument>,
  )

  let headHtml = renderToStaticMarkup(<Fragment>{aggregator.renderHead()}</Fragment>)
  const lang = aggregator.getLang()

  const staticStylesElement = '<meta name="ssg-styles"/>'

  if (!headHtml.includes(staticStylesElement)) {
    headHtml += `\n${staticStylesElement}`
  }

  headHtml = headHtml.replace(staticStylesElement, await props.context.getStyleFragment())

  const html = `<!DOCTYPE html>
<head${lang ? ` lang="${lang}"` : ''}>
<meta charSet='utf-8' />
${headHtml}
</head>
<body>
${bodyHtml}
</body>
`.trim()

  return html
}
