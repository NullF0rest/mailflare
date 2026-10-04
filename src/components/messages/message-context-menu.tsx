"use client";

import { useState } from "react";
import {
	AlarmClockOff,
	Archive,
	ArchiveRestore,
	Ban,
	CalendarClock,
	Clock,
	Copy,
	ExternalLink,
	Eye,
	Folder,
	FolderInput,
	Forward,
	Inbox,
	Mail,
	MailOpen,
	Reply,
	ReplyAll,
	ShieldAlert,
	ShieldCheck,
	Square,
	SquareCheck,
	Star,
	StarOff,
	Trash2,
	Undo2,
	X,
} from "lucide-react";
import { useCompose } from "@/components/compose/compose-context";
import { blockMessageContact } from "@/components/message-actions/utils";
import { MessageSnoozeDialog } from "@/components/message-actions/message-snooze-dialog";
import type { ReplyMode } from "@/components/message-actions/types";
import { useSelectedMailbox } from "@/components/mailbox-provider";
import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showErrorToast, showToast } from "@/components/ui/toaster-utils";
import type { BulkMessageAction } from "@/app/api/messages/bulk/types";
import { getEmailAddress } from "@/lib/email/address";
import { isMessageSnoozed, snoozeMessage, unsnoozeMessage } from "./message-list-row-actions-utils";
import {
	copyText,
	formatSnoozedUntil,
	getFolderMoveDestinations,
	getMessageMoveDestinations,
	getRowPartyAddresses,
	getSnoozeMenuPresets,
	startDraftFromMessage,
} from "./message-context-menu-utils";
import type {
	BlockSenderDialogProps,
	MessageRowContextMenuProps,
	MessageRowMenuAction,
	MessageRowMenuContentProps,
	MoveDestination,
} from "./message-context-menu-types";
import { useMailboxFolders } from "./use-mailbox-folders";
import { isMessageListRowUnread } from "./utils";

// Pillcrow fork: right-click (or long-press) on a message row. Left click still opens it.
// The menu's content mounts only while open, so 25 rows cost 25 small wrappers, not 25 folder fetches.

export function MessageRowContextMenu({ children, ...props }: MessageRowContextMenuProps) {
	const [open, setOpen] = useState(false);
	const [snoozeOpen, setSnoozeOpen] = useState(false);
	const [blockOpen, setBlockOpen] = useState(false);
	const senderAddress = getEmailAddress(props.message.fromAddr);

	return (
		<>
			<ContextMenu onOpenChange={setOpen}>
				<ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
				{open && (
					<MessageRowMenuContent
						{...props}
						onSnoozeCustom={() => setSnoozeOpen(true)}
						onBlockSender={() => setBlockOpen(true)}
					/>
				)}
			</ContextMenu>
			{snoozeOpen && <MessageSnoozeDialog messageId={props.message.id} open={snoozeOpen} onOpenChange={setSnoozeOpen} />}
			{blockOpen && (
				<BlockSenderDialog
					open={blockOpen}
					onOpenChange={setBlockOpen}
					address={senderAddress}
					onConfirm={async () => {
						if (!props.message.mailboxId) throw new Error("Could not block sender");
						await blockMessageContact({ mailboxId: props.message.mailboxId, senderAddress: props.message.fromAddr });
						await props.onAction("trash").catch(() => undefined);
						showToast({ message: `Blocked ${senderAddress}. Their emails now go to Trash.` });
					}}
				/>
			)}
		</>
	);
}

function run(task: () => Promise<unknown>, failure: string) {
	void task().catch((error) => showErrorToast(error instanceof Error && error.message ? error.message : failure));
}

function MessageRowMenuContent(props: MessageRowMenuContentProps) {
	const { selected, selectionCount } = props;
	if (selected && selectionCount > 1) return <SelectionMenuContent {...props} />;
	return <SingleMessageMenuContent {...props} />;
}

