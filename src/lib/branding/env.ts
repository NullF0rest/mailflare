// Pillcrow fork: an install's brand comes from env vars, so each client's deploy is configured
// in its Worker settings (or .env for Docker). Precedence for the name and icon is
// Admin → Branding (stored in D1) > BRAND_* env > the Pillcrow defaults in ./defaults.ts.
import type { BrandEnv } from "./env-types";
import { DEFAULT_ACCENT, DEFAULT_ACCENT_DARK } from "./defaults";

type BrandVars = Partial<Record<
	"BRAND_NAME" | "BRAND_ICON_URL" | "BRAND_ACCENT" | "BRAND_ACCENT_DARK" | "BRAND_BACKGROUND" | "BRAND_BACKGROUND_DARK",
	string
>>;

// Hex only: the value is written into a stylesheet, so nothing else gets through. The "#" is
// optional because dotenv files (.dev.vars, Docker's .env) read an unquoted "#" as a comment.
const HEX_COLOR = /^#?((?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8}))$/i;

function text(value: string | undefined): string | null {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

export function brandColor(value: string | undefined, name: string): string | null {
	const color = text(value);
	if (!color) return null;
	const hex = HEX_COLOR.exec(color)?.[1];
	if (hex) return `#${hex.toLowerCase()}`;
	console.warn(`[branding] Ignoring ${name}=${JSON.stringify(color)}: use a hex colour such as 5640aa or #5640aa.`);
	return null;
}

export function brandIconUrl(value: string | undefined): string | null {
	const url = text(value);
	if (!url) return null;
	if (/^\/[^/\\]/.test(url)) return url;
	try {
		if (new URL(url).protocol === "https:") return url;
	} catch {
		// fall through to the warning
	}
	console.warn(`[branding] Ignoring BRAND_ICON_URL=${JSON.stringify(url)}: use an https URL or a path such as /brand/icon.png.`);
	return null;
}

export function readBrandEnv(env: BrandVars): BrandEnv {
	const name = text(env.BRAND_NAME);
	const accent = brandColor(env.BRAND_ACCENT, "BRAND_ACCENT");
	return {
		name: name ? name.slice(0, 60) : null,
		iconUrl: brandIconUrl(env.BRAND_ICON_URL),
		accent: accent ?? DEFAULT_ACCENT,
		// A brand that sets only BRAND_ACCENT uses it in both themes.
		accentDark: brandColor(env.BRAND_ACCENT_DARK, "BRAND_ACCENT_DARK") ?? accent ?? DEFAULT_ACCENT_DARK,
		background: brandColor(env.BRAND_BACKGROUND, "BRAND_BACKGROUND"),
		backgroundDark: brandColor(env.BRAND_BACKGROUND_DARK, "BRAND_BACKGROUND_DARK"),
	};
}

// The UI's accent is Tailwind's blue scale (bg-blue-600 buttons, text-blue-700 links, blue-50
// tints) plus --primary. Re-pointing the --color-blue-* variables re-colours all of it without
// touching a component. Light: tints toward white below 600, shades toward black above. Dark
// mirrors upstream's remap in globals.css: low steps are tints of the ground, high steps go
// toward white so text stays readable.
const LIGHT_STEPS: Array<[number, string]> = [
	[50, "8%, white"], [100, "16%, white"], [200, "30%, white"], [300, "50%, white"], [400, "72%, white"],
	[500, "88%, white"], [600, "100%, white"], [700, "85%, black"], [800, "70%, black"], [900, "55%, black"], [950, "40%, black"],
];
const DARK_STEPS: Array<[number, string]> = [
	[50, "18%, var(--background)"], [100, "28%, var(--background)"], [200, "42%, var(--background)"], [300, "58%, var(--background)"],
	[400, "78%, var(--background)"], [500, "100%, var(--background)"], [600, "80%, white"], [700, "65%, white"], [800, "45%, white"],
	[900, "30%, white"], [950, "15%, white"],
];

function scale(steps: Array<[number, string]>): string {
	return steps
		.map(([step, mix]) => `\t--color-blue-${step}: color-mix(in oklab, var(--brand-accent) ${mix});`)
		.join("\n");
}

/** The stylesheet served at /api/branding/theme. Selectors outrank globals.css's :root and .dark. */
export function brandThemeCss(brand: BrandEnv): string {
	return [
		"/* Pillcrow Mail brand theme, generated from BRAND_* env vars. */",
		"html:root {",
		`\t--brand-accent: ${brand.accent};`,
		"\t--primary: var(--brand-accent);",
		"\t--primary-foreground: #ffffff;",
		...(brand.background ? [`\t--background: ${brand.background};`] : []),
		scale(LIGHT_STEPS),
		"}",
		"html.dark:root {",
		`\t--brand-accent: ${brand.accentDark};`,
		"\t--primary: var(--brand-accent);",
		"\t--primary-foreground: #202124;",
		...(brand.backgroundDark ? [`\t--background: ${brand.backgroundDark};`] : []),
		scale(DARK_STEPS),
		"}",
		// globals.css pins these two to fixed oklch values in dark mode.
		"html.dark .bg-blue-600 { background-color: var(--brand-accent); }",
		"html.dark .bg-blue-700, html.dark .hover\\:bg-blue-700:hover { background-color: color-mix(in oklab, var(--brand-accent) 85%, black); }",
		"",
	].join("\n");
}
