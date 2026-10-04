"use client";

import { Copy, Mail, UserRoundPen } from "lucide-react";
import { useCompose } from "@/components/compose/compose-context";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { showErrorToast, showToast } from "@/components/ui/toaster-utils";
import { getEmailAddress } from "@/lib/email/address";
import type { AddressContextMenuProps } from "./address-context-menu-types";
import { createDraftTo, formatNameAndAddress } from "./address-context-menu-utils";

// Pillcrow fork: right-click a sender or recipient in the reader.

export function AddressContextMenu({ children, mailboxId, address, name, onEditContact }: AddressContextMenuProps) {
	const { mailboxes, selectedMailbox } = useSelectedMailbox();
	const { openDraftComposer } = useCompose();
	const email = getEmailAddress(address);

	function copy(text: string) {
		void navigator.clipboard
			.writeText(text)
			.then(() => showToast({ message: `Copied ${text}`, duration: 3000 }))
			.catch(() => showErrorToast("Couldn't copy the address"));
	}

	function newMessage() {
		const mailbox = mailboxes.find((item) => item.id === mailboxId) ?? selectedMailbox;
		if (!mailbox) return;
		void createDraftTo(mailbox, email)
			.then(openDraftComposer)
			.catch((error) => showErrorToast(error instanceof Error ? error.message : "Couldn't start a new email"));
	}

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
			<ContextMenuContent aria-label={`Actions for ${email}`}>
				<ContextMenuLabel>{email}</ContextMenuLabel>
				<ContextMenuItem icon={Mail} onSelect={newMessage}>New email to this address</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem icon={Copy} onSelect={() => copy(email)}>Copy email address</ContextMenuItem>
				{name && name.trim().toLowerCase() !== email.toLowerCase() && (
					<ContextMenuItem icon={Copy} onSelect={() => copy(formatNameAndAddress(name, email))}>Copy name and address</ContextMenuItem>
				)}
				<ContextMenuSeparator />
				<ContextMenuItem icon={UserRoundPen} onSelect={onEditContact}>Edit contact…</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
