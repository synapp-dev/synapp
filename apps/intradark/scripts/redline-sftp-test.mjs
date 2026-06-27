/**
 * Diagnose the active deploy target's SFTP auth: tries plain password first,
 * then keyboard-interactive (which Pterodactyl/Pelican SFTP often requires).
 * Run: pnpm exec dotenv -e .env.local -- node scripts/redline-sftp-test.mjs
 */
import { createClient } from "@supabase/supabase-js";
import SftpClient from "ssh2-sftp-client";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_ADMIN_KEY, {
  auth: { persistSession: false },
});
const { data: t, error } = await admin
  .from("redline_deploy_targets")
  .select("*")
  .eq("is_active", true)
  .maybeSingle();
if (error || !t) {
  console.error("no active target:", error?.message);
  process.exit(1);
}
console.log(`sftp ${t.sftp_user}@${t.sftp_host}:${t.sftp_port} (pw len ${t.sftp_password.length})`);

async function tryConnect(label, extra) {
  const sftp = new SftpClient();
  try {
    await sftp.connect({
      host: t.sftp_host,
      port: t.sftp_port,
      username: t.sftp_user,
      password: t.sftp_password,
      readyTimeout: 15000,
      ...extra,
    });
    const list = await sftp.list("/");
    console.log(`✔ ${label}: connected. root entries: ${list.map((f) => f.name).join(", ") || "(empty)"}`);
    await sftp.end();
    return true;
  } catch (e) {
    console.log(`✗ ${label}: ${e.message}`);
    try {
      await sftp.end();
    } catch {}
    return false;
  }
}

const okPw = await tryConnect("password", {});
if (!okPw) await tryConnect("keyboard-interactive", { tryKeyboard: true });
