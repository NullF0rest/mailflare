import type { MailboxSelectorUser } from "@/components/mailbox-selector-types";
import type { ReactNode } from "react";

export type HomeAuthProviderProps = {
	children: ReactNode;
};

export type HomeAuthResponse = {
	user?: MailboxSelectorUser;
};

export type HomeSignedInUser = {
	name: string;
	email: string;
};

export type HomeSignInProps = {
	appName: string;
	/** No administrator exists yet, so the first visit goes to /setup. */
	needsSetup: boolean;
	/** The session cookie's user, read on the server so a signed-in visit renders without a flash. */
	signedIn: HomeSignedInUser | null;
};
