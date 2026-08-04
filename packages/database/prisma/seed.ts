import { PrismaClient } from "../generated";

const prisma = new PrismaClient();

async function main() {
  await prisma.plan.createMany({
    data: [
      {
        name: "Starter",
        maxAdAccounts: 2,
        maxCheckoutConnections: 2,
        maxUsers: 3,
        maxEventsMonth: 50_000n,
        priceCents: 9700,
      },
      {
        name: "Pro",
        maxAdAccounts: 10,
        maxCheckoutConnections: 10,
        maxUsers: 10,
        maxEventsMonth: 500_000n,
        priceCents: 29700,
      },
      {
        name: "Agency",
        maxAdAccounts: 50,
        maxCheckoutConnections: 50,
        maxUsers: 50,
        maxEventsMonth: 5_000_000n,
        priceCents: 79700,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed concluído: planos criados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
