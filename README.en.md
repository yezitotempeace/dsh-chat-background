# dsh-chat-background

**[中文](README.md) | [English](README.en.md)**

Change the DSH web UI background: use a **local image**, a **local video**, or one of the built-in **preset gradients**. A small floating button in the bottom-right corner opens the adjustment panel.

Images and videos are stored only in the browser's IndexedDB, settings only in localStorage — the plugin makes **no network requests and never reads chat content**.

## What you can adjust

| Control | Effect |
| --- | --- |
| Pick image / video | Choose JPG / PNG / WebP / GIF or MP4 / WebM / MOV from your gallery or files |
| Preset backgrounds | Six gradients: morning mist, sea salt, peach, green grape, night, ink rock |
| Clarity | 0–100%, lower means blurrier (mapped to 0–14px blur) |
| Background opacity | Opacity of the wallpaper itself |
| UI opacity | How much of the background shows through the UI base layer |
| Composer opacity | Transparency of the input card and user bubbles (default 90%) |
| Brightness / contrast / saturation | Color adjustments for the background |
| Zoom / horizontal / vertical position | Custom framing for portraits or large images |
| Dark veil | Dark layer over the background to keep text readable |
| Fit mode | Cover / contain / tile |
| Motion | Static / drift / slow breathing (auto-disabled when the OS prefers reduced motion) |
| Video autoplay | Loop the video; when off it stops on the first frame (saves power) |
| Glass panels | Sidebar, cards and popovers become translucent glass |
| Enable background | One switch; turning it off restores the original UI |

The bottom-right button can be dragged up/down and remembers its position; `Esc` or a click outside closes the panel; settings survive a page refresh.

## Files

```
package.json        plugin manifest: bundle patch + dsh.client (web)
cordis.patch.yml    host loader row: id=chat-background
lib/index.js        host half (empty apply, exists to occupy the row)
lib/client.js       browser half: background layers + floating button + panel (plain DOM)
```

## How it works

- The browser half inserts four fixed-position layers into `body`: wallpaper `#dshbg-image` / video `#dshbg-video`, dark veil `#dshbg-veil`, and a UI tint `#dshbg-tint`, all with negative z-index below the app content; video uses `<video muted loop playsinline>`.
- When enabled it sets `data-dshbg="on"` on `body` and makes `--dsw-alias-bg-base` transparent so the chat canvas reveals the wallpaper; the UI tint is composed by `#dshbg-tint` with `color-mix()` according to the UI-opacity setting, so it works for both light and dark themes.
- Glass mode additionally overrides `--dsw-specific-sidebar-fill` and `--dsw-alias-bg-layer-1/2/3`.
- All DOM is mounted inside `ctx.effect`, so disabling the plugin removes everything and leaves no style pollution.

## Install

- Put the repo at `/root/dsh-chat-background`;
- add `"dsh-chat-background": "link:/root/dsh-chat-background"` to the profile `dependencies` and `dsh-chat-background` to `dsh.profile.bundles`;
- create the `node_modules/dsh-chat-background` link and restart the web app; if the floating button does not appear, refresh the page once.

## Disable / uninstall

1. Remove `dsh-chat-background` from `dsh.profile.bundles` (or add a `disabled: true` patch row in the profile `cordis.patch.yml`);
2. restart the web app, then delete the link and this directory;
3. to wipe the stored settings too: run `localStorage.removeItem('dsh-chat-background:state:v1')` in the console and delete the IndexedDB database `dsh-chat-background`.
