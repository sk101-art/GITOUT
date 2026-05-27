const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany();
    for (const user of users) {
      if (user.email && user.email !== user.email.toLowerCase()) {
        await prisma.user.update({
          where: { id: user.id },
          data: { email: user.email.toLowerCase() }
        });
        console.log(`Updated email for user ${user.name} to ${user.email.toLowerCase()}`);
      }
    }
    console.log("Finished updating emails.");
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
