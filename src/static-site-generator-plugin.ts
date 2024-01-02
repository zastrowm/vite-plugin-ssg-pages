import type { ResolvedConfig } from 'vite'
import { Plugin } from 'vite'
import { StaticSiteGeneratorPluginName } from './constants.js'
import {
  StaticSiteGeneratorPluginOptions,
  StaticSiteGeneratorPluginRunner,
} from './static-site-generator-plugin-runner.js'

export function staticSiteGeneratorPlugin(
  options: StaticSiteGeneratorPluginOptions,
): Plugin & { __passthrough__: StaticSiteGeneratorPluginRunner } {
  const plugin = new StaticSiteGeneratorPluginRunner(options)

  return {
    name: StaticSiteGeneratorPluginName,
    __passthrough__: plugin,
    apply(_, env) {
      const isDev = env.command == 'serve'
      plugin['isDev'] = isDev
      console.log(`🌐\tStaticSiteGenerator plugin active (mode: ${isDev ? 'dev' : 'build'})!`)
      return true
    },
    configResolved(theConfig: ResolvedConfig) {
      plugin['config'] = theConfig
    },
    config(theConfig) {
      return plugin.transformConfig(theConfig)
    },
    configureServer(server) {
      return plugin.configureServer(server)
    },
    resolveId(id) {
      return plugin.resolveId(id)
    },
    load(id) {
      return plugin.load(id)
    },
    async renderError() {
      await plugin.stopServer()
    },

    async buildEnd() {},

    async closeBundle() {
      await plugin.closeBundle()
      await plugin.stopServer()
      return
    },
  } as const
}
