import { ContentProvider } from '../content-provider.js'
import { filePaths } from '../file-paths.js'
import { combinedMetadataToJson } from '../module-parser.js'
import { ViteDevServer } from 'vite'

/**
 * Generates a small html page to render all the content pages allowing the user to click through to pages
 */
export async function generateDebugViewHtml(vite: ViteDevServer, contentProvider: ContentProvider) {
  const content = Array.from(contentProvider.getAllContent()).map((it) => {
    return {
      ...it,
      metadata: combinedMetadataToJson(it.metadata),
    }
  })

  return await vite.transformIndexHtml(
    '/$/debug?debug=true&salt=1',
    `
<html lang="en">
    <head>
    <title>Debug View</title>
    <meta charSet='utf-8' />
    </head>
<style>
@media (prefers-color-scheme: dark) {
  body {
    background-color: #333;
    color: white;
  }
  
  a {
      color: lightblue;
  }
}
</style>
    <script type="application/json" id="debug-json">
${JSON.stringify(content)}
</script>
<script type="module">
    import { debugRenderContents } from ${filePaths.debug.renderContents.runtimePathQuoted}
    debugRenderContents()
</script>
</body>
  `,
  )
}
