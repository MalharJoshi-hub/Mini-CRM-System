import fs from "fs";
import path from "path";
import pool from "../lib/db.js";

async function migrate() {
  console.log("==========================================");
  console.log("     CRM PostgreSQL Schema Migration      ");
  console.log("==========================================");

  try {
    const schemaPath = path.resolve("db/schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("Applying schema DDL from db/schema.sql...");
    await pool.query(schemaSql);
    console.log("✓ Schema applied successfully!");

    // Verify existing tables
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log("\nConfirmed tables in public schema:");
    res.rows.forEach((r) => console.log(`  • ${r.table_name}`));
    console.log("\nDatabase is ready for CRM operations.\n");

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    await pool.end();
    process.exit(1);
  }
}

migrate();
