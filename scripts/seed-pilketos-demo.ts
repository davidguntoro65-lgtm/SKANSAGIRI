import crypto from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client/index";

const nis = "101010";
const nisn = "DUMMY-101010";
const fullName = "Siswa Dummy Pilketos";
const email = "siswa.101010@akun.smkn1wonogiri.local";
const password = process.env.PILKETOS_DEMO_PASSWORD;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL wajib tersedia untuk menjalankan seed Pilketos.");
}

if (!password || password.length < 8) {
  throw new Error("PILKETOS_DEMO_PASSWORD wajib diisi dan minimal 8 karakter.");
}

function hashPassword(value: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(value, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter } as any);

try {
  const result = await db.$transaction(async (tx) => {
    const role = await tx.coreRole.upsert({
      where: { name: "SISWA" },
      update: {},
      create: { name: "SISWA" },
    });

    const existingStudent = await tx.coreStudent.findFirst({
      where: { OR: [{ nis }, { nisn }] },
      select: { id: true, userId: true },
    });

    const emailOwner = await tx.coreUser.findUnique({ where: { email } });
    if (emailOwner && existingStudent?.userId && emailOwner.id !== existingStudent.userId) {
      throw new Error(`Email akun demo sudah digunakan user lain: ${email}`);
    }

    const existingUser = existingStudent?.userId
      ? await tx.coreUser.findUnique({ where: { id: existingStudent.userId } })
      : emailOwner;
    const passwordHash = hashPassword(password);
    const user = existingUser
      ? await tx.coreUser.update({
          where: { id: existingUser.id },
          data: {
            email,
            fullName,
            status: "ACTIVE",
            passwordHash,
            passwordChangeRecommended: false,
          },
        })
      : await tx.coreUser.create({
          data: {
            email,
            fullName,
            status: "ACTIVE",
            passwordHash,
            passwordChangeRecommended: false,
          },
        });

    const student = existingStudent
      ? await tx.coreStudent.update({
          where: { id: existingStudent.id },
          data: { nisn, nis, fullName, status: "ACTIVE", userId: user.id },
        })
      : await tx.coreStudent.create({
          data: { nisn, nis, fullName, status: "ACTIVE", userId: user.id },
        });

    await tx.coreUserRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    return { studentId: student.id, userId: user.id };
  });

  console.log(`Akun demo Pilketos siap untuk NIS ${nis}. ID siswa: ${result.studentId}`);
} finally {
  await db.$disconnect();
}