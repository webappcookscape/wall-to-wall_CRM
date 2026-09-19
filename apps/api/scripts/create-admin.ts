import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from apps/api/.env
const currentDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(currentDir, '../.env') });

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const options: Record<string, string> = {};
  const positional: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const eqIdx = arg.indexOf('=');
      if (eqIdx !== -1) {
        const key = arg.slice(2, eqIdx).toLowerCase();
        const val = arg.slice(eqIdx + 1);
        options[key] = val;
      } else {
        const key = arg.slice(2).toLowerCase();
        options[key] = 'true';
      }
    } else {
      positional.push(arg);
    }
  }

  // Positional mapping: [0] email, [1] password, [2] fullName, [3] username
  const email = (options.email || positional[0] || process.env.ADMIN_EMAIL || 'admin@wall2wall.com').trim().toLowerCase();
  const password = options.password || positional[1] || process.env.ADMIN_PASSWORD || 'admin123';
  const fullName = (options.name || options.fullname || positional[2] || process.env.ADMIN_FULLNAME || 'System Administrator').trim();
  const username = (options.username || positional[3] || process.env.ADMIN_USERNAME || email.split('@')[0] || 'admin').trim().toLowerCase();

  return { email, password, fullName, username };
}

async function main() {
  const { email, password, fullName, username } = parseArgs();

  console.log('=====================================================');
  console.log('👤 Wall-to-Wall CRM: Admin User Setup');
  console.log('=====================================================');
  console.log(`Target Email    : ${email}`);
  console.log(`Target Username : ${username}`);
  console.log(`Full Name       : ${fullName}`);
  console.log('Role            : ADMIN');
  console.log('Status          : ACTIVE');
  console.log('Meta Access     : ENABLED');
  console.log('-----------------------------------------------------');

  if (!email || !email.includes('@')) {
    console.error('❌ Error: A valid email address is required.');
    process.exit(1);
  }

  if (!password || password.length < 4) {
    console.error('❌ Error: Password must be at least 4 characters long.');
    process.exit(1);
  }

  // Hash password
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Check if user exists by email or username
  const userByEmail = await prisma.user.findUnique({
    where: { email },
  });

  const userByUsername = await prisma.user.findUnique({
    where: { username },
  });

  let targetUserId: string | null = null;
  let finalUsername = username;

  if (userByEmail && userByUsername && userByEmail.id !== userByUsername.id) {
    console.warn(`⚠️ Warning: Email "${email}" belongs to user ID ${userByEmail.id}, while username "${username}" belongs to user ID ${userByUsername.id}.`);
    console.warn(`Keeping existing username "${userByEmail.username}" for email "${email}" to avoid uniqueness collision.`);
    finalUsername = userByEmail.username;
    targetUserId = userByEmail.id;
  } else if (userByEmail) {
    targetUserId = userByEmail.id;
  } else if (userByUsername) {
    targetUserId = userByUsername.id;
  }

  if (targetUserId) {
    console.log(`🔄 Existing user found (ID: ${targetUserId}). Updating to ADMIN role and setting password...`);
    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        email,
        username: finalUsername,
        fullName: fullName || undefined,
        password: hashedPassword,
        role: Role.ADMIN,
        status: true,
        metaAccess: true,
      },
    });

    console.log('=====================================================');
    console.log('✅ Admin user successfully UPDATED:');
    console.log(`   ID       : ${updated.id}`);
    console.log(`   Username : ${updated.username}`);
    console.log(`   Email    : ${updated.email}`);
    console.log(`   Full Name: ${updated.fullName}`);
    console.log(`   Role     : ${updated.role}`);
    console.log(`   Status   : ${updated.status ? 'Active' : 'Inactive'}`);
    console.log(`   Access   : Meta Access Enabled (${updated.metaAccess})`);
    console.log(`   Password : Set to specified password`);
    console.log('=====================================================');
  } else {
    console.log(`✨ No existing user found with email "${email}". Creating new ADMIN user...`);
    const created = await prisma.user.create({
      data: {
        email,
        username: finalUsername,
        fullName,
        password: hashedPassword,
        role: Role.ADMIN,
        status: true,
        metaAccess: true,
      },
    });

    console.log('=====================================================');
    console.log('🎉 New Admin user successfully CREATED:');
    console.log(`   ID       : ${created.id}`);
    console.log(`   Username : ${created.username}`);
    console.log(`   Email    : ${created.email}`);
    console.log(`   Full Name: ${created.fullName}`);
    console.log(`   Role     : ${created.role}`);
    console.log(`   Status   : ${created.status ? 'Active' : 'Inactive'}`);
    console.log(`   Access   : Meta Access Enabled (${created.metaAccess})`);
    console.log(`   Password : Set to specified password`);
    console.log('=====================================================');
  }
}

main()
  .catch((err) => {
    console.error('❌ Error executing create-admin script:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
