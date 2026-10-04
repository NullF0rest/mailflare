"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, CheckCheck, ExternalLink, Eye, FolderPen, Link2, Palette, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showErrorToast, showToast } from "@/components/ui/toaster-utils";
import { FOLDER_COLOR_OPTIONS } from "@/lib/folders/colors";
import type { FolderColor } from "@/lib/folders/types";
import type { DeleteFolderDialogProps, NavContextMenuProps, RenameFolderDialogProps } from "./nav-context-menu-types";
import { deleteFolder, describeMarkedRead, markAllAsRead, updateFolder } from "./nav-context-menu-utils";

// Pillcrow fork: right-click on the Inbox or a folder in the sidebar. Touch keeps its long-press
// for reordering the sidebar, so the menu answers the mouse and keyboard (Shift+F10) only.

export function NavContextMenu({ children, href, label, mailboxId, unread = 0, folder, onFolderChange, onFolderDelete }: NavContextMenuProps) {
	const router = useRouter();
	const pathname = usePathname();
	const [renameOpen, setRenameOpen] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);

	function markRead() {
		if (!mailboxId) return;
		void markAllAsRead(mailboxId, folder?.id)
			.then((count) => showToast({ message: describeMarkedRead(count), duration: 3000 }))
			.catch((error) => showErrorToast(error instanceof Error ? error.message : "Couldn't mark these emails as read"));
	}

	function recolour(color: FolderColor) {
		if (!folder || folder.color === color) return;
		const previous = folder;
		onFolderChange?.({ ...folder, color });
		void updateFolder(folder.id, { color }).catch((error) => {
			onFolderChange?.(previous);
			showErrorToast(error instanceof Error ? error.message : "Couldn't change the colour");
		});
	}

	function copyLink() {
		void navigator.clipboard
			.writeText(new URL(href, window.location.origin).toString())
			.then(() => showToast({ message: "Link copied", duration: 2500 }))
			.catch(() => showErrorToast("Couldn't copy the link"));
	}

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger
					asChild
					onPointerDown={(event) => {
						if (event.pointerType !== "mouse") event.preventDefault();
					}}
				>
					<div className="rounded-r-full [&[data-state=open]_a]:ring-1 [&[data-state=open]_a]:ring-inset [&[data-state=open]_a]:ring-neutral-300">
						{children}
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent aria-label={`${label} actions`}>
					<ContextMenuItem icon={Eye} onSelect={() => router.push(href)}>Open</ContextMenuItem>
					<ContextMenuItem icon={ExternalLink} onSelect={() => window.open(href, "_blank", "noopener")}>Open in new tab</ContextMenuItem>
					<ContextMenuItem icon={Link2} onSelect={copyLink}>Copy link</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem icon={CheckCheck} disabled={!mailboxId || unread === 0} onSelect={markRead}>Mark all as read</ContextMenuItem>
					{folder && (
						<>
							<ContextMenuSeparator />
							<ContextMenuItem icon={FolderPen} onSelect={() => setRenameOpen(true)}>Rename…</ContextMenuItem>
							<ContextMenuSub>
								<ContextMenuSubTrigger icon={Palette}>Colour</ContextMenuSubTrigger>
								<ContextMenuSubContent className="min-w-44">
									{FOLDER_COLOR_OPTIONS.map((option) => (
										<ContextMenuItem key={option.value} onSelect={() => recolour(option.value)}>
											<span className="flex items-center gap-2.5">
												<span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: option.value }} />
												<span className="flex-1">{option.label}</span>
												{folder.color === option.value && <Check className="h-4 w-4 text-neutral-600" />}
											</span>
										</ContextMenuItem>
									))}
								</ContextMenuSubContent>
							</ContextMenuSub>
							<ContextMenuSeparator />
							<ContextMenuItem icon={Trash2} destructive onSelect={() => setDeleteOpen(true)}>Delete folder…</ContextMenuItem>
						</>
					)}
				</ContextMenuContent>
			</ContextMenu>
			{folder && renameOpen && (
				<RenameFolderDialog
					open={renameOpen}
					onOpenChange={setRenameOpen}
					folder={folder}
					onRenamed={(next) => onFolderChange?.(next)}
				/>
			)}
			{folder && deleteOpen && (
				<DeleteFolderDialog
					open={deleteOpen}
					onOpenChange={setDeleteOpen}
					folder={folder}
					onDeleted={() => {
						onFolderDelete?.(folder.id);
						if (pathname === href || pathname.startsWith(`${href}/`)) router.push("/inbox");
						showToast({ message: `Deleted ${folder.name}. Its emails are back in the Inbox.` });
					}}
				/>
			)}
		</>
	);
}

function RenameFolderDialog({ open, onOpenChange, folder, onRenamed }: RenameFolderDialogProps) {
	const [name, setName] = useState(folder.name);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const trimmed = name.trim();

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!trimmed || trimmed === folder.name) {
			onOpenChange(false);
			return;
		}
		setPending(true);
		setError(null);
		try {
			onRenamed(await updateFolder(folder.id, { name: trimmed }));
			onOpenChange(false);
		} catch (renameError) {
			setError(renameError instanceof Error ? renameError.message : "Couldn't rename the folder");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Rename folder</DialogTitle>
					<DialogDescription>Emails and rules that use this folder keep it under the new name.</DialogDescription>
				</DialogHeader>
				<form onSubmit={submit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor={`rename-folder-${folder.id}`}>Folder name</Label>
						<Input
							id={`rename-folder-${folder.id}`}
							value={name}
							maxLength={80}
							onChange={(event) => setName(event.target.value)}
							onFocus={(event) => event.target.select()}
							autoFocus
						/>
					</div>
					{error && <p className="text-sm text-red-600">{error}</p>}
					<div className="flex justify-end gap-2">
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
						<Button type="submit" disabled={pending || !trimmed}>{pending ? "Saving…" : "Save"}</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function DeleteFolderDialog({ open, onOpenChange, folder, onDeleted }: DeleteFolderDialogProps) {
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function confirm() {
		setPending(true);
		setError(null);
		try {
			await deleteFolder(folder.id);
			onOpenChange(false);
			onDeleted();
		} catch (deleteError) {
			setError(deleteError instanceof Error ? deleteError.message : "Couldn't delete the folder");
		} finally {
			setPending(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete {folder.name}?</DialogTitle>
					<DialogDescription>
						No emails are deleted: everything in this folder goes back to the Inbox, and any rule that filed mail here stops doing so.
					</DialogDescription>
				</DialogHeader>
				{error && <p className="text-sm text-red-600">{error}</p>}
				<div className="flex justify-end gap-2">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>Cancel</Button>
					<Button type="button" variant="destructive" onClick={() => void confirm()} disabled={pending}>
						{pending ? "Deleting…" : "Delete folder"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
