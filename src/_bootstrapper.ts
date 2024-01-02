import { ViteDevServer } from 'vite'
import { StaticSiteGeneratorPluginName } from './constants.js'
import { StaticSiteGeneratorPluginRunner } from './static-site-generator-plugin-runner.js'
import { PluginEntry } from './plugin-entry.js'

// This is the entry-point the plugin uses to start loading content. Its purpose is to provide all data to the

export async function initialize(vite: ViteDevServer) {
  const runner = getPluginRunner(vite)
  // This gets all the content files configured via the plugin options; it's a virtual file because we have
  // to dynamically generate the glob that vite will use to retrieve all the files
  // @ts-ignore
  const entries = await import('virtual:vite-plugin-ssg-pages:content')

  return new PluginEntry(runner.options, () => entries.getAll())
}

function getPluginRunner(vite: ViteDevServer) {
  const selfPlugin = vite.config.plugins.find((it) => it.name == StaticSiteGeneratorPluginName)
  if (selfPlugin == null) {
    throw new Error('Could not find the static-site-generator plugin; how did we end up in the entry point?')
  }

  return (selfPlugin as any)['__passthrough__'] as StaticSiteGeneratorPluginRunner
}
