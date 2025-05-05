// prisma/reset.ts
import { execSync } from "child_process";

async function main() {
  console.log("🚨 Resetting database...");

  // This will drop and recreate the database based on your schema
  execSync("npx prisma migrate reset --force --skip-seed", {
    stdio: "inherit",
  });

  console.log("✅ Database schema reset complete");
}

main().catch((e) => {
  console.error("❌ Failed to reset DB:", e);
  process.exit(1);
});
