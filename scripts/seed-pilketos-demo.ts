import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client/index";

const nis = "10101010";
const nisn = "DUMMY-10101010";
const fullName = "Siswa Simulasi Pilketos";

if (process.env.NODE_ENV === "production") {
  throw new Error("Akun simulasi Pilketos hanya boleh dibuat di lingkungan nonproduction.");
}
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL wajib tersedia untuk menjalankan seed Pilketos.");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter } as any);

try {
  const result = await db.$transaction(async (tx) => {
    const existingStudent = await tx.coreStudent.findFirst({
      where: { OR: [{ nis }, { nisn }] },
      select: { id: true, nis: true, nisn: true, fullName: true },
    });

    if (existingStudent) {
      if (
        existingStudent.nis !== nis ||
        existingStudent.nisn !== nisn ||
        existingStudent.fullName !== fullName
      ) {
        throw new Error("NIS/NISN simulasi sudah digunakan record siswa lain; tidak ada data yang diubah.");
      }
      return { studentId: existingStudent.id, created: false };
    }

    const student = await tx.coreStudent.create({
      data: { nisn, nis, fullName, status: "ACTIVE" },
    });

    return { studentId: student.id, created: true };
  });

  const action = result.created ? "dibuat" : "sudah tersedia";
  console.log(`NIS simulasi Pilketos ${nis} ${action}. ID siswa: ${result.studentId}`);
} finally {
  await db.$disconnect();
}