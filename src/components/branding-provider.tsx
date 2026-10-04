"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { BrandingContextValue } from "./branding-provider-types";
import { DEFAULT_BRANDING, fetchBranding } from "./branding-provider-utils";
import { DEFAULT_APP_NAME } from "@/lib/branding/defaults";

const BrandingContext = createContext<BrandingContextValue | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
	const [branding, setBranding] = useState(DEFAULT_BRANDING);
	const [iconVersion, setIconVersion] = useState(0);

	async function refreshBranding() {
		const nextBranding = await fetchBranding();
		setBranding(nextBranding);
		setIconVersion(Date.now());
		if (document.title === DEFAULT_APP_NAME || document.title === branding.appName) {
			document.title = nextBranding.appName;
		}
	}

	useEffect(() => {
		void refreshBranding();
	}, []);

	return (
		<BrandingContext.Provider value={{
			...branding,
			iconUrl: `/api/branding/icon?v=${iconVersion}`,
			refreshBranding,
		}}>
			{children}
		</BrandingContext.Provider>
	);
}

export function useBranding() {
	return useContext(BrandingContext) ?? {
		...DEFAULT_BRANDING,
		iconUrl: "/api/branding/icon",
		refreshBranding: async () => undefined,
	};
}
