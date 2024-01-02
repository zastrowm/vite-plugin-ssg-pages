export interface PageDataApi {
  fetchJson<T = any>(url: string): Promise<T>
}

/**
 * Allows configuring page metadata in a type-safe way.
 *
 * Only useful in combination with typescript and enhancing the Config type
 */
export function declareMetadata(metadata: PageMetadata.Config) {
  return metadata
}

/**
 * A base metadata Config object
 */
export interface DefaultPageMetadataConfig {
  getData?: (api: PageDataApi) => Promise<unknown>
}
