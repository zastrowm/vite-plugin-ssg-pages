/**
 * Sort the array
 * @param arr
 * @param properties
 */
export function toSortedArray<T>(arr: T[], ...properties: Array<(item: T) => number | string>) {
  const copy = [...arr]
  copy.sort((a, b) => {
    for (const property of properties) {
      const left = property(a)
      const right = property(b)

      if (left < right) {
        return -1
      } else if (left > right) {
        return 1
      }
    }

    return 0
  })
  return copy
}
