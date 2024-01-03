// This is imported virtually from the /$/debug end-point
// noinspection JSUnusedGlobalSymbols
export function debugRenderContents() {
  const contents = JSON.parse(document.getElementById('debug-json')!.textContent!)

  const element = (
    <div>
      <h2>Pages</h2>
      <table>
        <tr>
          <th>Page</th>
          <th>Renderer</th>
          <th>File path</th>
          <td>Metadata!</td>
        </tr>
        {contents.map((it: any) => (
          <tr>
            <td>
              <a href={`/${it.slug}`}>{it.slug}</a>
            </td>
            <td>{it.renderer}</td>
            <td>{it.metadata.$original_path}</td>
            <td>
              <details>
                <summary>Expand</summary>
                <pre>{JSON.stringify(it.metadata, null, 2)}</pre>
              </details>
            </td>
          </tr>
        ))}
      </table>
      <h2>Raw content JSON</h2>
      <details>
        <summary>Expand</summary>
        <pre>{JSON.stringify(contents, null, 2)}</pre>
      </details>
    </div>
  )

  document.body.append(element)
}

// very-very small implementation to allow us to use JSX above for generating the html
type ChildElement = HTMLElement | string | Array<ChildElement>

// Used by the TS compiler
// noinspection JSUnusedLocalSymbols
function h(tagName: string, props: object | null, ...children: ChildElement[]): JSX.IntrinsicElements {
  // 1. Create the element
  const element = document.createElement(tagName)

  // 2. Assign any properties
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      ;(element as any)[key] = value
    }
  }

  // 3. Add the children
  appendChildren(element, children)

  // 4. Return it
  return element
}

function appendChildren(element: HTMLElement, children: ChildElement[]) {
  for (const child of children) {
    if (Array.isArray(child)) {
      // nested array; recursion!
      appendChildren(element, child)
    } else if (typeof child == 'string') {
      // text child, we can create a text node
      const text = document.createTextNode(child)
      element.appendChild(text)
    } else {
      // must be an HTMLElement, so add it directly
      element.appendChild(child)
    }
  }
}
