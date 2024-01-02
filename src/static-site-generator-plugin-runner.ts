import {
  PluginVirtualContentName,
  PluginVirtualPrefix,
  StaticSiteGeneratorPluginName,
  STYLE_REPLACEMENT_TOKEN,
} from './constants.js'
import {
  type Connect,
  createServer,
  defineConfig,
  Manifest,
  mergeConfig,
  normalizePath,
  ResolvedConfig,
  UserConfig,
  ViteDevServer,
} from 'vite'
import type { EntryPoints, StaticEntryOutput } from './program-interop.js'
import path, { resolve } from 'path'
import { StaticPageContract } from './renderers/page-context.js'
import fsExtra from 'fs-extra'
import { readFile } from 'fs/promises'
import { ServerResponse } from 'http'
import { StaticSiteMod } from './static-site-mod.js'
import { ModSettings } from './mod-settings.js'

export interface StaticSiteGeneratorPluginOptions {
  readonly content: {
    directory: string
    glob: string
  }

  readonly configFilenames: string[]
  readonly styleExtensions: string[]

  readonly mods?: StaticSiteMod[]
}

/**
 * Contains the bulk of the logic for the staticSiteGeneratorPlugin.
 *
 * Separate to avoid the oddity of just using methods/properties to implement certain behaviors.
 */
export class StaticSiteGeneratorPluginRunner {
  public readonly name = StaticSiteGeneratorPluginName
  public readonly enforce = 'pre'
  public config: ResolvedConfig = null!

  private inputs: StaticEntryOutput = []
  private server: ViteDevServer | null = null

  private isDev: boolean = false

  public readonly options: ModSettings

  constructor(options: StaticSiteGeneratorPluginOptions) {
    this.options = new ModSettings(options)
  }

  public resolveId(id: string) {
    if (id.startsWith(PluginVirtualPrefix)) {
      return '\0' + id
    }

    return undefined
  }

  public load(id: string) {
    if (id.startsWith('\0' + PluginVirtualPrefix)) {
      return this.loadVirtualModule(id)
    }

    return undefined
  }

  private async loadEntry(vite: ViteDevServer) {
    const entrypoint = await vite.ssrLoadModule(`${StaticSiteGeneratorPluginName}/dist/_bootstrapper.js`)
    return (await entrypoint.initialize(vite)) as EntryPoints
  }

  private async loadVirtualModule(id: string) {
    if (id == '\0' + PluginVirtualContentName) {
      // language=JavaScript
      return `
export function getAll() {
  return import.meta.glob(${JSON.stringify(this.options.contentGlob)}, { eager: true })
}
      `
    }

    const vite = this.server!
    const entry = await this.loadEntry(vite)
    return entry.handleVirtual({
      vite,
      id,
    })
  }

  private async getInputs(): Promise<StaticEntryOutput> {
    const vite = await this.startServerIfNeeded()

    this.log('Starting input discovery')

    try {
      const entry = await this.loadEntry(vite)
      const inputs = await entry.handleStatic({ vite, headStyleToken: STYLE_REPLACEMENT_TOKEN })
      this.log(
        'Inputs discovered: ',
        inputs.map((it) => it.filename),
      )
      return inputs
    } finally {
      // to avoid Vite's "The Build was cancelled")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await vite.close()
    }
  }

  public async startServerIfNeeded() {
    if (this.server) {
      return this.server
    }

    this.log('Initializing Vite DevServer for SSG')

    this.server = await createServer({
      appType: 'custom',
      server: {
        middlewareMode: true,
      },
    })

    this.log('Vite DevServer Initialized for SSG')
    this.log('')

    return this.server
  }

  private log(message: string, ...args: any[]) {
    const mode = this.isDev ? '⚡️' : '🚀'
    console.log(`🌐${mode}\t${message}`, ...args)
  }

  public async stopServer() {
    if (this.server) {
      // to avoid Vite's "The Build was cancelled")
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await this.server.close()
      this.server = null
    }
  }

  public async transformConfig(config: UserConfig): Promise<UserConfig> {
    if (this.isDev) {
      return defineConfig({
        optimizeDeps: {
          exclude: [
            // we import direct pages here, so we want to keep un-optimized
            'vite-plugin-ssg-pages',
            // preact & preact-render-to-string seem problematic, as we kept running into something like
            // https://github.com/preactjs/preact/issues/1373
            'preact-render-to-string',
            'preact',
          ],
        },
        server: {
          port: 3080,
          watch: {
            ignored: (it) => {
              const relative = normalizePath(path.relative(this.config.root, it))
              return relative.startsWith('dist/')
            },
          },
        },
      })
    }

    this.inputs = await this.getInputs()

    const extraBuild =
      config.build?.outDir != null
        ? {}
        : defineConfig({
            build: {
              outDir: './dist/static',
            },
          })

    return mergeConfig(
      extraBuild,
      defineConfig({
        build: {
          rollupOptions: {
            preserveEntrySignatures: 'strict',
            input: this.inputs.map((it) => it.entryPoint),
            output: {
              entryFileNames: 'assets/[hash].js',
              assetFileNames: 'assets/[hash][extname]',
            },
          },
          manifest: true,
        },
      }),
    )
  }

