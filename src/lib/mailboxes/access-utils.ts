import type { AppDatabase } from "@/db";

// Pillcrow fork: shared mailboxes are a Team feature, and every install has Team features.
export async function isTeamMailboxSharingEnabled(_db?: AppDatabase): Promise<boolean> {
	return true;
}
