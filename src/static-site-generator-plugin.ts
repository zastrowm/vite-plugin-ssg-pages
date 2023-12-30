import type { ResolvedConfig } from 'vite'
import { mergeConfig, Plugin } from 'vite'
import { StaticSiteGeneratorPluginName } from './constants.js'
import { StaticSiteGeneratorPluginRunner } from './static-site-generator-plugin-runner.js'

export interface StaticSiteGeneratorPluginOptions {
  // the entry file to the plugin and the options defined for the static-site generator
  entry?: string
}

export function staticSiteGeneratorPlugin(options = {}): Plugin {
  const defaultOptions: StaticSiteGeneratorPluginOptions = {
    entry: 'src/static-site.config.ts',
  }

  const plugin = new StaticSiteGeneratorPluginRunner(mergeConfig(defaultOptions, options))

  return {
    name: StaticSiteGeneratorPluginName,
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
