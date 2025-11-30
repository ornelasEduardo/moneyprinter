const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const readline = require('readline');
require('dotenv').config({ path: '.env' });

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function changePassword() {
  try {
    console.log('\n=== Change User Password ===\n');
    
    const username = await question('Enter username (real or sandbox): ');
    
    // Check if user exists
    const user = await prisma.users.findUnique({
      where: { username },
      select: { id: true, display_name: true }
    });
    
    if (!user) {
      console.log(`\n❌ User "${username}" not found.`);
      rl.close();
      return;
    }
    
    console.log(`\nChanging password for: ${user.display_name}`);
    
    const newPassword = await question('Enter new password: ');
    
    if (newPassword.length < 6) {
      console.log('\n❌ Password must be at least 6 characters long.');
      rl.close();
      return;
    }
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear any existing sessions
    await prisma.$transaction([
      prisma.user_passwords.upsert({
        where: { user_id: user.id },
        update: { password_hash: passwordHash },
        create: { user_id: user.id, password_hash: passwordHash }
      }),
      prisma.users.update({
        where: { id: user.id },
        data: {
          session_token: null,
          session_expires_at: null
        }
      })
    ]);
    
    console.log('\n✅ Password changed successfully!');
    console.log('   All existing sessions have been invalidated.');
    
  } catch (err) {
    console.error('\n❌ Error changing password:', err);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

changePassword();