function SingleMessageMenuContent({
	message,
	config,
	href,
	selected,
	onOpen,
	onAction,
	onToggleStar,
	onSelectedChange,
	onSnoozeCustom,
	onBlockSender,
}: MessageRowMenuContentProps) {
	const { mailboxes, selectedMailbox } = useSelectedMailbox();
	const { openDraftComposer } = useCompose();
	const isDraft = config.folder === "drafts" || message.status === "draft";
	const inbound = message.direction === "inbound";
	const unread = isMessageListRowUnread(message);
	const snoozed = isMessageSnoozed(message.snoozedUntil);
	const canSnooze = inbound && message.status === "received" && !message.folderId;
	const partyAddresses = getRowPartyAddresses(message);

	function startDraft(mode: ReplyMode | "forward") {
		run(async () => {
			const draftId = await startDraftFromMessage(message.id, mode, mailboxes, selectedMailbox);
			openDraftComposer(draftId);
		}, mode === "forward" ? "Couldn't start the forward" : "Couldn't start the reply");
	}

	function snoozeUntil(value: string) {
		run(async () => {
			await snoozeMessage(message.id, value);
			showToast({
				message: `Snoozed until ${formatSnoozedUntil(value)}`,
				action: { label: "Undo", onAction: () => unsnoozeMessage(message.id) },
			});
		}, "Couldn't snooze this email");
	}

	if (isDraft) {
		return (
			<ContextMenuContent aria-label="Draft actions">
				<ContextMenuItem icon={Eye} onSelect={onOpen}>Open draft</ContextMenuItem>
				<ContextMenuItem icon={ExternalLink} onSelect={() => window.open(href, "_blank", "noopener")}>Open in new tab</ContextMenuItem>
				<ContextMenuSeparator />
				<SelectItem selected={selected} onSelectedChange={onSelectedChange} />
				<ContextMenuSeparator />
				<ContextMenuItem icon={Trash2} destructive onSelect={() => run(() => onAction("trash"), "Couldn't delete this draft")}>Delete draft</ContextMenuItem>
			</ContextMenuContent>
		);
	}

	const archiveItem = message.status === "archived"
		? { action: "inbox" as const, label: "Move to Inbox", icon: ArchiveRestore }
		: message.status === "trash" || message.status === "spam"
			? null
			: { action: "archive" as const, label: "Archive", icon: Archive };

	return (
		<ContextMenuContent aria-label="Email actions">
			<ContextMenuItem icon={Eye} onSelect={onOpen}>Open</ContextMenuItem>
			<ContextMenuItem icon={ExternalLink} onSelect={() => window.open(href, "_blank", "noopener")}>Open in new tab</ContextMenuItem>
			<ContextMenuSeparator />
			<ContextMenuItem icon={Reply} onSelect={() => startDraft("reply")}>Reply</ContextMenuItem>
			<ContextMenuItem icon={ReplyAll} onSelect={() => startDraft("replyAll")}>Reply all</ContextMenuItem>
			<ContextMenuItem icon={Forward} onSelect={() => startDraft("forward")}>Forward</ContextMenuItem>
			<ContextMenuSeparator />
			{inbound && (
				<ContextMenuItem
					icon={unread ? MailOpen : Mail}
					onSelect={() => run(() => onAction(unread ? "read" : "unread"), "Couldn't update this email")}
				>
					{unread ? "Mark as read" : "Mark as unread"}
				</ContextMenuItem>
			)}
			<ContextMenuItem icon={message.starred ? StarOff : Star} onSelect={onToggleStar}>
				{message.starred ? "Remove star" : "Add star"}
			</ContextMenuItem>
			{canSnooze && (snoozed ? (
				<ContextMenuItem
					icon={AlarmClockOff}
					onSelect={() => run(async () => {
						await unsnoozeMessage(message.id);
						showToast({ message: "Back in your Inbox" });
					}, "Couldn't unsnooze this email")}
				>
					Unsnooze
				</ContextMenuItem>
			) : (
				<ContextMenuSub>
					<ContextMenuSubTrigger icon={Clock}>Snooze</ContextMenuSubTrigger>
					<ContextMenuSubContent>
						<ContextMenuLabel>Snooze until</ContextMenuLabel>
						{getSnoozeMenuPresets().map((preset) => (
							<ContextMenuItem key={preset.label} onSelect={() => snoozeUntil(preset.value)}>
								<span className="flex items-center justify-between gap-6">
									{preset.label}
									<span className="text-xs text-neutral-500">{preset.hint}</span>
								</span>
							</ContextMenuItem>
						))}
						<ContextMenuSeparator />
						<ContextMenuItem icon={CalendarClock} onSelect={onSnoozeCustom}>Pick date and time…</ContextMenuItem>
					</ContextMenuSubContent>
				</ContextMenuSub>
			))}
			<ContextMenuSeparator />
			{archiveItem && (
				<ContextMenuItem icon={archiveItem.icon} onSelect={() => run(() => onAction(archiveItem.action), "Couldn't move this email")}>
					{archiveItem.label}
				</ContextMenuItem>
			)}
			<MoveToSub
				mailboxId={message.mailboxId ?? selectedMailbox?.id}
				currentFolderId={message.folderId}
				destinations={getMessageMoveDestinations(message)}
				onAction={onAction}
			/>
			{inbound && (message.status === "spam" ? (
				<ContextMenuItem icon={ShieldCheck} onSelect={() => run(() => onAction("inbox"), "Couldn't move this email")}>Not spam</ContextMenuItem>
			) : (
				<ContextMenuItem icon={ShieldAlert} onSelect={() => run(() => onAction("spam"), "Couldn't report this email")}>Report spam</ContextMenuItem>
			))}
			{message.status === "trash" ? (
				inbound && <ContextMenuItem icon={Undo2} onSelect={() => run(() => onAction("inbox"), "Couldn't restore this email")}>Restore to Inbox</ContextMenuItem>
			) : (
				<ContextMenuItem icon={Trash2} onSelect={() => run(() => onAction("trash"), "Couldn't delete this email")}>Delete</ContextMenuItem>
			)}
			<ContextMenuSeparator />
			{partyAddresses && (
				<ContextMenuItem
					icon={Copy}
					onSelect={() => run(async () => {
						await copyText(partyAddresses);
						showToast({ message: `Copied ${partyAddresses}`, duration: 3000 });
					}, "Couldn't copy the address")}
				>
					{inbound ? "Copy sender address" : "Copy recipient addresses"}
				</ContextMenuItem>
			)}
			{inbound && message.mailboxId && (
				<ContextMenuItem icon={Ban} destructive onSelect={onBlockSender}>Block sender…</ContextMenuItem>
			)}
			{(partyAddresses || inbound) && <ContextMenuSeparator />}
			<SelectItem selected={selected} onSelectedChange={onSelectedChange} />
		</ContextMenuContent>
	);
}

