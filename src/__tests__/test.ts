import { Context, PublicAPI, Query, WoxImage } from "@wox-launcher/wox-plugin"
import { plugin } from "../index"

const ctx = {} as Context
const baseQuery: Query = {
  Id: "1",
  Env: { ActiveWindowTitle: "", ActiveWindowPid: 0, ActiveBrowserUrl: "", ActiveWindowIcon: {} as WoxImage },
  RawQuery: "ql ",
  Selection: { Type: "text", Text: "", FilePaths: [] },
  Type: "input",
  Search: "",
  TriggerKeyword: "ql",
  Command: "",
  IsGlobalQuery(): boolean {
    return false
  }
}

function makeApi(linksJson: string, onSave?: (key: string, value: string) => void): PublicAPI {
  return {
    Log: (_ctx: Context, level: string, message: string) => console.log(level, message),
    GetSetting: async (_ctx: Context, key: string) => (key === "links" ? linksJson : ""),
    OnSettingChanged: async () => {},
    SaveSetting: async (_ctx: Context, key: string, value: string) => {
      onSave?.(key, value)
    },
    Notify: async () => {},
    HideApp: async () => {}
  } as unknown as PublicAPI
}

const addQuery: Query = {
  ...baseQuery,
  RawQuery: "ql add",
  Command: "add",
  TriggerKeyword: "ql",
  Search: ""
}

test("shows placeholder when no links configured", async () => {
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi("[]") })
  const results = await plugin.query(ctx, { ...baseQuery, Search: "" })
  expect(results).toHaveLength(1)
  expect(results[0].Title).toBe("No links configured")
})

test("returns all links when search is empty", async () => {
  const linksJson = JSON.stringify([
    { name: "GitHub", url: "https://github.com" },
    { name: "Google", url: "https://google.com" }
  ])
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(linksJson) })
  const results = await plugin.query(ctx, { ...baseQuery, Search: "" })
  expect(results).toHaveLength(2)
})

test("filters links by name", async () => {
  const linksJson = JSON.stringify([
    { name: "GitHub", url: "https://github.com" },
    { name: "Google", url: "https://google.com" }
  ])
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(linksJson) })
  const results = await plugin.query(ctx, { ...baseQuery, Search: "git" })
  expect(results).toHaveLength(1)
  expect(results[0].Title).toBe("GitHub")
})

test("filters links by url", async () => {
  const linksJson = JSON.stringify([
    { name: "GitHub", url: "https://github.com" },
    { name: "Google", url: "https://google.com" }
  ])
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(linksJson) })
  const results = await plugin.query(ctx, { ...baseQuery, Search: "google.com" })
  expect(results).toHaveLength(1)
  expect(results[0].Title).toBe("Google")
})

test("shows no match message for unmatched search", async () => {
  const linksJson = JSON.stringify([{ name: "GitHub", url: "https://github.com" }])
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(linksJson) })
  const results = await plugin.query(ctx, { ...baseQuery, Search: "xyz" })
  expect(results).toHaveLength(1)
  expect(results[0].Title).toContain("No links matching")
})

test("add command: shows usage when search is empty", async () => {
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi("[]") })
  const results = await plugin.query(ctx, { ...addQuery, Search: "" })
  expect(results).toHaveLength(1)
  expect(results[0].Title).toBe("Add Quick Link")
})

test("add command: prompts for url when only name given", async () => {
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi("[]") })
  const results = await plugin.query(ctx, { ...addQuery, Search: "GitHub" })
  expect(results).toHaveLength(1)
  expect(results[0].Title).toBe('Add "GitHub"')
  expect(results[0].Actions).toHaveLength(0)
})

test("add command: shows save action when name and url given", async () => {
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi("[]") })
  const results = await plugin.query(ctx, { ...addQuery, Search: "GitHub https://github.com" })
  expect(results).toHaveLength(1)
  expect(results[0].Title).toBe('Add "GitHub"')
  expect(results[0].SubTitle).toBe("https://github.com")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = results[0] as any
  expect(result.Actions).toHaveLength(1)
  expect(result.Actions[0].Id).toBe("add")
})

test("add command: saves link on action", async () => {
  let saved = ""
  await plugin.init(ctx, {
    PluginDirectory: "",
    API: makeApi("[]", (_key, value) => {
      saved = value
    })
  })
  const results = await plugin.query(ctx, { ...addQuery, Search: "GitHub https://github.com" })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const action = (results[0] as any).Actions[0]
  await action.Action(ctx, {})
  const parsed = JSON.parse(saved)
  expect(parsed).toContainEqual({ name: "GitHub", url: "https://github.com" })
})
