import { Json } from './renderer.js'

export const jsonEncoding = {
  decodeJsonForUrl(value: string): Json {
    if (value.length == 0) {
      value = '{}'
    }
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf-8'))
  },

  encodeJsonForUrl(value: Json): string {
    return Buffer.from(JSON.stringify(value)).toString('base64url')
  },
}