function SelectionMenuContent({
	config,
	message,
	selectionCount,
	hasUnreadSelection,
	onSelectionAction,
	onClearSelection,
}: MessageRowMenuContentProps) {
	const { selectedMailbox } = useSelectedMailbox();
	const folder = config.folder;
	const customFolder = !!config.folderId;
	const archive = folder === "archived"
		? { action: "inbox" as const, label: "Move to Inbox", icon: ArchiveRestore }
		: { action: "archive" as const, label: "Archive", icon: Archive };
	const failure = "Couldn't update the selected emails";

	return (
		<ContextMenuContent aria-label="Actions for selected emails">
			<ContextMenuLabel>{selectionCount} selected</ContextMenuLabel>
			{folder !== "sent" && folder !== "drafts" && (
				<ContextMenuItem
					icon={hasUnreadSelection ? MailOpen : Mail}
					onSelect={() => run(() => onSelectionAction(hasUnreadSelection ? "read" : "unread"), failure)}
				>
					{hasUnreadSelection ? "Mark as read" : "Mark as unread"}
				</ContextMenuItem>
			)}
			{folder !== "drafts" && (
				<ContextMenuItem icon={archive.icon} onSelect={() => run(() => onSelectionAction(archive.action), failure)}>{archive.label}</ContextMenuItem>
			)}
			<MoveToSub
				mailboxId={message.mailboxId ?? selectedMailbox?.id}
				currentFolderId={config.folderId ?? null}
				destinations={getFolderMoveDestinations(folder, customFolder)}
				onAction={onSelectionAction}
			/>
			{folder === "spam" ? (
				<ContextMenuItem icon={ShieldCheck} onSelect={() => run(() => onSelectionAction("inbox"), failure)}>Not spam</ContextMenuItem>
			) : folder !== "sent" && folder !== "drafts" && (
				<ContextMenuItem icon={ShieldAlert} onSelect={() => run(() => onSelectionAction("spam"), failure)}>Report spam</ContextMenuItem>
			)}
			{folder === "trash" ? (
				<ContextMenuItem icon={Undo2} onSelect={() => run(() => onSelectionAction("inbox"), failure)}>Restore to Inbox</ContextMenuItem>
			) : (
				<ContextMenuItem icon={Trash2} onSelect={() => run(() => onSelectionAction("trash"), failure)}>Delete</ContextMenuItem>
			)}
			<ContextMenuSeparator />
			<ContextMenuItem icon={X} onSelect={onClearSelection}>Clear selection</ContextMenuItem>
		</ContextMenuContent>
	);
}

