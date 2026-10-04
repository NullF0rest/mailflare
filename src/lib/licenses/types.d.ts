export type LicensePlan = "community" | "pro" | "team";

export type LicenseEntitlements = {
	plan: LicensePlan;
	canCustomizeBranding: boolean;
	canManageAccounts: boolean;
	canForwardEmail: boolean;
};
