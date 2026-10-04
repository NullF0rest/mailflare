import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { appSettings } from "@/db/schema";
import { APP_SETTINGS_ID } from "@/lib/branding/service";
import { getEnvAsync } from "@/lib/cloudflare";
import { getLicenseEntitlements } from "@/lib/licenses/service";
import { readBrandEnv } from "@/lib/branding/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getDefaultIcon(env: CloudflareEnv): Promise<Response> {
	// Pillcrow fork: BRAND_ICON_URL, when set, stands in for the packaged icon.
	const iconUrl = readBrandEnv(env).iconUrl;
	if (iconUrl && !iconUrl.startsWith("/")) {
		return new Response(null, { status: 302, headers: { Location: iconUrl, "Cache-Control": "no-cache" } });
	}
	const asset = await env.ASSETS.fetch(`https://mailflare.local${iconUrl ?? "/icon-96.png"}`);
	return new Response(await asset.arrayBuffer(), {
		status: asset.status,
		statusText: asset.statusText,
		headers: asset.headers,
	});
}

export async function GET(request: Request) {
	const env = await getEnvAsync();
	if (!(await getLicenseEntitlements(env)).canCustomizeBranding) return getDefaultIcon(env);
	try {
		const [settings] = await getDb(env)
			.select({ iconKey: appSettings.iconKey })
			.from(appSettings)
			.where(eq(appSettings.id, APP_SETTINGS_ID))
			.limit(1);
		if (settings?.iconKey) {
			const object = await env.BUCKET.get(settings.iconKey);
			if (object) {
				return new Response(object.body, {
					headers: {
						"Content-Type": object.httpMetadata?.contentType ?? "image/png",
						"Cache-Control": "no-cache",
						"X-Content-Type-Options": "nosniff",
					},
				});
			}
		}
	} catch {
		// Use the packaged icon until the branding migration is available.
	}
	return getDefaultIcon(env);
}
