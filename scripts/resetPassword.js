import pool from "../lib/db.js";
import bcrypt from "bcrypt";

/**
 * CLI utility to reset or create user passwords in local PostgreSQL database.
 * Usage:
 *   node scripts/resetPassword.js [email] [newPassword] [role]
 * Examples:
 *   node scripts/resetPassword.js
 *   node scripts/resetPassword.js admin@test.com password123
 *   node scripts/resetPassword.js newuser@minicrm.io myPass456 admin
 */
async function main() {
  const args = process.argv.slice(2);
  const targetEmail = args[0];
  const targetPassword = args[1] || "password123";
  const targetRole = args[2] || "admin";

  console.log("==========================================");
  console.log("     CRM Password Reset / Setup Tool      ");
  console.log("==========================================\n");

  try {
    if (targetEmail) {
      const hashedPassword = await bcrypt.hash(targetPassword, 10);
      const checkRes = await pool.query("SELECT id, email, role FROM users WHERE email = $1", [targetEmail]);

      if (checkRes.rows.length > 0) {
        await pool.query("UPDATE users SET password = $1 WHERE email = $2", [hashedPassword, targetEmail]);
        console.log(`✓ Password updated for existing user: ${targetEmail}`);
        console.log(`  New Password: ${targetPassword}`);
      } else {
        await pool.query(
          "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
          [targetEmail.split("@")[0], targetEmail, hashedPassword, targetRole]
        );
        console.log(`✓ Created new user: ${targetEmail}`);
        console.log(`  Password: ${targetPassword}`);
        console.log(`  Role:     ${targetRole}`);
      }
    } else {
      // Default reset: ensure both standard demo accounts exist and are set to known passwords
      const defaultUsers = [
        { email: "admin@test.com", password: "password123", name: "Admin", role: "admin" },
        { email: "admin@minicrm.io", password: "password123", name: "CRM Administrator", role: "admin" }
      ];

      for (const u of defaultUsers) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        const check = await pool.query("SELECT id FROM users WHERE email = $1", [u.email]);
        if (check.rows.length > 0) {
          await pool.query("UPDATE users SET password = $1, role = $2 WHERE email = $3", [hashedPassword, u.role, u.email]);
          console.log(`✓ Reset password for: ${u.email} -> '${u.password}'`);
        } else {
          await pool.query(
            "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)",
            [u.name, u.email, hashedPassword, u.role]
          );
          console.log(`✓ Created user: ${u.email} -> '${u.password}'`);
        }
      }
    }

    console.log("\nCurrent active users in database:");
    const allUsers = await pool.query("SELECT id, name, email, role, created_at FROM users ORDER BY id ASC");
    console.table(allUsers.rows);

    console.log("\n✓ Done! You can now log into the CRM using the credentials above.");
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("Error resetting password:", err.message);
    await pool.end();
    process.exit(1);
  }
}

main();
