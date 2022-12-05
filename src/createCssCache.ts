let cache: CSSCache | null = null
let prefix = "css-"
let version = "1"

export type CSSCache = {
  id: string
  insert: (type: number, options: InsertOptions) => any
  remove: (type: number, options: RemoveOptions) => any
}

export type AtomMap = Map<
  string,
  {
    key: string
    value: string
  }
>

export type StyleMap = Map<
  string,
  {
    el: HTMLElement
    ref: number
  }
>

export type InsertOptions = {
  sKey?: string
  key?: string
  value?: string
}

export type RemoveOptions = {
  sKey: string
}

export type CreateCacheOptions = {
  prefix?: string
}

export function createCache(options?: CreateCacheOptions): CSSCache {
  if (cache) {
    return cache
  }

  if (options?.prefix) {
    prefix = options.prefix
  }

  const id = `${prefix}setsuna-${version}`
  const atomStyle = createStyle("")

  const atomMap: AtomMap = new Map()
  const styleMap: StyleMap = new Map()

  let insertPending = true
  const insertPendingSet = new Set<InsertOptions & { type: number }>()

  const insert = (type: number, options: InsertOptions) => {
    insertPendingSet.add({ ...options, type })

    if (!insertPending) return

    insertPending = false
    Promise.resolve().then(() => {
      let atomStyleContent = atomStyle.textContent
      const atomStyleSize = atomStyleContent!.length
      insertPendingSet.forEach(({ type, sKey, key, value }) => {
        if (type === 1) {
          if (atomMap.has(sKey!)) return

          atomStyleContent += `${sKey}{${key!}:${value};}`
          atomMap.set(sKey!, { key: key!, value: value! })
          return
        }

        if (type === 2) {
          const style = styleMap.get(sKey!)
          style
            ? (style.ref += 1)
            : styleMap.set(sKey!, { el: createStyle(value!), ref: 1 })
          return
        }
      })

      if (atomStyleSize !== atomStyleContent!.length) {
        atomStyle.textContent = atomStyleContent
      }

      insertPendingSet.clear()
      insertPending = true
    })
  }

  let removePending = false
  const removePendingSet = new Set<RemoveOptions & { type: number }>()
  const remove = (type: number, options: RemoveOptions) => {
    removePendingSet.add({ type, ...options })

    if (removePending) return

    removePending = true
    Promise.resolve().then(() => {
      removePendingSet.forEach(({ type, sKey }) => {
        if (type === 2) {
          const style = styleMap.get(sKey)
          if (!style) return

          style.ref -= 1

          if (style.ref === 0) {
            document.head.removeChild(style.el)
            styleMap.delete(sKey)
          }

          return
        }
      })

      removePending = false
      removePendingSet.clear()
    })
  }

  return (cache = { id, insert, remove })
}

function createStyle(content: string) {
  const style = document.createElement("style")
  style.type = "text/css"
  style.textContent = content
  style.setAttribute(`${prefix}setsuna-${version}`, "")
  document.head.appendChild(style)
  return style
}

export function resolveCache() {
  if (!cache) createCache()
  return cache!
}

export function resolvePrefix() {
  return prefix
}