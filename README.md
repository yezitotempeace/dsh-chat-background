# dsh-chat-background

**[中文](README.md) | [English](README.en.md)**

给 DSH Web 界面换背景：**本地图片**、**本地视频**或内置**预设渐变**；右下角悬浮小圆钮点开就是调节面板。

图片和视频只存进浏览器 IndexedDB，设置只写 localStorage，**不发起任何网络请求，也不读取聊天内容**。

## 能调什么

| 控件 | 作用 |
| --- | --- |
| 选择图片 / 视频 | 从相册/文件里选 JPG / PNG / WebP / GIF 或 MP4 / WebM / MOV |
| 预设背景 | **12 套渐变**，每套都有浅色与深色两种画法，随界面主题自动切换：晨雾、海盐、蜜桃、青提、极光、晚霞、深海、樱花、薰衣草、暖沙、夜色、墨岩 |
| 清晰度 | 0–100%，越低越朦胧（映射到 0–14px 模糊） |
| 背景透明度 | 背景图自身的透明度 |
| 界面不透明度 | 界面底色透出多少背景 |
| 对话栏不透明度 | 输入框卡片与用户气泡的透明程度（默认 90%） |
| 亮度 / 对比度 / 饱和度 | 背景图的色彩调节 |
| 缩放 / 水平位置 / 垂直位置 | 自定义构图，适合人像或大图 |
| 遮罩 | 深色主题压一层黑、浅色主题压一层淡白雾（强度减半），保证文字可读 |
| 显示方式 | 铺满 / 适应 / 平铺 |
| 动效 | 静态 / 漂浮 / 缓慢呼吸（系统“减少动态效果”时自动关闭） |
| 视频自动播放 | 循环播放；关闭后停在第一帧（省电） |
| 玻璃质感面板 | 侧边栏、卡片、浮层变半透明玻璃 |
| 启用背景美化 | 一键开/关，关闭即恢复原界面 |

右下角圆钮可上下拖动并记住位置；`Esc` 或点面板外关闭；刷新后设置仍在。

## 浅色主题为什么不糊

浅色界面的「界面不透明度」如果和深色一样压满，白色底会把渐变糊成一张灰白纸。所以底色分成三层：

- **底色随主题和预设走**：每套预设自带一对底色（tintLight / tintDark），浅色用带一点点色相的冷白，不再是一块中性灰；
- **浅色只用 55% 的强度**：`界面不透明度` 在浅色下按 0.55 缩放，颜色能透出来，文字对比度仍在 15:1 以上；
- **底色是竖向渐变而不是平铺**：顶部 58%、中部满、底部再加一点，画面有纵深；
- **遮罩的颜色跟着主题**：浅色下是白色薄雾、强度减半，深色下仍是黑色。

12 套预设都做了浅色/深色两套画法，切主题不需要手动改。


## 文件

```
package.json        插件清单：bundle patch + dsh.client（web）
cordis.patch.yml    宿主 Loader 行：id=chat-background
lib/index.js        宿主半边（空 apply，只为占一行）
lib/client.js       浏览器半边：背景层 + 悬浮按钮 + 调节面板（纯 DOM）
```

## 原理

- 浏览器半边在 `body` 里插入四层固定定位元素：壁纸 `#dshbg-image` / 视频 `#dshbg-video`、暗色遮罩 `#dshbg-veil`、界面底色 `#dshbg-tint`，z-index 为负，位于应用内容之下；视频用 `<video muted loop playsinline>`。
- 启用时给 `body` 加 `data-dshbg="on"`，把 `--dsw-alias-bg-base` 改成透明，聊天画布就透出壁纸；界面底色由 `#dshbg-tint` 用 `color-mix()` 按“界面不透明度”合成。
- `render()` 读 `body[data-ds-dark-theme]` 判断主题，再取预设的 `css/cssDark` 与 `tintLight/tintDark`；主题切换由 `MutationObserver` 监听该属性，不需要刷新。
- 玻璃模式再覆盖 `--dsw-specific-sidebar-fill` 与 `--dsw-alias-bg-layer-1/2/3`。
- 所有 DOM 都在 `ctx.effect` 里挂载，插件停用时会完整移除，不留样式污染。

## 安装

- 仓库放进 `/root/dsh-chat-background`；
- profile 的 `dependencies` 加 `"dsh-chat-background": "link:/root/dsh-chat-background"`，`dsh.profile.bundles` 加 `dsh-chat-background`；
- 建 `node_modules/dsh-chat-background` 链接，重启 Web；页面没出现小圆钮就刷新一次。

## 停用 / 卸载

1. 从 `dsh.profile.bundles` 删掉 `dsh-chat-background`（或在 profile 的 `cordis.patch.yml` 里加一条 `disabled: true`）；
2. 重启 Web，之后可删软链与本目录；
3. 想连设置一起清掉：控制台执行 `localStorage.removeItem('dsh-chat-background:state:v1')`，并删除 IndexedDB 库 `dsh-chat-background`。