function MoveToSub({
	mailboxId,
	currentFolderId,
	destinations,
	onAction,
}: {
	mailboxId: string | undefined;
	currentFolderId: string | null;
	destinations: MoveDestination[];
	onAction: MessageRowMenuAction;
}) {
	const folders = useMailboxFolders(mailboxId).filter((folder) => folder.id !== currentFolderId);
	const move = (action: BulkMessageAction, folder?: { id: string; name: string }) =>
		run(() => onAction(action, folder), "Couldn't move the email");

	return (
		<ContextMenuSub>
			<ContextMenuSubTrigger icon={FolderInput}>Move to</ContextMenuSubTrigger>
			<ContextMenuSubContent className="max-h-[min(24rem,var(--radix-context-menu-content-available-height))]">
				{destinations.map(({ action, label, icon }) => (
					<ContextMenuItem key={action} icon={action === "inbox" ? Inbox : icon} onSelect={() => move(action)}>{label}</ContextMenuItem>
				))}
				{folders.length > 0 && (
					<>
						<ContextMenuSeparator />
						<ContextMenuLabel>Folders</ContextMenuLabel>
						{folders.map((folder) => (
							<ContextMenuItem key={folder.id} onSelect={() => move("folder", { id: folder.id, name: folder.name })}>
								<span className="flex min-w-0 items-center gap-2.5">
									<Folder className="h-4 w-4 shrink-0" style={{ color: folder.color }} />
									<span className="truncate">{folder.name}</span>
								</span>
							</ContextMenuItem>
						))}
					</>
				)}
			</ContextMenuSubContent>
		</ContextMenuSub>
	);
}

function SelectItem({ selected, onSelectedChange }: { selected: boolean; onSelectedChange: (selected: boolean) => void }) {
	return (
		<ContextMenuItem icon={selected ? SquareCheck : Square} onSelect={() => onSelectedChange(!selected)}>
			{selected ? "Deselect" : "Select"}
		</ContextMenuItem>
	);
}

function BlockSenderDialog({ open, onOpenChange, address, onConfirm }: BlockSenderDialogProps) {
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function confirm() {
		setPending(true);
		setError(null);
		try {
			await onConfirm();
			onOpenChange(false);
		} catch (blockError) {
			setError(blockError instanceof Error ? blockError.message : "Could not block sender");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Block {address}?</DialogTitle>
					<DialogDescription>
						Future emails from this sender go straight to Trash, and this one moves there now. To undo it later, remove the rule under Rules.
					</DialogDescription>
				</DialogHeader>
				{error && <p className="text-sm text-red-600">{error}</p>}
				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
					<Button type="button" variant="destructive" onClick={() => void confirm()} disabled={pending}>
						{pending ? "Blocking…" : "Block sender"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
