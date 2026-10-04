export type ReadAllPayload = {
	mailboxId?: string;
	/** A custom folder; without it the mailbox's Inbox is marked read. */
	folderId?: string | null;
};
