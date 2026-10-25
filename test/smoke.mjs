/**
 * dsh-chat-background — 源码级自检。
 *
 * 这个插件是纯浏览器半边（没有宿主 API、没有网络），真正的行为只能在页面里跑；
 * 这里守住的是那些「改一处、另一处忘掉」的结构性约定：
 *   - 预设表完整：id 唯一、浅色/深色两套画法、两套底色都在；
 *   - 主题分支存在：深浅两套 CSS 真的会被选中，浅色不再用满不透明度；
 *   - 版本号与 package.json 对得上。
 *
 * 不过 DOM、不连网，直接读文件，几毫秒跑完。
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const client = readFileSync(join(root, "lib/client.js"), "utf8");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

let passed = 0;
const failures = [];
function check(name, ok, detail = "") {
	if (ok) {
		passed += 1;
		console.log("  ok  " + name);
	} else {
		failures.push(name + (detail ? " — " + detail : ""));
		console.log("  FAIL " + name + (detail ? " — " + detail : ""));
	}
}

/** 取 `const PRESETS = [ ... ];` 这一段。 */
const table = client.slice(client.indexOf("const PRESETS = ["), client.indexOf("/** 面板里的滑杆定义"));
check("preset table exists", table.length > 0);

/** 每个预设花括号块里的字段。 */
const blocks = [...table.matchAll(/\{\s*id:\s*"([^"]+)"([\s\S]*?)\n\t\t\t\}/g)].map((m) => ({
	id: m[1],
	body: m[2]
}));

const fields = (body, key) => {
	const hex = new RegExp(key + ':\\s*"(#[0-9a-fA-F]{3,8})"').exec(body);
	if (hex) return hex[1];
	const quoted = new RegExp(key + ':\\s*"([^"]+)"').exec(body);
	return quoted ? quoted[1] : null;
};

check("has 12 presets", blocks.length === 12, "found " + blocks.length);

const ids = blocks.map((b) => b.id);
check("preset ids are unique", new Set(ids).size === ids.length);

for (const { id, body } of blocks) {
	const name = fields(body, "name");
	const css = fields(body, "css");
	const cssDark = fields(body, "cssDark");
	const tintLight = fields(body, "tintLight");
	const tintDark = fields(body, "tintDark");
	check(
		`${id}: name + light/dark css + light/dark tint`,
		!!name && !!css && !!cssDark && /^#[0-9a-f]{6}$/i.test(tintLight || "") && /^#[0-9a-f]{6}$/i.test(tintDark || "")
	);
	const layers = (s) => (s ? s.split("gradient(").length - 1 : 0);
	check(`${id}: layered gradient (>=3 layers)`, layers(css) >= 3 && layers(cssDark) >= 3, `light ${layers(css)} / dark ${layers(cssDark)}`);
	check(`${id}: light art is not the dark art`, css !== cssDark);
}

check("theme is detected from the body attribute", client.includes('hasAttribute("data-ds-dark-theme")'));
check("theme picks a preset art", client.includes("(dark && preset.cssDark) || preset.css"));
check("theme picks a preset tint", client.includes("preset.tintLight") && client.includes("preset.tintDark"));
check("light theme lowers the tint alpha", client.includes("state.uiOpacity * 0.55"));
check("tint is a vertical gradient, not one flat sheet", client.includes("--dshbg-ui-alpha-soft") && client.includes("--dshbg-ui-alpha-deep"));
check("veil colour follows the theme", client.includes("--dshbg-veil-color") && client.includes('dark ? "#000000" : "#ffffff"'));
check("light veil is halved", client.includes("state.veil * 0.5"));
check("legacy veil assignment removed", !client.includes('setProperty("--dshbg-veil", String('));
check("glass layers are theme-specific", client.includes('[data-ds-dark-theme][data-dshbg="on"][data-dshbg-glass="on"]'));
check("preset thumbnails carry both paintings", client.includes("data-css-light=") && client.includes("data-css-dark="));
check("preset thumbnails follow the theme", client.includes("function syncPresetThumbs") && client.includes("node.dataset.cssDark : node.dataset.cssLight"));
check("preset grid fits 12 thumbs", client.includes("@media (max-width:360px){.dshbg-presets{grid-template-columns:repeat(4,1fr)}}"));
check("version is 1.2.0", pkg.version === "1.2.0", "package.json says " + pkg.version);
check("package declares the bundle patch", pkg.dsh?.bundle?.patch === "./cordis.patch.yml");
check("client half is declared for web", pkg.dsh?.client?.platform === "web");

console.log(`\n[chat-background] ${passed} checks ok, ${failures.length} failed`);
if (failures.length > 0) {
	console.log("failed: " + failures.join("; "));
	process.exit(1);
}
console.log("[chat-background] PASS");
