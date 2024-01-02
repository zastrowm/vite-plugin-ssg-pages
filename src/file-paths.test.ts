import { describe, expect, test } from 'vitest'
import { filePaths, ImportablePath } from './file-paths.js'
import fsExtra from 'fs-extra'
import path from 'path'

describe('file-paths', () => {
  describe('runtimePath', () => {
    test('changes extensions', () => {
      expect(new ImportablePath('dir/some.ts').runtimePath.endsWith('some.js')).toBe(true)
    })

    test('uses dist directory', () => {
      expect(new ImportablePath('dir/some.ts').runtimePath).toBe('vite-plugin-ssg-pages/dist/dir/some.js')
    })
  })

  describe('files exists', () => {
    const allFiles = Object.values(filePaths).flatMap((it) => Object.values(it))

    test('count is correct', () => {})

    allFiles.map((it) =>
      test(it.originalPath, async () => {
        const doesExist = await fsExtra.exists(path.join('src', it.originalPath))
        expect(doesExist).toBe(true)
      }),
    )
  })
})
