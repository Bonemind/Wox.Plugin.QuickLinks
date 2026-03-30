# Quick Links

A [Wox](https://github.com/Wox-launcher/Wox) plugin to save and quickly open named URLs in your browser.

![screenshot](./images/screenshot.png)

## Install

```
wpm install quicklinks
```

## Usage

| Query                        | Action                      |
| ---------------------------- | --------------------------- |
| `ql`                         | List all saved links        |
| `ql <search>`                | Filter links by name or URL |
| `ql add <name> <url>`        | Save a new link             |
| `ql <name> <arg1> <arg2>...` | Fill placeholders and open  |

Hit enter to open selected link.

Links can also be managed directly in the Wox settings UI under the Quick Links plugin.

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
