export type BrandEnv = {
	/** BRAND_NAME: the install's name, unless an admin set one under Admin → Branding. */
	name: string | null;
	/** BRAND_ICON_URL: an https URL or a path under public/, unless an admin uploaded an icon. */
	iconUrl: string | null;
	/** BRAND_ACCENT / BRAND_ACCENT_DARK: buttons, links, selection and tints, per theme. */
	accent: string;
	accentDark: string;
	/** BRAND_BACKGROUND / BRAND_BACKGROUND_DARK: the page ground, per theme. Null keeps upstream's. */
	background: string | null;
	backgroundDark: string | null;
};
