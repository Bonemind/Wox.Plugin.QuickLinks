# Quick Links

A [Wox](https://github.com/Wox-launcher/Wox) plugin to save and quickly open named URLs in your browser.

This repository is a fork of [Bonemind/Wox.Plugin.QuickLinks](https://github.com/Bonemind/Wox.Plugin.QuickLinks), originally created by **bonemind**.
The fork maintained by **FallingMY** adds optional pinyin search for Chinese link names. The original plugin ID and author metadata are retained for compatibility and attribution.

![screenshot](./images/screenshot.png)

## Install

Open a `.wox` package built from this fork with Wox to install the modified plugin.
The upstream store command, `wpm install quicklinks`, installs the original plugin; it does not install this fork's changes.
See [Development](#development) to build a package from source.

## Usage

| Query                        | Action                      |
| ---------------------------- | --------------------------- |
| `ql`                         | List all saved links        |
| `ql <search>`                | Filter links by name or URL |
| `ql add <name> <url>`        | Save a new link             |
| `ql <name> <arg1> <arg2>...` | Fill placeholders and open  |

Hit enter to open selected link.

Links can also be managed directly in the Wox settings UI under the Quick Links plugin.

## Pinyin search

In **Wox Settings → Plugins → Quick Links**, use **Pinyin search** (**拼音检索** in Chinese) to control this feature.
The label and tooltip follow Wox's display language through its native plugin translation mechanism, with English as the fallback.
Chinese locale entries (`zh_CN`, `zh_TW`, `zh_HK`, `zh_MO`, `zh_SG`) use Simplified Chinese text.
Current Wox releases expose `zh_CN`; the Traditional Chinese entries are included for hosts that support those locales.
It is **enabled by default**, including for existing installations without a saved value. Changes take effect immediately without restarting the plugin.
This is a plugin-specific setting, independent of Wox's global pinyin setting.

With the option enabled, a link named `雷神加速器` can be found using:

| Query                 | Matching mode                    |
| --------------------- | -------------------------------- |
| `ql leishen`          | Full pinyin for part of the name |
| `ql leishenjiasuqi`   | Full pinyin for the entire name  |
| `ql ls` or `ql lsjsq` | Pinyin initials                  |
| `ql leis`             | Syllable prefixes                |
| `ql 雷shen`           | Mixed Chinese and pinyin         |

Matching is case-insensitive and supports polyphonic characters and `v` for `ü` (for example, `lvbu` matches `吕布`).
Matched characters must be consecutive in the link name; arbitrary typos and skipped characters are not matched.
The original name/URL substring matching and result ordering are preserved, even when pinyin search is disabled.
Pinyin matching runs locally using the bundled [pinyin-pro](https://github.com/zh-lx/pinyin-pro) library; no network service is used for matching.

The examples use the default `ql` trigger. Substitute your configured trigger, such as `l`.
Enabling pinyin does not change the trigger keywords or automatically enable global queries.
For placeholder links, select the link using pinyin and then use **Fill & Open** to enter arguments after its original name.
Pinyin aliases followed directly by arguments are not a new invocation syntax.

中文说明：插件设置中的「拼音检索」默认开启，独立于 Wox 全局拼音设置，修改后立即生效。关闭后仍可使用原名称和 URL 搜索。名称和提示跟随 Wox 界面语言，中文使用简中文案，其他语言回退到英文。

## Placeholders

URLs can contain `{}` placeholders that are filled in at open time.

```
ql add gs https://www.google.com/search?q={}
```

When you select a link with placeholders, Quick Links switches to fill mode — type the link name followed by your arguments:

```
ql gs some search query
```

The last placeholder absorbs all remaining words. Multiple placeholders are filled positionally, with the final one capturing the rest of the input.

```
ql add gh https://github.com/{}/{}
ql gh myorg myrepo
# opens https://github.com/myorg/myrepo
```

Selecting a placeholder link from the list shows a **Fill & Open** action (pre-fills the query so you can type arguments) and an **Open as-is** action (opens the URL with the `{}` tokens unfilled).

## Development

Use Node.js 20 or later and pnpm. Install the locked dependencies and run the checks:

```sh
pnpm install --frozen-lockfile
pnpm test -- --runInBand
pnpm exec tsc --noEmit
pnpm lint
```

On Windows, build and package from PowerShell:

```powershell
pnpm exec ncc build src/index.ts -o dist --license licenses.txt
Copy-Item -LiteralPath plugin.json -Destination dist/plugin.json
Copy-Item -LiteralPath images -Destination dist/images -Recurse
[IO.Compression.ZipFile]::CreateFromDirectory((Join-Path $PWD 'dist'), (Join-Path $PWD 'Wox.Plugin.QuickLinks.Pinyin.wox'))
```

Use a fresh `dist` directory and an output filename that does not already exist.
On Linux/macOS, the equivalent packaging steps are:

```sh
pnpm exec ncc build src/index.ts -o dist --license licenses.txt
cp plugin.json dist/
cp -r images dist/
(cd dist && zip -r ../Wox.Plugin.QuickLinks.Pinyin.wox index.js plugin.json licenses.txt images)
```

The bundle includes the pinyin dependency and its license; do not commit `dist`, `node_modules`, or generated `.wox` packages.
Plugin version numbers remain aligned with the upstream baseline until a separate fork release is prepared.
