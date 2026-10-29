import fs from "fs";
import path from "path";
import pool from "../lib/db.js";

async function seed() {
  console.log("==========================================");
  console.log("         CRM Database Seeder              ");
  console.log("==========================================");

  try {
    const seedPath = path.resolve("db/seed.sql");
    const seedSql = fs.readFileSync(seedPath, "utf8");

    console.log("Applying seed records from db/seed.sql...");
    await pool.query(seedSql);
    console.log("✓ Seed records applied successfully!");

    const userCount = await pool.query("SELECT COUNT(*) FROM users");
    const customerCount = await pool.query("SELECT COUNT(*) FROM customers");
    const interactionCount = await pool.query("SELECT COUNT(*) FROM interactions");

    console.log(`\nDatabase Counts:`);
    console.log(`  • Users:        ${userCount.rows[0].count}`);
    console.log(`  • Customers:    ${customerCount.rows[0].count}`);
    console.log(`  • Interactions: ${interactionCount.rows[0].count}\n`);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err.message);
    await pool.end();
    process.exit(1);
  }
}

seed();
