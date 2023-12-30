import { ViteDevServer } from 'vite'

export type EntryPoints = {
  handleStatic: StaticEntryCallback
  handleDynamic: DevEntryCallback
  handleVirtual: VirtualModuleCallback
}

/*** ******************** ***/
/*** /STATIC ENTRY POINTS\ ***/

export type StaticEntryInput = {
  vite: ViteDevServer
  headStyleToken: string
}

export type StaticEntryOutput = Array<{
  filename: string
  entryPoint: string
}>

export type StaticEntryCallback = (input: StaticEntryInput) => Promise<StaticEntryOutput>

/*** \STATIC ENTRY POINTS/ ***/
/*** ******************** ***/

/*** ******************** ***/
/*** / DEV ENTRY POINTS \ ***/

export type DevEntryInput = {
  vite: ViteDevServer
  url: URL
}

export interface DevEntryOutput {
  status: number
  type: string
  body: string
}

export type DevEntryCallback = (input: DevEntryInput) => Promise<DevEntryOutput>

/*** \ DEV ENTRY POINTS / ***/
/*** ******************** ***/

export type VirtualModuleInput = {
  vite: ViteDevServer
  id: string
}

export type VirtualModuleCallback = (input: VirtualModuleInput) => Promise<string>
