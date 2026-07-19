import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_eFg08dXqClzY@ep-damp-moon-az20zu8v.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
});

async function main() {
  console.log("Checking connection to Neon PostgreSQL...");
  try {
    const userCount = await prisma.user.count();
    console.log(`✅ Success! Connected to Neon. Current User Count: ${userCount}`);
  } catch (error) {
    console.error("❌ Connection failed with error:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
