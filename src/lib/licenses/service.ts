import type { LicenseEntitlements } from "./types";

// Pillcrow fork: every install gets the Team plan's features. There is no licence key, no
// Paymug check and no pricing page; Pillcrow runs one install per client.
const PILLCROW_ENTITLEMENTS: LicenseEntitlements = {
	plan: "team",
	canCustomizeBranding: true,
	canManageAccounts: true,
	canForwardEmail: true,
};

export async function getLicenseEntitlements(_env?: CloudflareEnv): Promise<LicenseEntitlements> {
	return PILLCROW_ENTITLEMENTS;
}
