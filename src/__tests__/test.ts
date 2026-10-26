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

function makeApi(linksJson: string, onSave?: (key: string, value: string) => void, pinyinSetting = ""): PublicAPI {
  return {
    Log: (_ctx: Context, level: string, message: string) => console.log(level, message),
    GetSetting: async (_ctx: Context, key: string) => (key === "links" ? linksJson : key === "enablePinyin" ? pinyinSetting : ""),
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
  await action.Action(ctx, { ResultId: "test", ResultActionId: "add", ContextData: {} })
  const parsed = JSON.parse(saved)
  expect(parsed).toContainEqual({ name: "GitHub", url: "https://github.com" })
})

test.each([
  ["记事本", "jishi"],
  ["记事本", "jishiben"],
  ["记事本", "js"],
  ["记事本", "jsb"],
  ["记事本", "JISHI"],
  ["记事本", "jis"],
  ["记事本", "记shi"],
  ["记事本", "shiben"],
  ["记事本", "ji shi"],
  ["GitHub文档", "githubwd"],
  ["重庆银行", "chongqing"],
  ["重庆银行", "yinhang"],
  ["吕布", "lvbu"]
])("matches %s using %s", async (name, search) => {
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(JSON.stringify([{ name, url: "https://example.com" }])) })
  const results = await plugin.query(ctx, { ...baseQuery, Search: search })
  expect(results.map(result => result.Title)).toEqual([name])
})

test.each(["xyz", "jz", "jiben", "shiji"])("rejects unrelated or non-contiguous pinyin: %s", async search => {
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(JSON.stringify([{ name: "记事本", url: "https://example.com" }])) })
  const results = await plugin.query(ctx, { ...baseQuery, Search: search })
  expect(results[0].Title).toContain("No links matching")
})

test("preserves literal matching for Chinese and English names", async () => {
  const linksJson = JSON.stringify([
    { name: "记事本", url: "https://example.com" },
    { name: "GitHub", url: "https://github.com" }
  ])
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(linksJson) })
  expect((await plugin.query(ctx, { ...baseQuery, Search: "记事本" }))[0].Title).toBe("记事本")
  expect((await plugin.query(ctx, { ...baseQuery, Search: "GIT" }))[0].Title).toBe("GitHub")
  expect((await plugin.query(ctx, { ...baseQuery, Search: "gh" }))[0].Title).toContain("No links matching")
})

test("supports pinyin when routed as a global query", async () => {
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(JSON.stringify([{ name: "记事本", url: "https://example.com" }])) })
  const results = await plugin.query(ctx, { ...baseQuery, Search: "jishi", TriggerKeyword: "", IsGlobalQuery: () => true })
  expect(results[0].Title).toBe("记事本")
})

test("preserves placeholder arguments instead of interpreting them as pinyin", async () => {
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(JSON.stringify([{ name: "搜索", url: "https://example.com?q={}" }])) })
  const results = await plugin.query(ctx, { ...baseQuery, Search: "搜索 cats and dogs" })
  expect(results[0].Title).toBe("搜索")
  expect(results[0].SubTitle).toBe("https://example.com?q=cats and dogs")
})

test("finds links by pinyin immediately after adding them", async () => {
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi("[]") })
  const results = await plugin.query(ctx, { ...addQuery, Search: "记事本 https://example.com" })
  const action = results[0].Actions![0]
  if (!("Action" in action)) throw new Error("Expected an executable save action")
  await action.Action(ctx, { ResultId: "test", ResultActionId: "add", ContextData: {} })
  expect((await plugin.query(ctx, { ...baseQuery, Search: "jishi" }))[0].Title).toBe("记事本")
})

test("uses renamed links after settings change", async () => {
  const api = makeApi(JSON.stringify([{ name: "记事本", url: "https://example.com" }]))
  let onChanged!: Parameters<PublicAPI["OnSettingChanged"]>[1]
  api.OnSettingChanged = async (_ctx, callback) => {
    onChanged = callback
  }
  await plugin.init(ctx, { PluginDirectory: "", API: api })
  await onChanged(ctx, "links", JSON.stringify([{ name: "百度", url: "https://example.com" }]))
  expect((await plugin.query(ctx, { ...baseQuery, Search: "baidu" }))[0].Title).toBe("百度")
  expect((await plugin.query(ctx, { ...baseQuery, Search: "jishi" }))[0].Title).toContain("No links matching")
})

test.each(["false", " FALSE "])("disables pinyin using persisted setting %s without changing literal searches", async setting => {
  const linksJson = JSON.stringify([{ name: "记事本", url: "https://example.com" }])
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(linksJson, undefined, setting) })
  expect((await plugin.query(ctx, { ...baseQuery, Search: "jishi" }))[0].Title).toContain("No links matching")
  expect((await plugin.query(ctx, { ...baseQuery, Search: "js" }))[0].Title).toContain("No links matching")
  expect((await plugin.query(ctx, { ...baseQuery, Search: "记事本" }))[0].Title).toBe("记事本")
  expect((await plugin.query(ctx, { ...baseQuery, Search: "example.com" }))[0].Title).toBe("记事本")
})

test.each(["", "true"])("enables pinyin on initialization with setting %s, including after a disabled session", async setting => {
  const linksJson = JSON.stringify([{ name: "记事本", url: "https://example.com" }])
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(linksJson, undefined, "false") })
  await plugin.init(ctx, { PluginDirectory: "", API: makeApi(linksJson, undefined, setting) })
  expect((await plugin.query(ctx, { ...baseQuery, Search: "jishi" }))[0].Title).toBe("记事本")
})

test("applies pinyin setting changes immediately and ignores unrelated settings", async () => {
  const api = makeApi(JSON.stringify([{ name: "记事本", url: "https://example.com" }]))
  let onChanged!: Parameters<PublicAPI["OnSettingChanged"]>[1]
  api.OnSettingChanged = async (_ctx, callback) => {
    onChanged = callback
  }
  await plugin.init(ctx, { PluginDirectory: "", API: api })
  await onChanged(ctx, "unrelated", "false")
  expect((await plugin.query(ctx, { ...baseQuery, Search: "jishi" }))[0].Title).toBe("记事本")
  await onChanged(ctx, "enablePinyin", "false")
  expect((await plugin.query(ctx, { ...baseQuery, Search: "jishi" }))[0].Title).toContain("No links matching")
  await onChanged(ctx, "enablePinyin", "true")
  expect((await plugin.query(ctx, { ...baseQuery, Search: "jishi" }))[0].Title).toBe("记事本")
})
