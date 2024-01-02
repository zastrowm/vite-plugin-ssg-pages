import { format, join, parse } from 'path'
import { normalizePath } from 'vite'

/**
 * A path to a file within the framework that can be imported at runtime
 */
export class ImportablePath {
  constructor(public readonly originalPath: string) {}

  get runtimePath() {
    return normalizePath(join('vite-plugin-ssg-pages/dist', this.withJsExtension))
  }

  get runtimePathQuoted() {
    return JSON.stringify(this.runtimePath)
  }

  private get withJsExtension() {
    const parts = parse(this.originalPath)

    if (parts.ext.length > 0) {
      return format({
        ...parts,
        base: '',
        ext: '.js',
      })
    }

    return this.originalPath
  }
}

/**
 * Local file paths that we import via html includes
 */
export const filePaths = {
  debug: {
    // language=file-reference
    renderContents: new ImportablePath('debug/render-contents-clientside.tsx'),
  },
  preact: {
    // language=file-reference
    generateHtml: new ImportablePath('mods/preact/virtual-import.generate-html.tsx'),
    // language=file-reference
    devModeRenderer: new ImportablePath('mods/preact/dev-mode-head-renderer.tsx'),
  },
}
