import { PrismaClient, UserType, PlanCode } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  const permissions = [
    ["users.read","Consulter les utilisateurs"],["users.update","Modifier les utilisateurs"],["users.delete","Supprimer les utilisateurs"],
    ["admins.create","Créer des administrateurs"],["admins.read","Consulter les administrateurs"],["admins.update","Modifier les administrateurs"],["admins.delete","Désactiver les administrateurs"],
    ["courses.create","Créer des cours"],["courses.read","Consulter les cours"],["courses.update","Modifier les cours"],["courses.delete","Supprimer les cours"],
    ["exams.create","Créer des épreuves"],["exams.read","Consulter les épreuves"],["exams.update","Modifier les épreuves"],["exams.delete","Supprimer les épreuves"],
    ["subjects.manage","Gérer les matières"],["schools.manage","Gérer les établissements"],["analytics.read","Consulter les analytics"],["settings.manage","Gérer les paramètres"],
    ["payments.read","Consulter les paiements"],["payments.manage","Gérer les paiements"],["quizzes.create","Créer des petits tests"],["quizzes.read","Consulter les petits tests"],["quizzes.update","Modifier les petits tests"],["quizzes.delete","Supprimer les petits tests"]
  ];
  for (const [key, description] of permissions) await prisma.permission.upsert({ where: { key }, update: { description }, create: { key, description } });
  const superRole = await prisma.role.upsert({ where: { name: "SUPER_ADMIN" }, update: {}, create: { name: "SUPER_ADMIN" } });
  const all = await prisma.permission.findMany();
  for (const permission of all) await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: superRole.id, permissionId: permission.id } }, update: {}, create: { roleId: superRole.id, permissionId: permission.id } });

  await prisma.plan.upsert({ where: { code: PlanCode.FREE }, update: {}, create: { code: PlanCode.FREE, name: "Gratuit", description: "Accès aux contenus gratuits." } });
  await prisma.plan.upsert({ where: { code: PlanCode.PREMIUM }, update: {}, create: { code: PlanCode.PREMIUM, name: "Premium", description: "Architecture réservée aux fonctionnalités futures." } });
  const levelNames = [
    "6e", "5e", "4e", "3e",
    "Seconde A", "Seconde C", "Seconde D",
    "Première A", "Première C", "Première D",
    "Terminale A", "Terminale C", "Terminale D",
    "Licence 1", "Licence 2", "Licence 3",
  ];
  for (const name of levelNames) {
    await prisma.academicLevel.upsert({ where: { name }, update: {}, create: { name } });
  }

  const subjectNames = ["Mathématiques", "Français", "Informatique"];
  for (const name of subjectNames) {
    await prisma.subject.upsert({ where: { name }, update: {}, create: { name } });
  }

  const informatique = await prisma.program.upsert({
    where: { name: "Informatique" },
    update: { kind: "FILIERE" },
    create: { name: "Informatique", kind: "FILIERE" },
  });

  const quizSeeds = [
    {
      title: "Petit test de mathématiques — 6e",
      slug: "petit-test-mathematiques-6e",
      description: "Un premier entraînement court pour les élèves de 6e.",
      level: "6e",
      subject: "Mathématiques",
      programId: null,
      questions: [
        ["Combien font 7 + 5 ?", "10", "11", "12", "13", "C", "7 + 5 = 12."],
        ["Quel est le double de 8 ?", "12", "14", "16", "18", "C", "Le double de 8 est 16."],
        ["Combien y a-t-il de côtés sur un triangle ?", "2", "3", "4", "5", "B", "Un triangle possède 3 côtés."],
        ["Quelle fraction représente une moitié ?", "1/2", "1/3", "2/3", "3/4", "A", "Une moitié correspond à 1/2."],
        ["Combien font 20 - 7 ?", "11", "12", "13", "14", "C", "20 - 7 = 13."],
      ],
    },
    {
      title: "Petit test de français — 5e",
      slug: "petit-test-francais-5e",
      description: "Un entraînement court sur les bases du français en 5e.",
      level: "5e",
      subject: "Français",
      programId: null,
      questions: [
        ["Dans « Les élèves travaillent », quel est le sujet ?", "Les", "élèves", "travaillent", "Les élèves travaillent", "B", "Le groupe sujet est « Les élèves »."],
        ["Quel est le pluriel de « cheval » ?", "chevals", "chevaux", "chevaus", "chevales", "B", "Le pluriel de cheval est chevaux."],
        ["Quel mot est un verbe dans « Marie lit un livre » ?", "Marie", "livre", "lit", "un", "C", "« lit » est le verbe du groupe verbal."],
        ["Quel est le contraire de « difficile » ?", "compliqué", "dur", "facile", "long", "C", "Le contraire de difficile est facile."],
        ["Quelle phrase est correctement écrite ?", "Ils mange.", "Ils manges.", "Ils mangent.", "Ils mangeons.", "C", "Avec « ils », le verbe manger se conjugue « mangent »."],
      ],
    },
    {
      title: "Petit test d'informatique — Licence 1",
      slug: "petit-test-informatique-licence-1",
      description: "Premiers réflexes en informatique pour les étudiants de Licence 1 en Informatique.",
      level: "Licence 1",
      subject: "Informatique",
      programId: informatique.id,
      questions: [
        ["Que signifie CPU ?", "Central Processing Unit", "Computer Personal Unit", "Control Program Utility", "Central Program User", "A", "CPU signifie Central Processing Unit."],
        ["Quel langage est principalement utilisé pour structurer une page web ?", "HTML", "SQL", "Python", "Java", "A", "HTML structure le contenu d'une page web."],
        ["Quel symbole commence généralement un commentaire sur une seule ligne en JavaScript ?", "//", "##", "<!--", "**", "A", "En JavaScript, // introduit un commentaire sur une ligne."],
        ["Que signifie SQL ?", "Simple Query Language", "Structured Query Language", "System Question Logic", "Sequential Query List", "B", "SQL signifie Structured Query Language."],
        ["Quel type de donnée représente VRAI ou FAUX ?", "String", "Number", "Boolean", "Array", "C", "Boolean représente une valeur vraie ou fausse."],
      ],
    },
  ];

  for (const seed of quizSeeds) {
    const subject = await prisma.subject.findUniqueOrThrow({ where: { name: seed.subject } });
    const level = await prisma.academicLevel.findUniqueOrThrow({ where: { name: seed.level } });
    const quiz = await prisma.quiz.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        description: seed.description,
        status: "PUBLISHED",
        subjectId: subject.id,
        academicLevelId: level.id,
        programId: seed.programId,
      },
      create: {
        title: seed.title,
        slug: seed.slug,
        description: seed.description,
        status: "PUBLISHED",
        subjectId: subject.id,
        academicLevelId: level.id,
        programId: seed.programId,
      },
    });
    await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
    await prisma.quizQuestion.createMany({
      data: seed.questions.map((q, index) => ({
        quizId: quiz.id,
        question: q[0],
        optionA: q[1],
        optionB: q[2],
        optionC: q[3],
        optionD: q[4],
        correctOption: q[5],
        explanation: q[6],
        order: index,
      })),
    });
  }


  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!email || !password) {
    if (process.env.NODE_ENV === "production") throw new Error("SUPER_ADMIN_EMAIL et SUPER_ADMIN_PASSWORD sont requis.");
    console.log("Seed: Super Admin non créé (variables d'environnement absentes).");
    return;
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({ data: { firstName: "Super", lastName: "Admin", email, passwordHash: await hashPassword(password), type: UserType.SUPER_ADMIN } });
    console.log("Seed: Super Admin créé.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());