import { Archive, Inbox, ShieldAlert, Trash2 } from "lucide-react";
import type { MailboxOption } from "@/components/mailbox-provider";
import { fetchMessageDetail, getOwnAddressForMessage } from "@/app/(dashboard)/inbox/[messageId]/utils";
import {
	createForwardDraft,
	createReplyDraft,
	getReplyRecipients,
	getReplyThreading,
} from "@/components/message-actions/utils";
import type { ReplyMode } from "@/components/message-actions/types";
import type { Message, MessageFolder } from "@/hooks/types";
import { getEmailAddress, getEmailAddressList } from "@/lib/email/address";
import { formatUserDate, parseUserDateTimeLocal } from "@/lib/time/utils";
import { getSnoozePresets } from "./message-list-row-actions-utils";
import type { MoveDestination } from "./message-context-menu-types";

/** Every address the mailbox can send as, the same list the reader builds for reply-all. */
export function getMailboxOwnAddresses(mailbox: MailboxOption | null | undefined): string[] {
	if (!mailbox) return [];
	return mailbox.senderAddresses?.length ? mailbox.senderAddresses : [`${mailbox.localPart}@${mailbox.hostname}`];
}

/**
 * Starts a reply, reply-all or forward from a list row without opening the message:
 * the same drafts the reader creates, built from the full message (the list row has no body).
 */
export async function startDraftFromMessage(
	messageId: string,
	mode: ReplyMode | "forward",
	mailboxes: MailboxOption[],
	fallbackMailbox: MailboxOption | null,
): Promise<string> {
	const detail = await fetchMessageDetail(messageId);
	const message = detail.message;
	if (!message) throw new Error(detail.error ?? "Message not found");
	const mailbox = mailboxes.find((item) => item.id === message.mailboxId) ?? fallbackMailbox;
	const ownAddresses = getMailboxOwnAddresses(mailbox);
	const ownAddress = getOwnAddressForMessage(message, ownAddresses);
	const bodyText = detail.body?.textBody ?? null;
	const bodyHtml = detail.body?.htmlBody ?? null;

	if (mode === "forward") {
		return createForwardDraft({ mailboxId: message.mailboxId, ownAddress, message, bodyText, bodyHtml });
	}
	return createReplyDraft({
		mailboxId: message.mailboxId,
		senderAddress: message.fromAddr,
		ownAddress,
		subject: message.subject,
		bodyText,
		bodyHtml,
		sentAt: message.createdAt,
		recipients: getReplyRecipients(message, ownAddresses, mode),
		threading: getReplyThreading(message),
	});
}

/** The address worth copying from a row: the sender, or the recipients of something we sent. */
export function getRowPartyAddresses(message: Pick<Message, "direction" | "fromAddr" | "toAddr">): string {
	if (message.direction === "outbound") return getEmailAddressList(message.toAddr).join(", ");
	return getEmailAddress(message.fromAddr);
}

export async function copyText(text: string) {
	await navigator.clipboard.writeText(text);
}

/** Destinations for one message, leaving out where it already is. Spam and Inbox are only for mail we received. */
export function getMessageMoveDestinations(message: Pick<Message, "status" | "folderId" | "direction">): MoveDestination[] {
	const inbound = message.direction === "inbound";
	const inInbox = message.status === "received" && !message.folderId;
	const destinations: MoveDestination[] = [];
	if (inbound && !inInbox) destinations.push({ action: "inbox", label: "Inbox", icon: Inbox });
	if (message.status !== "archived") destinations.push({ action: "archive", label: "Archived", icon: Archive });
	if (inbound && message.status !== "spam") destinations.push({ action: "spam", label: "Spam", icon: ShieldAlert });
	if (message.status !== "trash") destinations.push({ action: "trash", label: "Trash", icon: Trash2 });
	return destinations;
}

/** Destinations for a selection, judged by the folder being listed as the bulk toolbar does. */
export function getFolderMoveDestinations(folder: MessageFolder, customFolder: boolean): MoveDestination[] {
	const outboundOnly = folder === "sent" || folder === "drafts";
	const destinations: MoveDestination[] = [];
	if (!outboundOnly && (folder !== "inbox" || customFolder)) destinations.push({ action: "inbox", label: "Inbox", icon: Inbox });
	if (folder !== "archived") destinations.push({ action: "archive", label: "Archived", icon: Archive });
	if (!outboundOnly && folder !== "spam") destinations.push({ action: "spam", label: "Spam", icon: ShieldAlert });
	if (folder !== "trash") destinations.push({ action: "trash", label: "Trash", icon: Trash2 });
	return destinations;
}

/** The snooze presets with the moment each one lands on, so the menu can show it. */
export function getSnoozeMenuPresets(now = new Date()) {
	return getSnoozePresets(now).map((preset, index) => {
		const date = parseUserDateTimeLocal(preset.value);
		const hint = date
			? formatUserDate(date, index === 0 ? { weekday: "short", hour: "numeric", minute: "2-digit" } : { weekday: "short", month: "short", day: "numeric" })
			: "";
		return { ...preset, hint };
	});
}

export function formatSnoozedUntil(value: string): string {
	const date = parseUserDateTimeLocal(value);
	if (!date) return "later";
	return formatUserDate(date, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
