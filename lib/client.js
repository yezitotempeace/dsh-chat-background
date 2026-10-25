window.__ModuleLoader__.load({
	id: "dsh-chat-background",
	factory: (require) => {
		"use strict";

		const module = { exports: {} };
		const exports = module.exports;

		/* ------------------------------------------------------------------ *
		 * dsh-chat-background — 浏览器半边
		 *
		 * 纯 DOM 实现（不占用任何 slot），因此不会和现有界面注册冲突：
		 *  - 在 body 最底层插入「壁纸 / 暗色遮罩 / 界面底色」三层；
		 *  - 把 --dsw-alias-bg-base 改成透明，让壁纸从聊天画布透出来；
		 *  - 右下角一个小圆钮，点开是完整的调节面板；
		 *  - 设置存 localStorage，图片存 IndexedDB（只在本机，不上传）。
		 * ------------------------------------------------------------------ */

		const PLUGIN_ID = "dsh-chat-background";
		const STORAGE_KEY = "dsh-chat-background:state:v1";
		const DB_NAME = "dsh-chat-background";
		const DB_STORE = "images";
		const DB_VERSION = 1;
		const ACCENT = "#4176e6";

		/**
		 * 预设背景：没有本地图片时使用。
		 *
		 * 每套预设同时给出浅色（css）与深色（cssDark）两种画法，外加与画面对应的
		 * 底色（tintLight / tintDark）。`render()` 按当前主题挑一套，这样白天不会
		 * 再把浅色渐变糊成一片灰白，夜里也能保住通透感。
		 */
		const PRESETS = [
			{
				id: "mist",
				name: "晨雾",
				tintLight: "#f7f9fd",
				tintDark: "#0e1420",
				css: "radial-gradient(90% 70% at 12% 4%, rgba(255,255,255,.98) 0%, rgba(255,255,255,0) 58%), radial-gradient(70% 60% at 88% 12%, rgba(158,200,250,.92) 0%, rgba(158,200,250,0) 62%), radial-gradient(80% 70% at 62% 100%, rgba(255,206,228,.75) 0%, rgba(255,206,228,0) 60%), linear-gradient(165deg, #e2eefb 0%, #cbdff3 48%, #b0cde8 100%)",
				cssDark: "radial-gradient(90% 70% at 12% 4%, rgba(84,128,196,.42) 0%, rgba(84,128,196,0) 60%), radial-gradient(70% 60% at 88% 14%, rgba(60,102,158,.34) 0%, rgba(60,102,158,0) 62%), linear-gradient(165deg, #0b1119 0%, #070b11 100%)"
			},
			{
				id: "sea",
				name: "海盐",
				tintLight: "#f4fbfe",
				tintDark: "#08161c",
				css: "radial-gradient(80% 60% at 88% 6%, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 58%), radial-gradient(75% 60% at 8% 90%, rgba(120,203,228,.75) 0%, rgba(120,203,228,0) 62%), linear-gradient(158deg, #def3fb 0%, #bfe4f2 50%, #9fd3e8 100%)",
				cssDark: "radial-gradient(80% 60% at 88% 6%, rgba(38,120,150,.45) 0%, rgba(38,120,150,0) 62%), radial-gradient(75% 60% at 8% 92%, rgba(20,86,110,.4) 0%, rgba(20,86,110,0) 62%), linear-gradient(158deg, #07141a 0%, #041017 100%)"
			},
			{
				id: "peach",
				name: "蜜桃",
				tintLight: "#fff8f4",
				tintDark: "#1a0f0c",
				css: "radial-gradient(80% 60% at 14% 6%, rgba(255,255,255,.96) 0%, rgba(255,255,255,0) 56%), radial-gradient(75% 65% at 88% 22%, rgba(255,178,146,.78) 0%, rgba(255,178,146,0) 64%), radial-gradient(90% 70% at 40% 100%, rgba(255,145,128,.65) 0%, rgba(255,145,128,0) 62%), linear-gradient(150deg, #fff0e6 0%, #ffd9c8 55%, #ffc2b0 100%)",
				cssDark: "radial-gradient(75% 65% at 88% 20%, rgba(168,74,54,.42) 0%, rgba(168,74,54,0) 62%), radial-gradient(90% 70% at 30% 100%, rgba(120,44,38,.4) 0%, rgba(120,44,38,0) 62%), linear-gradient(150deg, #14100f 0%, #0b0808 100%)"
			},
			{
				id: "matcha",
				name: "青提",
				tintLight: "#f6fcf8",
				tintDark: "#0a1410",
				css: "radial-gradient(80% 60% at 86% 8%, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 58%), radial-gradient(75% 60% at 10% 88%, rgba(150,214,168,.78) 0%, rgba(150,214,168,0) 64%), linear-gradient(155deg, #e6f8ec 0%, #ccecd8 55%, #aeddc0 100%)",
				cssDark: "radial-gradient(80% 60% at 86% 8%, rgba(46,110,74,.42) 0%, rgba(46,110,74,0) 62%), radial-gradient(75% 60% at 10% 90%, rgba(28,80,58,.4) 0%, rgba(28,80,58,0) 62%), linear-gradient(155deg, #08120d 0%, #050c09 100%)"
			},
			{
				id: "aurora",
				name: "极光",
				tintLight: "#f3fbfb",
				tintDark: "#060f14",
				css: "radial-gradient(70% 55% at 18% 6%, rgba(186,255,232,.95) 0%, rgba(186,255,232,0) 60%), radial-gradient(65% 55% at 82% 14%, rgba(170,212,255,.9) 0%, rgba(170,212,255,0) 62%), radial-gradient(80% 65% at 50% 100%, rgba(210,186,255,.7) 0%, rgba(210,186,255,0) 62%), linear-gradient(150deg, #e6faf7 0%, #d5ecfb 50%, #d6d6f8 100%)",
				cssDark: "radial-gradient(60% 50% at 20% 8%, rgba(52,224,178,.34) 0%, rgba(52,224,178,0) 62%), radial-gradient(55% 50% at 80% 16%, rgba(96,140,255,.34) 0%, rgba(96,140,255,0) 62%), radial-gradient(70% 60% at 52% 100%, rgba(150,86,240,.3) 0%, rgba(150,86,240,0) 64%), linear-gradient(150deg, #071118 0%, #040a10 100%)"
			},
			{
				id: "sunset",
				name: "晚霞",
				tintLight: "#fff7f2",
				tintDark: "#170d12",
				css: "radial-gradient(70% 55% at 82% 8%, rgba(255,226,178,.98) 0%, rgba(255,226,178,0) 56%), radial-gradient(65% 55% at 14% 20%, rgba(255,166,166,.9) 0%, rgba(255,166,166,0) 60%), radial-gradient(90% 70% at 48% 100%, rgba(208,150,232,.8) 0%, rgba(208,150,232,0) 66%), linear-gradient(155deg, #ffe9d2 0%, #ffc9c6 44%, #e3aee0 100%)",
				cssDark: "radial-gradient(65% 50% at 84% 8%, rgba(226,120,58,.42) 0%, rgba(226,120,58,0) 62%), radial-gradient(60% 50% at 12% 20%, rgba(196,72,96,.4) 0%, rgba(196,72,96,0) 62%), radial-gradient(85% 60% at 50% 100%, rgba(110,54,150,.42) 0%, rgba(110,54,150,0) 66%), linear-gradient(155deg, #150f14 0%, #0b070c 100%)"
			},
			{
				id: "ocean",
				name: "深海",
				tintLight: "#f1fafb",
				tintDark: "#04121a",
				css: "radial-gradient(70% 55% at 16% 8%, rgba(178,240,255,.95) 0%, rgba(178,240,255,0) 60%), radial-gradient(65% 55% at 86% 22%, rgba(140,196,232,.85) 0%, rgba(140,196,232,0) 62%), linear-gradient(160deg, #e2f6fb 0%, #c2e2f2 50%, #a2cfe8 100%)",
				cssDark: "radial-gradient(65% 55% at 16% 8%, rgba(26,134,160,.44) 0%, rgba(26,134,160,0) 62%), radial-gradient(60% 55% at 86% 24%, rgba(30,74,150,.46) 0%, rgba(30,74,150,0) 64%), linear-gradient(160deg, #041018 0%, #020a12 100%)"
			},
			{
				id: "sakura",
				name: "樱花",
				tintLight: "#fff6fa",
				tintDark: "#170d14",
				css: "radial-gradient(70% 55% at 20% 6%, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 56%), radial-gradient(65% 55% at 84% 18%, rgba(255,182,212,.85) 0%, rgba(255,182,212,0) 62%), radial-gradient(85% 65% at 50% 100%, rgba(212,186,255,.7) 0%, rgba(212,186,255,0) 64%), linear-gradient(155deg, #fff0f5 0%, #ffd9e6 52%, #f2c6dd 100%)",
				cssDark: "radial-gradient(65% 55% at 84% 16%, rgba(198,84,132,.38) 0%, rgba(198,84,132,0) 62%), radial-gradient(85% 65% at 40% 100%, rgba(110,66,150,.38) 0%, rgba(110,66,150,0) 66%), linear-gradient(155deg, #140d12 0%, #0a0709 100%)"
			},
			{
				id: "lavender",
				name: "薰衣草",
				tintLight: "#f8f7ff",
				tintDark: "#0e0d1a",
				css: "radial-gradient(70% 55% at 18% 8%, rgba(240,234,255,.98) 0%, rgba(240,234,255,0) 58%), radial-gradient(65% 55% at 84% 20%, rgba(182,178,255,.85) 0%, rgba(182,178,255,0) 62%), linear-gradient(158deg, #eeecff 0%, #d9d6f8 52%, #c4c1f0 100%)",
				cssDark: "radial-gradient(65% 55% at 18% 8%, rgba(120,104,214,.4) 0%, rgba(120,104,214,0) 62%), radial-gradient(60% 55% at 84% 22%, rgba(74,80,168,.42) 0%, rgba(74,80,168,0) 64%), linear-gradient(158deg, #0d0c18 0%, #07060f 100%)"
			},
			{
				id: "sand",
				name: "暖沙",
				tintLight: "#fdf9f2",
				tintDark: "#14100a",
				css: "radial-gradient(70% 55% at 84% 4%, rgba(255,252,236,.98) 0%, rgba(255,252,236,0) 56%), radial-gradient(75% 65% at 12% 92%, rgba(214,176,112,.85) 0%, rgba(214,176,112,0) 66%), linear-gradient(158deg, #fdf4e0 0%, #eed9b2 52%, #d9bb8c 100%)",
				cssDark: "radial-gradient(65% 55% at 84% 8%, rgba(158,116,56,.4) 0%, rgba(158,116,56,0) 62%), radial-gradient(70% 60% at 12% 90%, rgba(104,74,38,.42) 0%, rgba(104,74,38,0) 64%), linear-gradient(158deg, #12100c 0%, #0a0806 100%)"
			},
			{
				id: "night",
				name: "夜色",
				tintLight: "#eef2f9",
				tintDark: "#0a1020",
				css: "radial-gradient(75% 60% at 16% 6%, rgba(255,255,255,.9) 0%, rgba(255,255,255,0) 58%), radial-gradient(70% 60% at 86% 90%, rgba(160,190,238,.8) 0%, rgba(160,190,238,0) 64%), linear-gradient(160deg, #e6eefa 0%, #cfdcf2 52%, #b3c6e8 100%)",
				cssDark: "radial-gradient(80% 65% at 18% 4%, rgba(46,86,158,.5) 0%, rgba(46,86,158,0) 62%), radial-gradient(70% 60% at 88% 92%, rgba(22,74,92,.45) 0%, rgba(22,74,92,0) 62%), linear-gradient(160deg, #080d18 0%, #04070d 100%)"
			},
			{
				id: "ink",
				name: "墨岩",
				tintLight: "#f5f6f8",
				tintDark: "#0c0d10",
				css: "radial-gradient(70% 55% at 84% 6%, rgba(255,255,255,.96) 0%, rgba(255,255,255,0) 56%), radial-gradient(75% 60% at 14% 92%, rgba(158,172,194,.85) 0%, rgba(158,172,194,0) 64%), linear-gradient(160deg, #eaeef5 0%, #d3dae5 52%, #b8c2d2 100%)",
				cssDark: "radial-gradient(80% 65% at 82% 6%, rgba(96,104,124,.36) 0%, rgba(96,104,124,0) 62%), radial-gradient(75% 60% at 12% 94%, rgba(58,64,78,.4) 0%, rgba(58,64,78,0) 64%), linear-gradient(160deg, #101216 0%, #08090c 100%)"
			}
		];

		/** 面板里的滑杆定义。invert 只影响文案提示。 */
		const SLIDERS = [
			{ key: "clarity", label: "清晰度", min: 0, max: 100, step: 1, unit: "%", hint: "越低越朦胧" },
			{ key: "imageOpacity", label: "背景透明度", min: 0, max: 100, step: 1, unit: "%" },
			{ key: "uiOpacity", label: "界面不透明度", min: 0, max: 100, step: 1, unit: "%", hint: "让界面透出多少背景" },
			{ key: "chatAlpha", label: "对话栏不透明度", min: 20, max: 100, step: 1, unit: "%", hint: "输入框与气泡，100 为实心" },
			{ key: "brightness", label: "亮度", min: 40, max: 160, step: 1, unit: "%" },
			{ key: "contrast", label: "对比度", min: 50, max: 150, step: 1, unit: "%" },
			{ key: "saturate", label: "饱和度", min: 0, max: 200, step: 1, unit: "%" },
			{ key: "zoom", label: "缩放", min: 100, max: 200, step: 1, unit: "%" },
			{ key: "posX", label: "水平位置", min: 0, max: 100, step: 1, unit: "%" },
			{ key: "posY", label: "垂直位置", min: 0, max: 100, step: 1, unit: "%" },
			{ key: "veil", label: "暗色遮罩", min: 0, max: 80, step: 1, unit: "%" }
		];

		const DEFAULTS = {
			active: false,
			preset: "mist",
			imageId: null,
			imageName: "",
			videoId: null,
			videoName: "",
			clarity: 84,
			imageOpacity: 100,
			uiOpacity: 78,
			chatAlpha: 90,
			brightness: 100,
			contrast: 104,
			saturate: 110,
			zoom: 100,
			posX: 50,
			posY: 50,
			veil: 10,
			fill: "cover",
			motion: "none",
			glass: true,
			videoPlay: true,
			fabTop: 46,
			seen: false
		};

		const ICON_IMAGE =
			'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
			'<rect x="3" y="4.5" width="18" height="15" rx="3.2"></rect>' +
			'<circle cx="8.6" cy="9.7" r="1.5"></circle>' +
			'<path d="M20.6 15.2 16.4 11 6 20.2"></path></svg>';

		/* ----------------------------- 工具 ----------------------------- */

		function clamp(n, lo, hi) {
			n = Number(n);
			if (!isFinite(n)) n = lo;
			return Math.min(hi, Math.max(lo, n));
		}

		function prefersReducedMotion() {
			try {
				return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
			} catch (e) {
				return false;
			}
		}

		/* ----------------------------- 状态 ----------------------------- */

		function loadState() {
			const state = Object.assign({}, DEFAULTS);
			try {
				const raw = localStorage.getItem(STORAGE_KEY);
				if (!raw) return state;
				const saved = JSON.parse(raw);
				if (!saved || typeof saved !== "object") return state;
				Object.keys(DEFAULTS).forEach((key) => {
					if (!(key in saved)) return;
					const fallback = DEFAULTS[key];
					const value = saved[key];
					if (typeof fallback === "number") {
						if (typeof value === "number" && isFinite(value)) state[key] = value;
					} else if (typeof fallback === "boolean") {
						if (typeof value === "boolean") state[key] = value;
					} else if (typeof fallback === "string") {
						if (typeof value === "string") state[key] = value;
					} else if (fallback === null) {
						state[key] = typeof value === "string" ? value : null;
					}
				});
			} catch (e) {
				/* 损坏的存档直接回到默认值 */
			}
			if (!PRESETS.some((p) => p.id === state.preset)) state.preset = DEFAULTS.preset;
			if (!["cover", "contain", "tile"].includes(state.fill)) state.fill = DEFAULTS.fill;
			if (!["none", "float", "breath"].includes(state.motion)) state.motion = DEFAULTS.motion;
			state.clarity = clamp(state.clarity, 0, 100);
			state.imageOpacity = clamp(state.imageOpacity, 0, 100);
			state.uiOpacity = clamp(state.uiOpacity, 0, 100);
			state.chatAlpha = clamp(state.chatAlpha, 20, 100);
			state.brightness = clamp(state.brightness, 40, 160);
			state.contrast = clamp(state.contrast, 50, 150);
			state.saturate = clamp(state.saturate, 0, 200);
			state.zoom = clamp(state.zoom, 100, 200);
			state.posX = clamp(state.posX, 0, 100);
			state.posY = clamp(state.posY, 0, 100);
			state.veil = clamp(state.veil, 0, 80);
			state.fabTop = clamp(state.fabTop, 8, 92);
			return state;
		}

		const state = loadState();

		let saveTimer = 0;
		function saveNow() {
			try {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
			} catch (e) {
				/* 隐私模式等场景忽略 */
			}
		}
		function saveSoon() {
			clearTimeout(saveTimer);
			saveTimer = setTimeout(saveNow, 160);
		}

		/* --------------------------- IndexedDB --------------------------- */

		let dbPromise = null;
		function openDB() {
			if (dbPromise) return dbPromise;
			dbPromise = new Promise((resolve, reject) => {
				if (!window.indexedDB) {
					reject(new Error("IndexedDB 不可用"));
					return;
				}
				const request = indexedDB.open(DB_NAME, DB_VERSION);
				request.onupgradeneeded = () => {
					const db = request.result;
					if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
				};
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => reject(request.error || new Error("IndexedDB 打开失败"));
				request.onblocked = () => reject(new Error("IndexedDB 被占用"));
			});
			return dbPromise;
		}

		function idbRequest(mode, run) {
			return openDB().then(
				(db) =>
					new Promise((resolve, reject) => {
						const tx = db.transaction(DB_STORE, mode);
						const store = tx.objectStore(DB_STORE);
						let request;
						try {
							request = run(store);
						} catch (e) {
							reject(e);
							return;
						}
						tx.oncomplete = () => resolve(request ? request.result : undefined);
						tx.onerror = () => reject(tx.error || new Error("IndexedDB 操作失败"));
						tx.onabort = () => reject(tx.error || new Error("IndexedDB 操作中止"));
					})
			);
		}

		function idbPut(key, value) {
			return idbRequest("readwrite", (store) => store.put(value, key));
		}
		function idbGet(key) {
			return idbRequest("readonly", (store) => store.get(key));
		}
		function idbDelete(key) {
			return idbRequest("readwrite", (store) => store.delete(key));
		}

		/* ----------------------------- 样式 ----------------------------- */

		const CSS = `
#dshbg-image,#dshbg-video,#dshbg-veil,#dshbg-tint{position:fixed;inset:0;pointer-events:none}
#dshbg-image{inset:-64px;z-index:-4;background-repeat:no-repeat;background-position:50% 50%;background-size:cover;
  opacity:var(--dshbg-image-opacity,1);filter:blur(var(--dshbg-blur,0px)) brightness(var(--dshbg-brightness,1)) contrast(var(--dshbg-contrast,1)) saturate(var(--dshbg-saturate,1));
  transform:scale(var(--dshbg-zoom,1));transform-origin:50% 50%;will-change:transform,filter;transition:opacity .2s ease,filter .2s ease}
#dshbg-image[data-motion="float"],#dshbg-video[data-motion="float"]{animation:dshbg-float 30s ease-in-out infinite alternate}
#dshbg-image[data-motion="breath"],#dshbg-video[data-motion="breath"]{animation:dshbg-breath 14s ease-in-out infinite alternate}
#dshbg-video{inset:-64px;z-index:-4;width:calc(100% + 128px);height:calc(100% + 128px);object-fit:cover;object-position:50% 50%;
  opacity:var(--dshbg-image-opacity,1);filter:blur(var(--dshbg-blur,0px)) brightness(var(--dshbg-brightness,1)) contrast(var(--dshbg-contrast,1)) saturate(var(--dshbg-saturate,1));
  transform:scale(var(--dshbg-zoom,1));transform-origin:50% 50%;will-change:transform,filter;transition:opacity .2s ease,filter .2s ease;display:none}
@keyframes dshbg-float{from{transform:scale(var(--dshbg-zoom,1)) translate3d(-1.4%,-.9%,0)}to{transform:scale(var(--dshbg-zoom,1)) translate3d(1.4%,.9%,0)}}
@keyframes dshbg-breath{from{transform:scale(var(--dshbg-zoom,1))}to{transform:scale(calc(var(--dshbg-zoom,1) * 1.045))}}
#dshbg-veil{z-index:-3;background:var(--dshbg-veil-color,#000);opacity:var(--dshbg-veil,0);transition:opacity .2s ease}
#dshbg-tint{z-index:-2;background:
  linear-gradient(180deg,
    color-mix(in srgb,var(--dshbg-tint-color,#fff) var(--dshbg-ui-alpha-soft,44%),transparent) 0%,
    color-mix(in srgb,var(--dshbg-tint-color,#fff) var(--dshbg-ui-alpha,78%),transparent) 58%,
    color-mix(in srgb,var(--dshbg-tint-color,#fff) var(--dshbg-ui-alpha-deep,82%),transparent) 100%);
  transition:background .2s ease}
body[data-dshbg="on"]{--dsw-alias-bg-base:transparent!important;background-color:transparent!important}
body[data-dshbg="on"] #root,body[data-dshbg="on"] #app,body[data-dshbg="on"] .dsh-app{background:transparent!important}
body[data-dshbg="on"]{--dsw-specific-input-major:color-mix(in srgb,var(--dsw-static-neutral-bluish-00) var(--dshbg-chat-alpha,90%),transparent)!important;
  --dsw-specific-bubble:color-mix(in srgb,var(--dsw-static-deepseek-50) var(--dshbg-chat-alpha,90%),transparent)!important}
body[data-ds-dark-theme][data-dshbg="on"]{--dsw-specific-input-major:color-mix(in srgb,var(--dsw-static-neutral-bluish-850) var(--dshbg-chat-alpha,90%),transparent)!important;
  --dsw-specific-bubble:color-mix(in srgb,var(--dsw-static-neutral-bluish-850) var(--dshbg-chat-alpha,90%),transparent)!important}
body[data-dshbg="on"][data-dshbg-glass="on"]{
  --dsw-specific-sidebar-fill:color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 58%,transparent)!important;
  --dsw-alias-bg-layer-1:color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 66%,transparent)!important;
  --dsw-alias-bg-layer-2:color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 56%,transparent)!important;
  --dsw-alias-bg-layer-3:color-mix(in srgb,var(--dsw-static-neutral-bluish-00) 46%,transparent)!important}
body[data-ds-dark-theme][data-dshbg="on"][data-dshbg-glass="on"]{
  --dsw-specific-sidebar-fill:color-mix(in srgb,var(--dsw-static-neutral-bluish-900) 62%,transparent)!important;
  --dsw-alias-bg-layer-1:color-mix(in srgb,var(--dsw-static-neutral-bluish-875) 80%,transparent)!important;
  --dsw-alias-bg-layer-2:color-mix(in srgb,var(--dsw-static-neutral-bluish-850) 72%,transparent)!important;
  --dsw-alias-bg-layer-3:color-mix(in srgb,var(--dsw-static-neutral-bluish-800) 64%,transparent)!important}
html.dshbg-html,body[data-dshbg="on"]{background-color:transparent}
#dshbg-fab{position:fixed;right:12px;top:46%;width:46px;height:46px;padding:0;border-radius:50%;z-index:2147483000;
  display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;touch-action:none;
  border:1px solid rgba(255,255,255,.22);background:rgba(18,20,26,.72);
  -webkit-backdrop-filter:blur(14px) saturate(150%);backdrop-filter:blur(14px) saturate(150%);
  box-shadow:0 8px 24px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.16);
  transform:translateY(-50%);transition:transform .18s ease,box-shadow .18s ease,opacity .18s ease;
  -webkit-tap-highlight-color:transparent;font:inherit}
#dshbg-fab svg{width:21px;height:21px;display:block;pointer-events:none}
#dshbg-fab:hover{transform:translateY(-50%) scale(1.06);box-shadow:0 10px 28px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.2)}
#dshbg-fab:active{transform:translateY(-50%) scale(.96)}
#dshbg-fab.is-dragging{transition:none;opacity:.92;cursor:grabbing}
#dshbg-fab.is-new::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(255,255,255,.55);animation:dshbg-ring 2.2s ease-out 3}
@keyframes dshbg-ring{0%{transform:scale(.9);opacity:.8}70%{transform:scale(1.35);opacity:0}100%{opacity:0}}
#dshbg-overlay{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;padding:24px;
  background:rgba(6,8,12,.44);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);
  opacity:0;transition:opacity .18s ease;font-family:system-ui,-apple-system,"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif}
#dshbg-overlay[hidden]{display:none!important}
#dshbg-overlay.is-open{opacity:1}
#dshbg-panel{width:min(428px,100%);max-height:min(88vh,780px);display:flex;flex-direction:column;overflow:hidden;
  border-radius:22px;border:1px solid rgba(255,255,255,.13);color:#eef1f6;
  background:linear-gradient(180deg,rgba(30,32,40,.95) 0%,rgba(16,17,22,.97) 100%);
  box-shadow:0 28px 90px rgba(0,0,0,.58),inset 0 1px 0 rgba(255,255,255,.08);
  transform:translateY(12px) scale(.98);transition:transform .2s cubic-bezier(.2,.9,.3,1)}
#dshbg-overlay.is-open #dshbg-panel{transform:none}
.dshbg-head{display:flex;align-items:center;gap:10px;padding:16px 18px 12px}
.dshbg-head-main{flex:1;min-width:0}
.dshbg-title{font-size:16px;font-weight:600;letter-spacing:.2px;display:flex;align-items:center;gap:8px}
.dshbg-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#66a0ff,#8f7bff);box-shadow:0 0 10px rgba(102,160,255,.8)}
.dshbg-sub{font-size:11.5px;color:rgba(238,241,246,.52);margin-top:3px}
.dshbg-icon-btn{width:32px;height:32px;border-radius:10px;border:none;background:rgba(255,255,255,.08);color:rgba(255,255,255,.82);
  font-size:15px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s}
.dshbg-icon-btn:hover{background:rgba(255,255,255,.16)}
.dshbg-content{flex:1;min-height:0;overflow:auto;padding:4px 18px 10px;display:flex;flex-direction:column;gap:16px;overscroll-behavior:contain}
.dshbg-card{padding:12px;border-radius:16px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.08)}
.dshbg-thumb{height:132px;border-radius:12px;background:#0c0d11;background-size:cover;background-position:center;
  position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center}
.dshbg-thumb.is-empty{background-image:linear-gradient(45deg,rgba(255,255,255,.045) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.045) 75%),linear-gradient(45deg,rgba(255,255,255,.045) 25%,transparent 25%,transparent 75%,rgba(255,255,255,.045) 75%);background-size:22px 22px;background-position:0 0,11px 11px}
.dshbg-thumb span{font-size:12px;color:rgba(255,255,255,.42)}
.dshbg-thumb-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:none;background:#000}
.dshbg-thumb-name{position:absolute;left:8px;bottom:8px;max-width:calc(100% - 16px);padding:3px 8px;border-radius:7px;
  background:rgba(0,0,0,.5);font-size:10.5px;color:rgba(255,255,255,.82);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dshbg-row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.dshbg-btn{flex:1;min-width:104px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.07);
  color:#eef1f6;font:inherit;font-size:13px;cursor:pointer;transition:background .15s,border-color .15s,transform .1s;padding:0 12px}
.dshbg-btn:hover{background:rgba(255,255,255,.13)}
.dshbg-btn:active{transform:scale(.985)}
.dshbg-btn-primary{background:linear-gradient(135deg,#4f83ee,#3f6fe0);border-color:rgba(120,160,255,.5);box-shadow:0 6px 18px rgba(63,111,224,.32)}
.dshbg-btn-primary:hover{background:linear-gradient(135deg,#5d8ff5,#4a7ae8)}
.dshbg-hint{margin-top:9px;font-size:11px;line-height:1.5;color:rgba(238,241,246,.45)}
.dshbg-section{display:flex;flex-direction:column;gap:10px}
.dshbg-section-title{font-size:11.5px;letter-spacing:.9px;color:rgba(238,241,246,.5);text-transform:uppercase;font-weight:600}
.dshbg-presets{display:grid;grid-template-columns:repeat(6,1fr);gap:9px}
@media (max-width:360px){.dshbg-presets{grid-template-columns:repeat(4,1fr)}}
.dshbg-preset{position:relative;aspect-ratio:1/1;border-radius:14px;border:1px solid rgba(255,255,255,.14);cursor:pointer;padding:0;
  transition:transform .15s,box-shadow .15s,border-color .15s;overflow:hidden}
.dshbg-preset:hover{transform:translateY(-2px)}
.dshbg-preset span{position:absolute;left:0;right:0;bottom:0;padding:3px 0 4px;font-size:9.5px;color:#fff;text-align:center;
  background:linear-gradient(to top,rgba(0,0,0,.55),transparent)}
.dshbg-preset.is-on{border-color:rgba(120,165,255,.95);box-shadow:0 0 0 2px rgba(90,140,245,.35),0 6px 16px rgba(0,0,0,.3)}
.dshbg-preset.is-on::after{content:"";position:absolute;top:6px;right:6px;width:14px;height:14px;border-radius:50%;
  background:#4f83ee url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'><path d='M20 6 9 17l-5-5'/></svg>") center/9px 9px no-repeat;
  box-shadow:0 1px 4px rgba(0,0,0,.4)}
.dshbg-slider{display:flex;flex-direction:column;gap:2px;padding:6px 0}
.dshbg-slider-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
.dshbg-slider-label{font-size:13px;color:rgba(238,241,246,.9)}
.dshbg-slider-hint{font-size:10.5px;color:rgba(238,241,246,.38);margin-left:6px}
.dshbg-slider-value{font-size:12px;font-variant-numeric:tabular-nums;color:rgba(238,241,246,.62)}
.dshbg-slider input[type=range]{-webkit-appearance:none;appearance:none;width:100%;height:26px;background:transparent;margin:0;cursor:pointer}
.dshbg-slider input[type=range]::-webkit-slider-runnable-track{height:4px;border-radius:99px;
  background:linear-gradient(to right,${ACCENT} 0%,${ACCENT} var(--pct,50%),rgba(255,255,255,.16) var(--pct,50%),rgba(255,255,255,.16) 100%)}
.dshbg-slider input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;margin-top:-6px;border-radius:50%;
  background:#fff;border:none;box-shadow:0 1px 5px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.06)}
.dshbg-slider input[type=range]::-moz-range-track{height:4px;border-radius:99px;background:rgba(255,255,255,.16)}
.dshbg-slider input[type=range]::-moz-range-progress{height:4px;border-radius:99px;background:${ACCENT}}
.dshbg-slider input[type=range]::-moz-range-thumb{width:16px;height:16px;border:none;border-radius:50%;background:#fff;box-shadow:0 1px 5px rgba(0,0,0,.45)}
.dshbg-seg{display:flex;gap:4px;padding:4px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.07)}
.dshbg-seg button{flex:1;height:30px;border:none;border-radius:9px;background:transparent;color:rgba(238,241,246,.66);font:inherit;font-size:12.5px;cursor:pointer;transition:background .15s,color .15s}
.dshbg-seg button:hover{color:#fff}
.dshbg-seg button.is-on{background:rgba(255,255,255,.14);color:#fff;box-shadow:0 1px 4px rgba(0,0,0,.2)}
.dshbg-switch{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:2px 0;cursor:pointer;user-select:none}
.dshbg-switch-label{font-size:13px;color:rgba(238,241,246,.9)}
.dshbg-switch-label small{display:block;font-size:10.5px;color:rgba(238,241,246,.4);margin-top:2px}
.dshbg-switch input{display:none}
.dshbg-switch-track{width:42px;height:24px;border-radius:99px;background:rgba(255,255,255,.17);position:relative;transition:background .18s;flex:none}
.dshbg-switch-track::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .18s;box-shadow:0 1px 3px rgba(0,0,0,.35)}
.dshbg-switch input:checked + .dshbg-switch-track{background:${ACCENT}}
.dshbg-switch input:checked + .dshbg-switch-track::after{transform:translateX(18px)}
.dshbg-foot{display:flex;gap:9px;padding:12px 18px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid rgba(255,255,255,.08);background:rgba(12,13,17,.5)}
.dshbg-toast{position:fixed;left:50%;bottom:calc(30px + env(safe-area-inset-bottom,0px));transform:translate(-50%,8px);z-index:2147483002;
  padding:9px 16px;border-radius:11px;background:rgba(20,22,28,.94);color:#fff;font-size:12.5px;border:1px solid rgba(255,255,255,.14);
  box-shadow:0 10px 30px rgba(0,0,0,.4);opacity:0;pointer-events:none;transition:opacity .2s,transform .2s;font-family:system-ui,-apple-system,"PingFang SC",sans-serif}
.dshbg-toast.is-on{opacity:1;transform:translate(-50%,0)}
@media (max-width:600px){
  #dshbg-overlay{align-items:flex-end;padding:0}
  #dshbg-panel{width:100%;max-height:92vh;border-radius:22px 22px 0 0;transform:translateY(24px)}
  .dshbg-presets{grid-template-columns:repeat(4,1fr);gap:7px}
  .dshbg-thumb{height:118px}
}
@media (prefers-reduced-motion:reduce){
  #dshbg-image[data-motion],#dshbg-video[data-motion]{animation:none!important}
  #dshbg-panel,#dshbg-overlay{transition:none}
}
`;

		/* --------------------------- DOM 引用 --------------------------- */

		const ui = {
			image: null,
			video: null,
			veil: null,
			tint: null,
			fab: null,
			overlay: null,
			panel: null,
			thumb: null,
			thumbVideo: null,
			thumbName: null,
			toast: null,
			fileInput: null,
			sliders: new Map()
		};

		let objectUrl = null;
		let videoUrl = null;
		let toastTimer = 0;
		let mounted = false;
		let cleanupFns = [];

		function setObjectUrl(url) {
			if (objectUrl && objectUrl !== url) {
				try {
					URL.revokeObjectURL(objectUrl);
				} catch (e) {}
			}
			objectUrl = url || null;
		}

		function setVideoUrl(url) {
			if (videoUrl && videoUrl !== url) {
				try {
					URL.revokeObjectURL(videoUrl);
				} catch (e) {}
			}
			videoUrl = url || null;
		}

		/** 当前是否深色主题（DSH 在 body 上挂 data-ds-dark-theme）。 */
		function isDarkTheme() {
			return !!(document.body && document.body.hasAttribute("data-ds-dark-theme"));
		}

		/** 当前预设（找不到时退回第一套）。 */
		function currentPreset() {
			return PRESETS.find((item) => item.id === state.preset) || PRESETS[0];
		}

		function currentBackground() {
			if (state.imageId && objectUrl) return 'url("' + objectUrl + '")';
			const preset = currentPreset();
			const dark = isDarkTheme();
			return (dark && preset.cssDark) || preset.css;
		}

		/** 与当前预设、当前主题相配的底色，避免浅色下糊成灰白。 */
		function tintColor() {
			const preset = currentPreset();
			const dark = isDarkTheme();
			if (dark) return preset.tintDark || "#151517";
			return preset.tintLight || "#ffffff";
		}

		/* ---------------------------- 应用样式 ---------------------------- */

		function render() {
			if (!mounted) return;
			const body = document.body;
			const html = document.documentElement;
			const on = !!state.active;

			if (!on) {
				body.removeAttribute("data-dshbg");
				body.removeAttribute("data-dshbg-glass");
				html.classList.remove("dshbg-html");
				if (ui.image) ui.image.style.display = "none";
				if (ui.video) {
					ui.video.style.display = "none";
					try { ui.video.pause(); } catch (e) {}
				}
				if (ui.veil) ui.veil.style.display = "none";
				if (ui.tint) ui.tint.style.display = "none";
				return;
			}

			body.setAttribute("data-dshbg", "on");
			if (state.glass) body.setAttribute("data-dshbg-glass", "on");
			else body.removeAttribute("data-dshbg-glass");
			html.classList.add("dshbg-html");

			const blurPx = ((100 - state.clarity) / 100) * 14;
			const style = body.style;

			style.setProperty("--dshbg-image-opacity", String(state.imageOpacity / 100));
			style.setProperty("--dshbg-blur", blurPx.toFixed(2) + "px");
			style.setProperty("--dshbg-brightness", String(state.brightness / 100));
			style.setProperty("--dshbg-contrast", String(state.contrast / 100));
			style.setProperty("--dshbg-saturate", String(state.saturate / 100));
			style.setProperty("--dshbg-zoom", String(state.zoom / 100));
			const dark = isDarkTheme();
			// 浅色主题下，白色底本身已经很亮，再压满不透明度就会把渐变糊成一张白纸：
			// 这里按主题缩放，浅色只取一部分，让预设的颜色透出来。
			const uiAlpha = dark ? state.uiOpacity : Math.round(state.uiOpacity * 0.55);
			style.setProperty("--dshbg-ui-alpha", uiAlpha + "%");
			style.setProperty("--dshbg-ui-alpha-soft", Math.round(uiAlpha * 0.58) + "%");
			style.setProperty("--dshbg-ui-alpha-deep", Math.min(100, Math.round(uiAlpha * 1.15)) + "%");
			style.setProperty("--dshbg-chat-alpha", state.chatAlpha + "%");
			style.setProperty("--dshbg-tint-color", tintColor());
			style.setProperty("--dshbg-veil-color", dark ? "#000000" : "#ffffff");
			// 浅色下「暗色遮罩」当成一层薄雾，强度减半，不然又是一层灰。
			style.setProperty("--dshbg-veil", (dark ? state.veil : state.veil * 0.5) / 100);

			const hasVideo = !!(state.videoId && videoUrl);
			if (hasVideo) {
				if (ui.image) ui.image.style.display = "none";
				if (ui.video) {
					ui.video.style.display = "block";
					ui.video.style.objectFit = state.fill === "contain" ? "contain" : "cover";
					ui.video.style.objectPosition = state.posX + "% " + state.posY + "%";
					ui.video.dataset.motion = prefersReducedMotion() ? "none" : state.motion;
					if (ui.video.getAttribute("data-src") !== videoUrl) {
						ui.video.setAttribute("data-src", videoUrl);
						ui.video.src = videoUrl;
					}
					if (state.videoPlay) {
						try {
							const playing = ui.video.play();
							if (playing && typeof playing.catch === "function") playing.catch(() => {});
						} catch (e) {}
					} else {
						try { ui.video.pause(); } catch (e) {}
					}
				}
			} else {
				if (ui.video) {
					try { ui.video.pause(); } catch (e) {}
					ui.video.style.display = "none";
					ui.video.removeAttribute("data-src");
					ui.video.removeAttribute("src");
				}
				if (ui.image) {
					ui.image.style.display = "block";
					ui.image.style.backgroundImage = currentBackground();
					ui.image.style.backgroundPosition =
						state.fill === "tile" ? "0 0" : state.posX + "% " + state.posY + "%";
					ui.image.style.backgroundSize =
						state.fill === "tile" ? "360px auto" : state.fill === "contain" ? "contain" : "cover";
					ui.image.style.backgroundRepeat = state.fill === "tile" ? "repeat" : "no-repeat";
					ui.image.dataset.motion = prefersReducedMotion() ? "none" : state.motion;
				}
			}
			if (ui.veil) ui.veil.style.display = "block";
			if (ui.tint) ui.tint.style.display = "block";
			syncPresetThumbs();
		}

		/* ---------------------------- 面板同步 ---------------------------- */

		function syncSlider(def) {
			const entry = ui.sliders.get(def.key);
			if (!entry) return;
			const value = state[def.key];
			entry.input.value = String(value);
			const pct = ((value - def.min) / (def.max - def.min)) * 100;
			entry.input.style.setProperty("--pct", pct.toFixed(2) + "%");
			entry.value.textContent = value + def.unit;
		}

		/** 让预设缩略图跟着当前主题走（面板开着也能立刻变）。 */
		function syncPresetThumbs() {
			if (!ui.panel) return;
			const dark = isDarkTheme();
			ui.panel.querySelectorAll("[data-preset]").forEach((node) => {
				const css = dark ? node.dataset.cssDark : node.dataset.cssLight;
				if (css) node.style.background = css;
			});
		}

		function syncControls() {
			SLIDERS.forEach(syncSlider);
			if (ui.panel) {
				ui.panel.querySelectorAll("[data-preset]").forEach((node) => {
					node.classList.toggle("is-on", node.dataset.preset === state.preset && !state.imageId);
				});
				ui.panel.querySelectorAll("[data-seg]").forEach((group) => {
					const key = group.dataset.seg;
					group.querySelectorAll("button").forEach((button) => {
						button.classList.toggle("is-on", button.dataset.value === state[key]);
					});
				});
				const activeInput = ui.panel.querySelector('input[data-key="active"]');
				if (activeInput) activeInput.checked = !!state.active;
				const glassInput = ui.panel.querySelector('input[data-key="glass"]');
				if (glassInput) glassInput.checked = !!state.glass;
				const videoPlayInput = ui.panel.querySelector('input[data-key="videoPlay"]');
				if (videoPlayInput) videoPlayInput.checked = !!state.videoPlay;
			}
			updateThumb();
		}

		function updateThumb() {
			if (!ui.thumb) return;
			const hasVideo = !!(state.videoId && videoUrl);
			const hasImage = !!(state.imageId && objectUrl);
			const panelOpen = !!(ui.overlay && !ui.overlay.hidden);
			const css = currentBackground();
			if (hasVideo && ui.thumbVideo && panelOpen) {
				ui.thumb.classList.remove("is-empty");
				ui.thumb.style.backgroundImage = "none";
				ui.thumbVideo.style.display = "block";
				if (ui.thumbVideo.getAttribute("data-src") !== videoUrl) {
					ui.thumbVideo.setAttribute("data-src", videoUrl);
					ui.thumbVideo.src = videoUrl;
				}
				const p = ui.thumbVideo.play();
				if (p && typeof p.catch === "function") p.catch(() => {});
			} else {
				if (ui.thumbVideo) {
					try { ui.thumbVideo.pause(); } catch (e) {}
					ui.thumbVideo.style.display = "none";
					ui.thumbVideo.removeAttribute("data-src");
					ui.thumbVideo.removeAttribute("src");
				}
				if (state.active || hasImage) {
					ui.thumb.classList.remove("is-empty");
					ui.thumb.style.backgroundImage = css;
					ui.thumb.style.backgroundSize = state.fill === "tile" ? "120px auto" : "cover";
				} else {
					ui.thumb.classList.add("is-empty");
					ui.thumb.style.backgroundImage = "";
				}
			}
			const emptyLabel = ui.thumb.querySelector("span");
			if (emptyLabel) emptyLabel.textContent = state.active ? "" : "尚未启用背景";
			if (ui.thumbName) {
				ui.thumbName.textContent = hasVideo
					? (state.videoName || "本地视频")
					: hasImage
					? state.imageName || "本地图片"
					: "预设 · " + (PRESETS.find((p) => p.id === state.preset) || PRESETS[0]).name;
			}
		}

		function toast(message) {
			if (!ui.toast) return;
			ui.toast.textContent = message;
			ui.toast.classList.add("is-on");
			clearTimeout(toastTimer);
			toastTimer = setTimeout(() => ui.toast.classList.remove("is-on"), 1900);
		}

		/* ----------------------------- 面板 ----------------------------- */

		function buildPanel() {
			const overlay = document.createElement("div");
			overlay.id = "dshbg-overlay";
			overlay.hidden = true;

			const sliderHtml = SLIDERS.map(
				(def) =>
					'<div class="dshbg-slider" data-slider="' +
					def.key +
					'">' +
					'<div class="dshbg-slider-head"><span class="dshbg-slider-label">' +
					def.label +
					(def.hint ? '<span class="dshbg-slider-hint">' + def.hint + "</span>" : "") +
					'</span><span class="dshbg-slider-value" data-value="' +
					def.key +
					'"></span></div>' +
					'<input type="range" min="' +
					def.min +
					'" max="' +
					def.max +
					'" step="' +
					def.step +
					'" data-key="' +
					def.key +
					'" aria-label="' +
					def.label +
					'">' +
					"</div>"
			).join("");

			// 缩略图同时带上两套画法，由 syncPresetThumbs() 按当前主题挑一套，
			// 这样深色面板里不会摆着一排浅色小图。
			const presetHtml = PRESETS.map(
				(preset) =>
					'<button type="button" class="dshbg-preset" data-preset="' +
					preset.id +
					'" title="' +
					preset.name +
					'" data-css-light="' +
					preset.css.replace(/"/g, "&quot;") +
					'" data-css-dark="' +
					(preset.cssDark || preset.css).replace(/"/g, "&quot;") +
					'"><span>' +
					preset.name +
					"</span></button>"
			).join("");

			overlay.innerHTML =
				'<div id="dshbg-panel" role="dialog" aria-modal="true" aria-label="背景美化">' +
				'<div class="dshbg-head"><div class="dshbg-head-main">' +
				'<div class="dshbg-title"><span class="dshbg-dot"></span>背景美化</div>' +
				'<div class="dshbg-sub">本地图片 / 视频 · 清晰度 · 透明度 · 其它调节</div>' +
				'</div><button type="button" class="dshbg-icon-btn" data-act="close" aria-label="关闭">✕</button></div>' +
				'<div class="dshbg-content">' +
				'<div class="dshbg-card">' +
				'<div class="dshbg-thumb is-empty"><video class="dshbg-thumb-video" muted loop playsinline preload="metadata"></video><span>尚未启用背景</span><div class="dshbg-thumb-name"></div></div>' +
				'<div class="dshbg-row">' +
				'<button type="button" class="dshbg-btn dshbg-btn-primary" data-act="pick">选择图片 / 视频</button>' +
				'<button type="button" class="dshbg-btn" data-act="clear">移除背景</button>' +
				"</div>" +
				'<div class="dshbg-hint">图片和视频只保存在这台手机的浏览器里（IndexedDB），不会上传。图片支持 JPG / PNG / WebP / GIF，视频支持 MP4 / WebM / MOV（建议 1080p 以内）。</div>' +
				"</div>" +
				'<div class="dshbg-section"><div class="dshbg-section-title">预设背景</div><div class="dshbg-presets">' +
				presetHtml +
				"</div></div>" +
				'<div class="dshbg-section"><div class="dshbg-section-title">画面调节</div>' +
				sliderHtml +
				"</div>" +
				'<div class="dshbg-section"><div class="dshbg-section-title">显示方式</div>' +
				'<div class="dshbg-seg" data-seg="fill"><button type="button" data-value="cover">铺满</button><button type="button" data-value="contain">适应</button><button type="button" data-value="tile">平铺</button></div>' +
				'<div class="dshbg-seg" data-seg="motion"><button type="button" data-value="none">静态</button><button type="button" data-value="float">漂浮</button><button type="button" data-value="breath">呼吸</button></div>' +
				'<label class="dshbg-switch"><span class="dshbg-switch-label">玻璃质感面板<small>让侧边栏与卡片透出背景</small></span><input type="checkbox" data-key="glass"><span class="dshbg-switch-track"></span></label>' +
				'<label class="dshbg-switch"><span class="dshbg-switch-label">视频自动播放<small>仅视频背景生效，关闭后停在第一帧</small></span><input type="checkbox" data-key="videoPlay"><span class="dshbg-switch-track"></span></label>' +
				'<label class="dshbg-switch"><span class="dshbg-switch-label">启用背景美化<small>关闭后恢复默认界面</small></span><input type="checkbox" data-key="active"><span class="dshbg-switch-track"></span></label>' +
				"</div></div>" +
				'<div class="dshbg-foot"><button type="button" class="dshbg-btn" data-act="reset">恢复默认</button>' +
				'<button type="button" class="dshbg-btn dshbg-btn-primary" data-act="close">完成</button></div>' +
				"</div>";

			document.body.appendChild(overlay);

			ui.overlay = overlay;
			ui.panel = overlay.querySelector("#dshbg-panel");
			ui.thumb = overlay.querySelector(".dshbg-thumb");
			ui.thumbVideo = overlay.querySelector(".dshbg-thumb-video");
			ui.thumbName = overlay.querySelector(".dshbg-thumb-name");

			// 滑杆
			SLIDERS.forEach((def) => {
				const row = overlay.querySelector('[data-slider="' + def.key + '"]');
				const input = row.querySelector("input");
				const value = row.querySelector("[data-value]");
				ui.sliders.set(def.key, { input, value });
				input.addEventListener("input", () => {
					state[def.key] = clamp(Number(input.value), def.min, def.max);
					render();
					syncSlider(def);
					saveSoon();
				});
			});

			// 预设
			overlay.querySelectorAll("[data-preset]").forEach((node) => {
				node.addEventListener("click", () => {
					state.preset = node.dataset.preset;
					if (state.imageId) idbDelete(state.imageId).catch(() => {});
					if (state.videoId) idbDelete(state.videoId).catch(() => {});
					state.imageId = null;
					state.imageName = "";
					state.videoId = null;
					state.videoName = "";
					setObjectUrl(null);
					setVideoUrl(null);
					state.active = true;
					render();
					syncControls();
					saveNow();
				});
			});

			// 分段控件
			overlay.querySelectorAll("[data-seg]").forEach((group) => {
				group.querySelectorAll("button").forEach((button) => {
					button.addEventListener("click", () => {
						state[group.dataset.seg] = button.dataset.value;
						render();
						syncControls();
						saveSoon();
					});
				});
			});

			// 开关
			overlay.querySelectorAll('input[data-key="active"]').forEach((input) => {
				input.addEventListener("change", () => {
					state.active = !!input.checked;
					render();
					syncControls();
					saveNow();
				});
			});
			overlay.querySelectorAll('input[data-key="glass"]').forEach((input) => {
				input.addEventListener("change", () => {
					state.glass = !!input.checked;
					render();
					saveSoon();
				});
			});
			overlay.querySelectorAll('input[data-key="videoPlay"]').forEach((input) => {
				input.addEventListener("change", () => {
					state.videoPlay = !!input.checked;
					render();
					saveSoon();
				});
			});

			// 关闭
			overlay.querySelectorAll('[data-act="close"]').forEach((node) => node.addEventListener("click", closePanel));
			overlay.addEventListener("mousedown", (event) => {
				if (event.target === overlay) closePanel();
			});

			// 选择图片
			overlay.querySelector('[data-act="pick"]').addEventListener("click", () => {
				if (ui.fileInput) ui.fileInput.click();
			});
			overlay.querySelector('[data-act="clear"]').addEventListener("click", () => {
				if (state.imageId) idbDelete(state.imageId).catch(() => {});
				if (state.videoId) idbDelete(state.videoId).catch(() => {});
				state.imageId = null;
				state.imageName = "";
				state.videoId = null;
				state.videoName = "";
				setObjectUrl(null);
				setVideoUrl(null);
				render();
				syncControls();
				saveNow();
				toast("已移除本地背景");
			});
			overlay.querySelector('[data-act="reset"]').addEventListener("click", () => {
				resetAll();
				toast("已恢复默认");
			});

			// 文件选择器
			const fileInput = document.createElement("input");
			fileInput.type = "file";
			fileInput.accept = "image/*,video/*";
			fileInput.style.display = "none";
			fileInput.addEventListener("change", () => {
				const file = fileInput.files && fileInput.files[0];
				fileInput.value = "";
				if (file) onFilePicked(file);
			});
			document.body.appendChild(fileInput);
			ui.fileInput = fileInput;

			// 拖拽图片到面板
			["dragover", "drop"].forEach((type) => {
				overlay.addEventListener(type, (event) => {
					event.preventDefault();
					if (type === "drop") {
						const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
						if (file) onFilePicked(file);
					}
				});
			});
		}

		function openPanel() {
			if (!ui.overlay) return;
			state.seen = true;
			if (ui.fab) ui.fab.classList.remove("is-new");
			ui.overlay.hidden = false;
			syncControls();
			requestAnimationFrame(() => ui.overlay.classList.add("is-open"));
			saveSoon();
		}

		function closePanel() {
			if (!ui.overlay) return;
			ui.overlay.classList.remove("is-open");
			if (ui.thumbVideo) {
				try { ui.thumbVideo.pause(); } catch (e) {}
				ui.thumbVideo.removeAttribute("data-src");
				ui.thumbVideo.removeAttribute("src");
			}
			setTimeout(() => {
				if (ui.overlay && !ui.overlay.classList.contains("is-open")) ui.overlay.hidden = true;
			}, 190);
		}

		function resetAll() {
			if (state.imageId) idbDelete(state.imageId).catch(() => {});
			if (state.videoId) idbDelete(state.videoId).catch(() => {});
			setVideoUrl(null);
			Object.keys(DEFAULTS).forEach((key) => {
				state[key] = DEFAULTS[key];
			});
			state.seen = true;
			setObjectUrl(null);
			render();
			syncControls();
			saveNow();
		}

		/* --------------------------- 图片处理 --------------------------- */

		function imageSize(file) {
			return new Promise((resolve) => {
				const url = URL.createObjectURL(file);
				const image = new Image();
				image.onload = () => {
					resolve({ width: image.naturalWidth, height: image.naturalHeight });
					URL.revokeObjectURL(url);
				};
				image.onerror = () => {
					resolve(null);
					URL.revokeObjectURL(url);
				};
				image.src = url;
			});
		}

		async function normalizeImage(file) {
			if (file.type === "image/gif") return file;
			const dim = file.size <= 2.5 * 1024 * 1024 ? await imageSize(file) : null;
			if (dim && Math.max(dim.width, dim.height) <= 2560) return file;

			const bitmap = await createImageBitmap(file);
			const max = 2560;
			const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
			const width = Math.max(1, Math.round(bitmap.width * scale));
			const height = Math.max(1, Math.round(bitmap.height * scale));
			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext("2d");
			context.imageSmoothingEnabled = true;
			context.imageSmoothingQuality = "high";
			context.drawImage(bitmap, 0, 0, width, height);
			if (bitmap.close) bitmap.close();
			const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
			return blob || file;
		}

		async function onFilePicked(file) {
			if (!file) return;
			const isVideo = /^video\//.test(file.type || "");
			if (!isVideo && !/^image\//.test(file.type || "")) {
				toast("请选择图片或视频文件");
				return;
			}
			if (isVideo) {
				await saveVideo(file);
				return;
			}
			if (file.size > 40 * 1024 * 1024) {
				toast("图片太大（超过 40MB）");
				return;
			}
			toast("正在处理图片…");
			let blob = file;
			try {
				blob = await normalizeImage(file);
			} catch (e) {
				blob = file;
			}
			const id = "img_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
			try {
				await idbPut(id, blob);
			} catch (e) {
				toast("本地保存失败：" + (e && e.message ? e.message : "未知错误"));
				return;
			}
			const previous = state.imageId;
			state.imageId = id;
			state.imageName = file.name || "本地图片";
			state.active = true;
			setObjectUrl(URL.createObjectURL(blob));
			if (previous) idbDelete(previous).catch(() => {});
			if (state.videoId) {
				idbDelete(state.videoId).catch(() => {});
				state.videoId = null;
				state.videoName = "";
				setVideoUrl(null);
			}
			render();
			syncControls();
			saveNow();
			toast("背景已更新");
		}

		async function saveVideo(file) {
			if (file.size > 120 * 1024 * 1024) {
				toast("视频太大（超过 120MB）");
				return;
			}
			if (file.size > 60 * 1024 * 1024) toast("视频较大，正在保存…");
			else toast("正在保存视频…");
			const id = "vid_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
			try {
				await idbPut(id, file);
			} catch (e) {
				toast("本地保存失败：" + (e && e.message ? e.message : "未知错误"));
				return;
			}
			const previousVideo = state.videoId;
			const previousImage = state.imageId;
			state.videoId = id;
			state.videoName = file.name || "本地视频";
			state.active = true;
			setVideoUrl(URL.createObjectURL(file));
			state.imageId = null;
			state.imageName = "";
			setObjectUrl(null);
			if (previousVideo) idbDelete(previousVideo).catch(() => {});
			if (previousImage) idbDelete(previousImage).catch(() => {});
			render();
			syncControls();
			saveNow();
			toast("视频背景已启用");
		}

		async function restoreMedia() {
			try {
				if (state.videoId) {
					const video = await idbGet(state.videoId);
					if (!video) {
						state.videoId = null;
						state.videoName = "";
					} else {
						setVideoUrl(URL.createObjectURL(video));
						return;
					}
				}
				if (!state.imageId) return;
				const blob = await idbGet(state.imageId);
				if (!blob) {
					state.imageId = null;
					state.imageName = "";
					return;
				}
				setObjectUrl(URL.createObjectURL(blob));
			} catch (e) {
				/* IndexedDB 不可用时继续用预设 */
			}
		}

		/* ---------------------------- 悬浮按钮 ---------------------------- */

		function buildFab() {
			const fab = document.createElement("button");
			fab.id = "dshbg-fab";
			fab.type = "button";
			fab.setAttribute("aria-label", "背景美化");
			fab.title = "背景美化";
			fab.innerHTML = ICON_IMAGE;
			document.body.appendChild(fab);
			fab.style.top = state.fabTop + "%";
			if (!state.seen) fab.classList.add("is-new");
			ui.fab = fab;

			let pointerId = null;
			let startY = 0;
			let startTop = 0;
			let dragged = false;

			fab.addEventListener("pointerdown", (event) => {
				if (event.button !== undefined && event.button !== 0) return;
				pointerId = event.pointerId;
				startY = event.clientY;
				startTop = fab.getBoundingClientRect().top + fab.offsetHeight / 2;
				dragged = false;
				fab.classList.add("is-dragging");
				try {
					fab.setPointerCapture(pointerId);
				} catch (e) {}
				event.preventDefault();
			});

			fab.addEventListener("pointermove", (event) => {
				if (pointerId === null || event.pointerId !== pointerId) return;
				const delta = event.clientY - startY;
				if (Math.abs(delta) > 5) dragged = true;
				if (!dragged) return;
				const height = window.innerHeight || 800;
				const pct = clamp(((startTop + delta) / height) * 100, 8, 92);
				state.fabTop = pct;
				fab.style.top = pct + "%";
			});

			function finish(event) {
				if (pointerId === null) return;
				if (event && event.pointerId !== pointerId) return;
				try {
					fab.releasePointerCapture(pointerId);
				} catch (e) {}
				pointerId = null;
				fab.classList.remove("is-dragging");
				if (!dragged) openPanel();
				else saveNow();
			}

			fab.addEventListener("pointerup", finish);
			fab.addEventListener("pointercancel", finish);
			fab.addEventListener("click", (event) => event.preventDefault());
			fab.addEventListener("contextmenu", (event) => event.preventDefault());
		}

		/* ----------------------------- 挂载 ----------------------------- */

		function mount() {
			if (mounted) return () => {};
			if (!document.body) return () => {};
			mounted = true;

			const style = document.createElement("style");
			style.id = "dshbg-style";
			style.textContent = CSS;
			document.head.appendChild(style);

			const image = document.createElement("div");
			image.id = "dshbg-image";
			image.style.display = "none";
			document.body.appendChild(image);
			ui.image = image;

			const video = document.createElement("video");
			video.id = "dshbg-video";
			video.muted = true;
			video.loop = true;
			video.autoplay = true;
			video.playsInline = true;
			video.setAttribute("muted", "");
			video.setAttribute("playsinline", "");
			video.setAttribute("webkit-playsinline", "");
			video.preload = "auto";
			video.style.display = "none";
			document.body.appendChild(video);
			ui.video = video;

			const veil = document.createElement("div");
			veil.id = "dshbg-veil";
			veil.style.display = "none";
			document.body.appendChild(veil);
			ui.veil = veil;

			const tint = document.createElement("div");
			tint.id = "dshbg-tint";
			tint.style.display = "none";
			document.body.appendChild(tint);
			ui.tint = tint;

			const toastNode = document.createElement("div");
			toastNode.className = "dshbg-toast";
			document.body.appendChild(toastNode);
			ui.toast = toastNode;

			buildFab();
			buildPanel();

			const onKeyDown = (event) => {
				if (event.key === "Escape" && ui.overlay && !ui.overlay.hidden) closePanel();
			};
			document.addEventListener("keydown", onKeyDown);

			const themeObserver = new MutationObserver(() => {
				if (state.active) render();
			});
			themeObserver.observe(document.body, {
				attributes: true,
				attributeFilter: ["data-ds-dark-theme", "class"]
			});

			const onResize = () => {
				if (ui.fab) ui.fab.style.top = state.fabTop + "%";
			};
			window.addEventListener("resize", onResize);

			const dispose = () => {
				mounted = false;
				themeObserver.disconnect();
				document.removeEventListener("keydown", onKeyDown);
				window.removeEventListener("resize", onResize);
				document.body.removeAttribute("data-dshbg");
				document.body.removeAttribute("data-dshbg-glass");
				document.documentElement.classList.remove("dshbg-html");
				[
					"--dshbg-image-opacity",
					"--dshbg-blur",
					"--dshbg-brightness",
					"--dshbg-contrast",
					"--dshbg-saturate",
					"--dshbg-zoom",
					"--dshbg-veil",
					"--dshbg-ui-alpha",
					"--dshbg-chat-alpha",
					"--dshbg-tint-color"
				].forEach((name) => document.body.style.removeProperty(name));
				[
					"#dshbg-image",
					"#dshbg-video",
					"#dshbg-veil",
					"#dshbg-tint",
					"#dshbg-fab",
					"#dshbg-overlay",
					"#dshbg-style",
					"input[type=file][data-dshbg]"
				].forEach((selector) => {
					document.querySelectorAll(selector).forEach((node) => node.remove());
				});
				if (ui.fileInput && ui.fileInput.parentNode) ui.fileInput.parentNode.removeChild(ui.fileInput);
				setObjectUrl(null);
				setVideoUrl(null);
				ui.image = ui.video = ui.veil = ui.tint = ui.fab = ui.overlay = ui.panel = ui.thumb = ui.thumbVideo = ui.thumbName = ui.toast = ui.fileInput = null;
				ui.sliders.clear();
			};

			return dispose;
		}

		/* ----------------------------- 启动 ----------------------------- */

		function start() {
			try {
				const dispose = mount();
				cleanupFns.push(dispose);
				restoreMedia()
					.catch(() => {})
					.then(() => {
						render();
						syncControls();
					});
			} catch (error) {
				console.warn("[" + PLUGIN_ID + "] mount failed:", error);
			}
		}

		function apply(ctx) {
			const boot = () => {
				if (document.readyState === "loading") {
					document.addEventListener("DOMContentLoaded", start, { once: true });
				} else {
					start();
				}
			};
			boot();
			const dispose = () => {
				cleanupFns.forEach((fn) => {
					try {
						fn();
					} catch (e) {}
				});
				cleanupFns = [];
			};
			if (ctx && typeof ctx.effect === "function") {
				ctx.effect(() => dispose, PLUGIN_ID + ": dom");
			}
		}

		exports.name = PLUGIN_ID;
		exports.apply = apply;
		return module.exports;
	}
});
