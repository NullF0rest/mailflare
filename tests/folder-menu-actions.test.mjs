import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import test, { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

// Pillcrow fork: the APIs behind the sidebar's right-click menu (rename, recolour, delete a
// folder, mark all as read) and the rules that decide when the list offers Undo.

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const directory = mkdtempSync(join(root, "node_modules", "mailflare-folder-menu-test-"));
after(() => rmSync(directory, { recursive: true, force: true }));
await build({
	stdin: {
		contents: `
			export { SqliteDatabase } from "./server/runtime/sqlite-database.ts";
			export { applyMigrations } from "./server/runtime/migrate.ts";
			export { createSession } from "./src/lib/auth/session.ts";
			export { PATCH as patchFolder, DELETE as deleteFolder } from "./src/app/api/folders/[folderId]/route.ts";
			export { POST as readAll } from "./src/app/api/messages/read-all/route.ts";
			export { getUndoTarget, describeMessageMove } from "./src/components/messages/message-undo-utils.ts";
		`,
		resolveDir: root,
		sourcefile: "folder-menu-test-entry.ts",
	},
	outfile: join(directory, "entry.mjs"),
	bundle: true,
	platform: "node",
	format: "esm",
	target: "node24",
	tsconfig: join(root, "tsconfig.json"),
	packages: "external",
	alias: { "next/headers": "next/headers.js", "next/server": "next/server.js", "cloudflare:workers": "./server/runtime/cloudflare-workers.ts" },
	logLevel: "silent",
});
const { SqliteDatabase, applyMigrations, createSession, patchFolder, deleteFolder, readAll, getUndoTarget, describeMessageMove } =
	await import(pathToFileURL(join(directory, "entry.mjs")).href);

async function fixture(t) {
	const database = new SqliteDatabase(":memory:");
	t.after(() => database.db.close());
	await applyMigrations(database, join(root, "drizzle/migrations"));
	const future = Math.floor(Date.now() / 1000) + 86400;
	database.db.exec(`
		INSERT INTO users (id, email, password_hash, name, role, created_at) VALUES
			('owner', 'owner@one.test', 'hash', 'Owner', 'member', 1),
			('stranger', 'stranger@two.test', 'hash', 'Stranger', 'member', 1);
		INSERT INTO domains (id, user_id, hostname, zone_id, status, created_at) VALUES ('one', 'owner', 'one.test', 'zone-one', 'active', 1);
		INSERT INTO mailboxes (id, user_id, domain_id, local_part, created_at) VALUES ('box', 'owner', 'one', 'sam', 1);
		INSERT INTO folders (id, user_id, mailbox_id, name, color, created_at) VALUES
			('receipts', 'owner', 'box', 'Receipts', '#2563eb', 1),
			('travel', 'owner', 'box', 'Travel', '#16a34a', 1);
		INSERT INTO messages (id, user_id, mailbox_id, direction, from_addr, to_addr, status, read, folder_id, snoozed_until, created_at) VALUES
			('inbox-unread', 'owner', 'box', 'inbound', 'a@x.test', 'sam@one.test', 'received', 0, NULL, NULL, 1),
			('inbox-read', 'owner', 'box', 'inbound', 'a@x.test', 'sam@one.test', 'received', 1, NULL, NULL, 1),
			('snoozed', 'owner', 'box', 'inbound', 'a@x.test', 'sam@one.test', 'received', 0, NULL, ${future}, 1),
			('filed', 'owner', 'box', 'inbound', 'a@x.test', 'sam@one.test', 'received', 0, 'receipts', NULL, 1),
			('archived', 'owner', 'box', 'inbound', 'a@x.test', 'sam@one.test', 'archived', 0, NULL, NULL, 1);
		INSERT INTO routing_rules (id, user_id, domain_id, scope, pattern, mailbox_id, folder_id, created_at)
			VALUES ('rule', 'owner', 'one', 'mailbox', 'receipt', 'box', 'receipts', 1);
	`);
	const env = { DB: database, MAILFLARE_RUNTIME: "node" };
	globalThis.__mailflareNodeEnv = env;
	t.after(() => { delete globalThis.__mailflareNodeEnv; });
	const owner = await createSession(env, "owner");
	const stranger = await createSession(env, "stranger");
	const request = (path, method, body, token = owner) => new Request(`https://mail.test${path}`, {
		method,
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const params = (folderId) => ({ params: Promise.resolve({ folderId }) });
	const row = (sql, ...args) => database.db.prepare(sql).get(...args);
	return { request, params, row, stranger };
}

test("renaming and recolouring a folder", async (t) => {
	const f = await fixture(t);
	const renamed = await patchFolder(f.request("/api/folders/receipts", "PATCH", { name: "  Bills " }), f.params("receipts"));
	assert.equal(renamed.status, 200);
	assert.deepEqual(await renamed.json(), { id: "receipts", mailboxId: "box", name: "Bills", color: "#2563eb" });

	const recoloured = await patchFolder(f.request("/api/folders/receipts", "PATCH", { color: "#db2777" }), f.params("receipts"));
	assert.equal((await recoloured.json()).color, "#db2777");
	assert.deepEqual(f.row("SELECT name, color FROM folders WHERE id = 'receipts'"), { name: "Bills", color: "#db2777" });
});

test("a folder cannot take another folder's name, an unknown colour, or nothing at all", async (t) => {
	const f = await fixture(t);
	assert.equal((await patchFolder(f.request("/api/folders/receipts", "PATCH", { name: "Travel" }), f.params("receipts"))).status, 409);
	assert.equal((await patchFolder(f.request("/api/folders/receipts", "PATCH", { color: "#000000" }), f.params("receipts"))).status, 400);
	assert.equal((await patchFolder(f.request("/api/folders/receipts", "PATCH", {}), f.params("receipts"))).status, 400);
	assert.equal(f.row("SELECT name FROM folders WHERE id = 'receipts'").name, "Receipts");
});

test("someone without access to the mailbox gets a 404 and changes nothing", async (t) => {
	const f = await fixture(t);
	const patched = await patchFolder(f.request("/api/folders/receipts", "PATCH", { name: "Mine" }, f.stranger), f.params("receipts"));
	assert.equal(patched.status, 404);
	const deleted = await deleteFolder(f.request("/api/folders/receipts", "DELETE", undefined, f.stranger), f.params("receipts"));
	assert.equal(deleted.status, 404);
	const marked = await readAll(f.request("/api/messages/read-all", "POST", { mailboxId: "box" }, f.stranger));
	assert.equal(marked.status, 404);
	const signedOut = await patchFolder(f.request("/api/folders/receipts", "PATCH", { name: "Mine" }, "not-a-session"), f.params("receipts"));
	assert.equal(signedOut.status, 401);
	assert.equal(f.row("SELECT name FROM folders WHERE id = 'receipts'").name, "Receipts");
	assert.equal(f.row("SELECT read FROM messages WHERE id = 'inbox-unread'").read, 0);
});

test("deleting a folder returns its emails to the Inbox and unfiles its rules", async (t) => {
	const f = await fixture(t);
	const response = await deleteFolder(f.request("/api/folders/receipts", "DELETE"), f.params("receipts"));
	assert.equal(response.status, 200);
	assert.equal(f.row("SELECT COUNT(*) AS n FROM folders WHERE id = 'receipts'").n, 0);
	assert.deepEqual(f.row("SELECT folder_id, status FROM messages WHERE id = 'filed'"), { folder_id: null, status: "received" });
	assert.equal(f.row("SELECT folder_id FROM routing_rules WHERE id = 'rule'").folder_id, null);
	assert.equal(f.row("SELECT COUNT(*) AS n FROM folders WHERE id = 'travel'").n, 1);
});

test("mark all as read on the Inbox leaves filed, snoozed and archived mail alone", async (t) => {
	const f = await fixture(t);
	const response = await readAll(f.request("/api/messages/read-all", "POST", { mailboxId: "box" }));
	assert.deepEqual(await response.json(), { ok: true, count: 1 });
	const unread = (id) => f.row("SELECT read FROM messages WHERE id = ?", id).read === 0;
	assert.equal(unread("inbox-unread"), false);
	assert.equal(unread("snoozed"), true);
	assert.equal(unread("filed"), true);
	assert.equal(unread("archived"), true);
});

test("mark all as read on a folder only touches that folder", async (t) => {
	const f = await fixture(t);
	const response = await readAll(f.request("/api/messages/read-all", "POST", { mailboxId: "box", folderId: "receipts" }));
	assert.deepEqual(await response.json(), { ok: true, count: 1 });
	assert.equal(f.row("SELECT read FROM messages WHERE id = 'filed'").read, 1);
	assert.equal(f.row("SELECT read FROM messages WHERE id = 'inbox-unread'").read, 0);
	const foreign = await readAll(f.request("/api/messages/read-all", "POST", { mailboxId: "box", folderId: "nope" }));
	assert.equal(foreign.status, 404);
});

test("Undo moves rows back to where they all came from, and only then", () => {
	assert.deepEqual(getUndoTarget([{ status: "received", folderId: null }], "archive"), { action: "inbox" });
	assert.deepEqual(getUndoTarget([{ status: "received", folderId: "receipts" }], "trash"), { action: "folder", folderId: "receipts" });
	assert.deepEqual(getUndoTarget([{ status: "archived", folderId: null }], "inbox"), { action: "archive" });
	assert.deepEqual(getUndoTarget([{ status: "trash", folderId: null }], "inbox"), { action: "trash" });
	// Mixed origins, sent mail and spam training have no single honest way back.
	assert.equal(getUndoTarget([{ status: "received", folderId: null }, { status: "archived", folderId: null }], "trash"), null);
	assert.equal(getUndoTarget([{ status: "sent", folderId: null }], "trash"), null);
	assert.equal(getUndoTarget([{ status: "received", folderId: null }], "spam"), null);
	assert.equal(getUndoTarget([{ status: "spam", folderId: null }], "inbox"), null);
});

test("the snackbar names what moved", () => {
	assert.equal(describeMessageMove("archive", 1, true), "Conversation archived");
	assert.equal(describeMessageMove("trash", 3, false), "3 messages moved to Trash");
	assert.equal(describeMessageMove("folder", 2, true, "Receipts"), "2 conversations moved to Receipts");
});
