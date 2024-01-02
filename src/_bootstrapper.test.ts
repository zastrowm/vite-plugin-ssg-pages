import { describe, expect, test } from 'vitest'
import { PluginVirtualContentName } from './constants.js'

import rawFile from './_bootstrapper.js?raw'

describe('entry-point', () => {
  test('contains an import of the correct name', async () => {
    const text = rawFile
    expect(text).toContain(`await import('${PluginVirtualContentName}')`)
  })
})