  public async closeBundle() {
    if (this.isDev) {
      return
    }

    const manifest = await this.readManifest()
    await this.writeStaticHtmlFiles(manifest)
    await this.deleteJsFiles(manifest)
    await this.deleteManifest()
    await this.cleanupVite()
  }

  // Gets the path to the generated vite manifest file; in vite5, it changed from `${outdir}/manifest.json` to
  // `${outdir}/.vite/manifest`, so we need to account for both
  private async getManifestFilePath() {
    const expectedPaths = [
      resolve(this.config.build.outDir, '.vite/manifest.json'),
      resolve(this.config.build.outDir, 'manifest.json'),
    ]

    for (const expectedPath of expectedPaths) {
      if (await fsExtra.exists(expectedPath)) {
        return expectedPath
      }
    }

    throw new Error('Could not find manifest.json; did the path change again?')
  }

  private async writeStaticHtmlFiles(manifest: Manifest) {
    if (this.isDev) {
      return
    }

    this.log('Generating static files')

    for (const data of this.inputs) {
      const manifestEntry = manifest[data.entryPoint]

      const fullPath = path.resolve(path.join('./dist/static', manifestEntry.file))

      const imported = (await import(/* @vite-ignore */ 'file://' + fullPath)) as StaticPageContract
      if ('generatePage' in imported) {
        const headers = this.gatherCssImports(manifest, normalizePath(data.entryPoint))
        const html = await imported.generatePage({
          async getStyleFragment(): Promise<string> {
            return headers
          },
        })

        const outputPath = resolve(this.config.build.outDir, data.filename)
        await fsExtra.outputFile(outputPath, html, 'utf-8')
        this.log(`   Generated ${outputPath}`)
      }
    }

    this.log('Generation complete!')
  }

  private async deleteJsFiles(manifest: Manifest): Promise<void> {
    const deletedFiles = new Map<string, Promise<void>>()

    this.log('Deleting page-generation scripts')

    for (const key in manifest) {
      const data = manifest[key]

      if (data.file.endsWith('.js') || data.file.endsWith('.js')) {
        const existing = deletedFiles.get(data.file)
        if (existing) {
          continue
        }

        const fullPath = resolve(this.config.build.outDir, data.file)
        const deletePromise = fsExtra.rm(fullPath)

        deletedFiles.set(data.file, deletePromise)
      }
    }

    await Promise.allSettled(deletedFiles.values())

    this.log('Deletion complete!')
  }

  private async readManifest(): Promise<Manifest> {
    const manifestPath = await this.getManifestFilePath()
    const content = await readFile(manifestPath, 'utf-8')
    return JSON.parse(content)
  }

  /**
   * Find all css imports that need to be present for a given path.
   *
   * Not all imports are directly exposed in the manifest; some of the imports are represented as a fileB importing
   * fileA where fileA has CSS imports that should also be included in fileB.  Thus for a given entry file, we need
   * to walk the tree to identify all the imports that should be included/.
   */
  private gatherCssImports(manifest: Manifest, path: string) {
    // use a set to avoid duplicate resources
    const cssFiles = new Set<string>()
    // make sure we don't loop for whatever reason
    const visited = new Set<string>()

    const remaining = [path]

    if (path.startsWith('/')) {
      remaining.push(path.substring(1))
    }

    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i]

      if (visited.has(item)) {
        continue
      }

      visited.add(item)

      const entry = manifest[item]
      if (entry) {
        ;(entry.css ?? []).forEach((file) => {
          cssFiles.add(file)
        })

        if (entry.imports) {
          remaining.push(...entry.imports)
        }
      }
    }

    return Array.from(cssFiles.values())
      .map((it) => `<link rel="stylesheet" href="/${it}" />`)
      .join('\n')
  }

  private async deleteManifest() {
    const manifestPath = await this.getManifestFilePath()
    await fsExtra.rm(manifestPath)
  }

  private async cleanupVite() {
    const viteFolder = resolve(this.config.build.outDir, '.vite2')
    if (await fsExtra.exists(viteFolder)) {
      await fsExtra.rmdir(viteFolder)
    }
  }

  private async handleRequest(
    req: Connect.IncomingMessage,
    res: ServerResponse<Connect.IncomingMessage>,
    next: Connect.NextFunction,
  ) {
    const server = await this.startServerIfNeeded()
    const url = new URL(`https://localhost}${req.originalUrl}`)

    try {
      const entry = await this.loadEntry(server)
      const { status, type, body } = await entry.handleDynamic({
        vite: server,
        url: url,
      })

      res.statusCode = status
      res.setHeader('Content-Type', type)
      res.end(body, 'utf-8')
    } catch (e) {
      server.ssrFixStacktrace(e as Error)
      console.error(e)
      next(e)
    }
  }

  configureServer(server: ViteDevServer): (() => void) | undefined {
    this.server = server
    if (!this.isDev) {
      return undefined
    }

    return () => {
      server.middlewares.use((req, res, next) => {
        this.handleRequest(req, res, next).finally()
      })
    }
  }
}
