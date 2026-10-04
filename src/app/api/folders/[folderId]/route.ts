import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { folders, messages, routingRules } from "@/db/schema";
import { requireSessionUser } from "@/lib/api/auth";
import { getEnv } from "@/lib/cloudflare";
import { getMailboxFolderAccess } from "../utils";
import { folderUpdateSchema } from "./utils";

// Pillcrow fork: rename, recolour and delete a folder from the sidebar's right-click menu.

type FolderRouteParams = { params: Promise<{ folderId: string }> };

async function loadManagedFolder(request: Request, folderId: string) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return { response: auth.error };
	const db = getDb(env);
	const [folder] = await db.select().from(folders).where(eq(folders.id, folderId)).limit(1);
	const access = folder ? await getMailboxFolderAccess(db, auth.user, folder.mailboxId) : null;
	if (!folder || !access?.canManage) {
		return { response: NextResponse.json({ error: "Folder not found" }, { status: 404 }) };
	}
	return { db, folder };
}

export async function PATCH(request: Request, { params }: FolderRouteParams) {
	const { folderId } = await params;
	const loaded = await loadManagedFolder(request, folderId);
	if ("response" in loaded) return loaded.response;
	const { db, folder } = loaded;

	const parsed = folderUpdateSchema.safeParse(await request.json());
	if (!parsed.success) {
		return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
	}

	const name = parsed.data.name ?? folder.name;
	if (name !== folder.name) {
		const [existing] = await db
			.select({ id: folders.id })
			.from(folders)
			.where(and(eq(folders.mailboxId, folder.mailboxId), eq(folders.name, name), ne(folders.id, folder.id)))
			.limit(1);
		if (existing) {
			return NextResponse.json({ error: "Folder already exists" }, { status: 409 });
		}
	}

	const color = parsed.data.color ?? folder.color;
	await db.update(folders).set({ name, color }).where(eq(folders.id, folder.id));
	return NextResponse.json({ id: folder.id, mailboxId: folder.mailboxId, name, color });
}

export async function DELETE(request: Request, { params }: FolderRouteParams) {
	const { folderId } = await params;
	const loaded = await loadManagedFolder(request, folderId);
	if ("response" in loaded) return loaded.response;
	const { db, folder } = loaded;

	// Done by hand rather than trusting ON DELETE SET NULL, which the self-hosted SQLite
	// runtime only honours with foreign keys switched on. Emails in the folder are already
	// "received", so clearing the folder puts them back in the Inbox; a rule left without a
	// folder is skipped, so mail it used to file here lands in the Inbox too.
	await db.update(messages).set({ folderId: null }).where(eq(messages.folderId, folder.id));
	await db.update(routingRules).set({ folderId: null }).where(eq(routingRules.folderId, folder.id));
	await db.delete(folders).where(eq(folders.id, folder.id));
	return NextResponse.json({ ok: true });
}
