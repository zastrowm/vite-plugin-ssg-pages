import type { JSX } from 'preact'

export { HeadContent } from './head-content.js'
export { BodyContent } from './body-content.js'

export { PreactMod } from './preact-mod.js'

export type MetaPreactLayoutConfig = ((props: any) => JSX.Element) | null
