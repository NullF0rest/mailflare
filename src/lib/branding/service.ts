import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";
import type { Branding } from "./types";
import { getLicenseEntitlements } from "@/lib/licenses/service";
import { DEFAULT_APP_NAME as PILLCROW_APP_NAME, UPSTREAM_APP_NAME } from "./defaults";
import { readBrandEnv } from "./env";

export const APP_SETTINGS_ID = "default";
export const DEFAULT_APP_NAME = PILLCROW_APP_NAME;
export const BRANDING_ICON_KEY = "branding/app-icon";

export async function getBranding(env: CloudflareEnv): Promise<Branding> {
	// Pillcrow fork: Admin → Branding wins, then the BRAND_* env vars, then Pillcrow's defaults.
	const brand = readBrandEnv(env);
	const envName = brand.name ?? DEFAULT_APP_NAME;
	const entitlements = await getLicenseEntitlements(env);
	if (!entitlements.canCustomizeBranding) {
		return { appName: envName, hasCustomIcon: false, canCustomizeBranding: false };
	}

	try {
		const [settings] = await getDb(env)
			.select()
			.from(appSettings)
			.where(eq(appSettings.id, APP_SETTINGS_ID))
			.limit(1);
		return {
			appName: settings?.appName && settings.appName !== UPSTREAM_APP_NAME ? settings.appName : envName,
			hasCustomIcon: !!settings?.iconKey,
			canCustomizeBranding: true,
		};
	} catch {
		return { appName: envName, hasCustomIcon: false, canCustomizeBranding: true };
	}
}

export async function updateBranding(
	env: CloudflareEnv,
	input: { appName: string; icon?: File | null },
): Promise<Branding> {
	if (!(await getLicenseEntitlements(env)).canCustomizeBranding) {
		throw new Error("A Pro or Team license is required to customize branding");
	}
	let iconKey: string | undefined;
	if (input.icon) {
		iconKey = BRANDING_ICON_KEY;
		await env.BUCKET.put(iconKey, await input.icon.arrayBuffer(), {
			httpMetadata: { contentType: input.icon.type },
		});
	}

	await getDb(env)
		.insert(appSettings)
		.values({
			id: APP_SETTINGS_ID,
			appName: input.appName,
			iconKey: iconKey ?? null,
		})
		.onConflictDoUpdate({
			target: appSettings.id,
			set: {
				appName: input.appName,
				...(iconKey ? { iconKey } : {}),
				updatedAt: new Date(),
			},
		});
	return getBranding(env);
}
