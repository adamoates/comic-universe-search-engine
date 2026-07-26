const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const creators = [
  { name: "Peach Momoko", tier: 1 },
  { name: 'Stanley "Artgerm" Lau', tier: 1 },
  { name: "J. Scott Campbell", tier: 1 },
  { name: "Skottie Young", tier: 2 },
  { name: "Adam Hughes", tier: 2 },
  { name: "Frank Cho", tier: 2 },
  { name: "Jenny Frison", tier: 2 },
  { name: "Joshua Middleton", tier: 2 },
  { name: "Gabriele Dell'Otto", tier: 2 },
  { name: "Todd McFarlane", tier: 3 },
  { name: "Jim Lee", tier: 3 },
  { name: "Alex Ross", tier: 3 },
  { name: "Greg Capullo", tier: 3 },
  { name: "Mark Brooks", tier: 3 },
];

async function main() {
  console.log("Seeding HotCreator table...");

  for (const creator of creators) {
    await prisma.hotCreator.upsert({
      where: { name: creator.name },
      update: { tier: creator.tier },
      create: {
        name: creator.name,
        tier: creator.tier,
        active: true,
      },
    });
    console.log(`  Upserted: ${creator.name} (Tier ${creator.tier})`);
  }

  console.log(`Seeding complete. ${creators.length} creators processed.`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
