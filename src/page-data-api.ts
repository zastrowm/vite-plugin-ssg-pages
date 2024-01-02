import { PageDataApi } from './pages/index.js'

/**
 * Implementation of PageDataApi that automatically caches json requests to avoid making excessive # of network calls
 */
export class CachingPageDataApi implements PageDataApi {
  private cachedData = new Map<string, any>()

  async fetchJson<T = any>(url: string): Promise<T> {
    const entry = this.cachedData.get(url)
    if (entry) {
      return entry
    }

    console.log(' : Making network request : ', url)
    const response = await fetch(url).then((it) => it.json())
    this.cachedData.set(url, response)
    return response as T
  }
}
