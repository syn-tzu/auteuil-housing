/**
 * Create or delete a temporary login for testing the live app.
 *   npm run test-user -- create     prints the email + password
 *   npm run test-user -- delete
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: false });
import { randomBytes } from "node:crypto";
import { createAdminClient } from "../src/lib/supabase/admin";

const EMAIL = "maptest@auteuil-housing.invalid";

async function main() {
  const db = createAdminClient();
  const cmd = process.argv[2];
  const { data: users } = await db.auth.admin.listUsers({ perPage: 50 });
  const existing = users?.users.find((u) => u.email === EMAIL);
  if (cmd === "create") {
    if (existing) await db.auth.admin.deleteUser(existing.id);
    const password = randomBytes(12).toString("base64url");
    const { error } = await db.auth.admin.createUser({ email: EMAIL, password, email_confirm: true, user_metadata: { name: "Test" } });
    if (error) throw error;
    console.log(JSON.stringify({ email: EMAIL, password }));
  } else if (cmd === "delete") {
    if (existing) {
      await db.auth.admin.deleteUser(existing.id);
      console.log("deleted");
    } else console.log("no test user");
  } else throw new Error("usage: create | delete");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
