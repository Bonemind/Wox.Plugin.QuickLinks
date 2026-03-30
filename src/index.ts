import { execFile } from "child_process"
import { platform } from "os"
import { Context, Plugin, PluginInitParams, PublicAPI, Query, Result, ResultAction } from "@wox-launcher/wox-plugin"

interface QuickLink {
  name: string
  url: string
}

let api: PublicAPI
let links: QuickLink[] = []

function openUrl(url: string): void {
  if (platform() === "win32") {
    execFile("cmd", ["/c", "start", "", url])
  } else if (platform() === "darwin") {
    execFile("open", [url])
  } else {
    execFile("xdg-open", [url])
  }
}

function hasPlaceholders(url: string): boolean {
  return url.includes("{}")
}

function countPlaceholders(url: string): number {
  return (url.match(/\{\}/g) ?? []).length
}

function fillPlaceholders(url: string, args: string[]): string {
  const count = countPlaceholders(url)
  let i = 0
  return url.replace(/\{\}/g, () => {
    if (i < count - 1) return args[i++] ?? ""
    return args.slice(i).join(" ")
  })
}

function parseLinks(raw: string): QuickLink[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as QuickLink[]
  } catch (error) {
    console.warn("Error parsing quicklinks string", raw, error);
  }
  return []
}

async function handleAdd(ctx: Context, query: Query): Promise<Result[]> {
  const parts = query.Search.trim().split(/\s+/)
  const name = parts[0] ?? ""
  const url = parts.slice(1).join(" ")

  if (!name) {
    return [{ Title: "Add Quick Link", SubTitle: "Usage: ql add <name> <url>", Icon: { ImageType: "emoji", ImageData: "➕" }, Actions: [] }]
  }
  if (!url) {
    return [{ Title: `Add "${name}"`, SubTitle: "Type the URL after the name", Icon: { ImageType: "emoji", ImageData: "➕" }, Actions: [] }]
  }

  return [
    {
      Title: `Add "${name}"`,
      SubTitle: url,
      Icon: { ImageType: "emoji", ImageData: "➕" },
      Actions: [
        {
          Id: "add",
          Name: "Save Link",
          IsDefault: true,
          Action: async (actionCtx: Context) => {
            const updated = [...links.filter(l => l.name !== name), { name, url }]
            await api.SaveSetting(actionCtx, "links", JSON.stringify(updated), false)
            links = updated
            await api.Notify(actionCtx, `Added "${name}"`)
            await api.HideApp(actionCtx)
          }
        }
      ]
    }
  ]
}

export const plugin: Plugin = {
  init: async (ctx: Context, initParams: PluginInitParams) => {
    api = initParams.API
    const raw = await api.GetSetting(ctx, "links")
    links = parseLinks(raw)
    await api.OnSettingChanged(ctx, async (_ctx, key, value) => {
      if (key === "links") {
        links = parseLinks(value)
      }
    })
  },

  query: async (ctx: Context, query: Query): Promise<Result[]> => {
    if (query.Command === "add") {
      return handleAdd(ctx, query)
    }

    const search = query.Search.trim()
    const parts = search.split(/\s+/)
    const firstWord = parts[0] ?? ""
    const restArgs = parts.slice(1)

    // Fill mode: exact name match + has placeholders + args provided
    const exactMatch = links.find(l => l.name.toLowerCase() === firstWord.toLowerCase())
    if (exactMatch && hasPlaceholders(exactMatch.url) && restArgs.length > 0) {
      const resolved = fillPlaceholders(exactMatch.url, restArgs)
      return [
        {
          Title: exactMatch.name,
          SubTitle: resolved,
          Icon: { ImageType: "emoji", ImageData: "🔗" },
          Actions: [
            {
              Id: `open-${exactMatch.name}`,
              Name: "Open in Browser",
              IsDefault: true,
              Action: async (actionCtx: Context) => {
                await api.HideApp(actionCtx)
                openUrl(resolved)
              }
            }
          ]
        }
      ]
    }

    // Filter mode
    const searchLower = search.toLowerCase()
    const filtered = searchLower
      ? links.filter(l => l.name.toLowerCase().includes(searchLower) || l.url.toLowerCase().includes(searchLower))
      : links

    if (filtered.length === 0) {
      return [
        {
          Title: search ? `No links matching "${query.Search}"` : "No links configured",
          SubTitle: 'Add links via settings or "ql add <name> <url>"',
          Icon: { ImageType: "emoji", ImageData: "🔗" },
          Actions: []
        }
      ]
    }

    return filtered.map(link => {
      const keyword = query.TriggerKeyword ?? "ql"
      const actions: ResultAction[] = hasPlaceholders(link.url)
        ? [
            {
              Id: `fill-${link.name}`,
              Name: "Fill & Open",
              IsDefault: true,
              PreventHideAfterAction: true,
              Action: async (actionCtx: Context) => {
                await api.ChangeQuery(actionCtx, { QueryType: "input", QueryText: `${keyword} ${link.name} ` })
              }
            },
            {
              Id: `open-${link.name}`,
              Name: "Open as-is",
              IsDefault: false,
              Action: async (actionCtx: Context) => {
                await api.HideApp(actionCtx)
                openUrl(link.url)
              }
            }
          ]
        : [
            {
              Id: `open-${link.name}`,
              Name: "Open in Browser",
              IsDefault: true,
              Action: async (actionCtx: Context) => {
                await api.HideApp(actionCtx)
                openUrl(link.url)
              }
            }
          ]

      return {
        Title: link.name,
        SubTitle: link.url,
        Icon: { ImageType: "emoji", ImageData: "🔗" },
        Actions: actions
      }
    })
  }
}
