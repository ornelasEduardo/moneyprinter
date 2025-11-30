const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Migrating passwords...');
  
  // Note: password_hash is still in users table at this point
  const users = await prisma.users.findMany();

  console.log(`Found ${users.length} users to migrate.`);

  for (const user of users) {
    if (user.password_hash) {
      await prisma.user_passwords.upsert({
        where: { user_id: user.id },
        update: { password_hash: user.password_hash },
        create: {
          user_id: user.id,
          password_hash: user.password_hash
        }
      });
    }
  }

  console.log('Password migration complete.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
