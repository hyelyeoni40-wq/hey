import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { Role } from "../src/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PASSWORD = "Passw0rd!";

async function upsertUser(email: string, name: string, role: Role) {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });
}

async function main() {
  const teacher = await upsertUser("teacher@example.com", "김선생", Role.TEACHER);

  const students = await Promise.all(
    [
      ["student1@example.com", "이학생"],
      ["student2@example.com", "박학생"],
      ["student3@example.com", "최학생"],
      ["student4@example.com", "정학생"],
    ].map(([email, name]) => upsertUser(email, name, Role.STUDENT))
  );

  const parent1 = await upsertUser("parent1@example.com", "이학부모", Role.PARENT);
  const parent2 = await upsertUser("parent2@example.com", "박학부모", Role.PARENT);

  // parent1 has two children, parent2 has one — covers the 2+ children UI case
  await prisma.parentChild.upsert({
    where: { parentId_studentId: { parentId: parent1.id, studentId: students[0].id } },
    update: {},
    create: { parentId: parent1.id, studentId: students[0].id },
  });
  await prisma.parentChild.upsert({
    where: { parentId_studentId: { parentId: parent1.id, studentId: students[1].id } },
    update: {},
    create: { parentId: parent1.id, studentId: students[1].id },
  });
  await prisma.parentChild.upsert({
    where: { parentId_studentId: { parentId: parent2.id, studentId: students[2].id } },
    update: {},
    create: { parentId: parent2.id, studentId: students[2].id },
  });

  const cls = await prisma.class.upsert({
    where: { id: "seed-class-1" },
    update: {},
    create: {
      id: "seed-class-1",
      name: "1학년 3반",
      subject: "국어",
      teacherId: teacher.id,
    },
  });

  for (const student of students) {
    await prisma.enrollment.upsert({
      where: { classId_studentId: { classId: cls.id, studentId: student.id } },
      update: {},
      create: { classId: cls.id, studentId: student.id },
    });
  }

  console.log("Seed complete.");
  console.log(`Default password for all seeded users: ${DEFAULT_PASSWORD}`);
  console.log("teacher@example.com (교사)");
  console.log("student1..4@example.com (학생)");
  console.log("parent1@example.com (student1, student2 학부모), parent2@example.com (student3 학부모)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
