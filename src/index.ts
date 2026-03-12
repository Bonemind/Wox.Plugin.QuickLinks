import { execFile } from "child_process"
import { platform } from "os"
import { ActionContext, Context, Plugin, PluginInitParams, PublicAPI, Query, Result } from "@wox-launcher/wox-plugin"

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

function parseLinks(raw: string): QuickLink[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as QuickLink[]
  } catch {}
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
          Action: async (actionCtx: Context, _actionContext: ActionContext) => {
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

    const search = query.Search.toLowerCase().trim()
    const filtered = search
      ? links.filter(l => l.name.toLowerCase().includes(search) || l.url.toLowerCase().includes(search))
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

    return filtered.map(link => ({
      Title: link.name,
      SubTitle: link.url,
      Icon: { ImageType: "emoji", ImageData: "🔗" },
      Actions: [
        {
          Id: `open-${link.name}`,
          Name: "Open in Browser",
          IsDefault: true,
          Action: async (actionCtx: Context, _actionContext: ActionContext) => {
            await api.HideApp(actionCtx)
            openUrl(link.url)
          }
        }
      ]
    }))
  }
}
