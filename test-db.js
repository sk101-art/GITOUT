const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.user.findFirst();
    console.log("Success:", user);
  } catch (error) {
    console.error("Prisma error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
