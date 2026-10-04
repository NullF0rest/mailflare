import type { MailboxOption } from "@/components/mailbox-provider";
import { authFetch } from "@/lib/auth/client";
import { getEmailAddress } from "@/lib/email/address";

/** An empty draft to one address, sent from the mailbox's own address, for the composer to open. */
export async function createDraftTo(mailbox: MailboxOption, to: string): Promise<string> {
	const response = await authFetch("/api/drafts", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			mailboxId: mailbox.id,
			from: `${mailbox.localPart}@${mailbox.hostname}`,
			to: getEmailAddress(to),
			subject: "",
			html: "",
			text: "",
		}),
	});
	const data = (await response.json()) as { draft?: { id: string }; error?: string };
	if (!response.ok || !data.draft) throw new Error(data.error ?? "Couldn't start a new email");
	return data.draft.id;
}

/** "Maya Chen <maya@example.com>", or just the address when there is no name worth keeping. */
export function formatNameAndAddress(name: string | null | undefined, address: string): string {
	const email = getEmailAddress(address);
	const label = (name ?? "").trim();
	if (!label || label.toLowerCase() === email.toLowerCase()) return email;
	return `${/[",<>@]/.test(label) ? JSON.stringify(label) : label} <${email}>`;
}
