import { and, count, eq, isNull, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { folders, messages } from "@/db/schema";
import { requireSessionUser } from "@/lib/api/auth";
import { getEnv } from "@/lib/cloudflare";
import { getMailboxAccessLevel } from "@/lib/mailboxes/access";
import { createAuditLog } from "@/lib/mailboxes/audit";
import type { ReadAllPayload } from "./types";

// Pillcrow fork: "Mark all as read" on the Inbox or a folder in the sidebar. Matches what
// those views list (the Inbox leaves out filed and snoozed mail), not just one page of it.

export async function POST(request: Request) {
	const env = getEnv();
	const auth = await requireSessionUser(env, request);
	if (auth.error) return auth.error;

	const payload = (await request.json()) as ReadAllPayload;
	if (!payload.mailboxId) {
		return NextResponse.json({ error: "Mailbox is required" }, { status: 400 });
	}

	const db = getDb(env);
	const access = await getMailboxAccessLevel(db, auth.user, payload.mailboxId);
	if (!access?.canRead) {
		return NextResponse.json({ error: "Mailbox not found" }, { status: 404 });
	}

	const conditions = [eq(messages.mailboxId, access.mailbox.id), eq(messages.read, false), eq(messages.status, "received")];
	if (payload.folderId) {
		const [folder] = await db
			.select({ id: folders.id })
			.from(folders)
			.where(and(eq(folders.id, payload.folderId), eq(folders.mailboxId, access.mailbox.id)))
			.limit(1);
		if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
		conditions.push(eq(messages.folderId, folder.id));
	} else {
		conditions.push(isNull(messages.folderId));
		conditions.push(or(isNull(messages.snoozedUntil), lte(messages.snoozedUntil, new Date()))!);
	}

	const where = and(...conditions);
	const [{ total }] = await db.select({ total: count() }).from(messages).where(where);
	if (total > 0) {
		await db.update(messages).set({ read: true }).where(where);
		await createAuditLog(env, {
			actorUserId: auth.user.id,
			mailboxId: access.mailbox.id,
			action: "email.read",
			metadata: { bulkAction: "read-all", folderId: payload.folderId ?? null, count: total },
		});
	}

	return NextResponse.json({ ok: true, count: total });
}
