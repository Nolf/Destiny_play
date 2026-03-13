import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 기존 데이터 삭제
  await prisma.vote.deleteMany();
  await prisma.match.deleteMany();

  // 이미지 일정표 기준 고정 편성(R1~R6, 1코트/2코트)
  const matchesData = [
    {
      round: "R1",
      court: 1,
      teamAPlayer1: "정현석",
      teamAPlayer2: "김재형",
      teamBPlayer1: "김영준",
      teamBPlayer2: "박성창",
    },
    {
      round: "R1",
      court: 2,
      teamAPlayer1: "이경하",
      teamAPlayer2: "조음정",
      teamBPlayer1: "최우임",
      teamBPlayer2: "김유나",
    },
    {
      round: "R2",
      court: 1,
      teamAPlayer1: "임창용",
      teamAPlayer2: "이종현",
      teamBPlayer1: "박성찬",
      teamBPlayer2: "김영준",
    },
    {
      round: "R2",
      court: 2,
      teamAPlayer1: "조음정",
      teamAPlayer2: "이경하",
      teamBPlayer1: "김혜원",
      teamBPlayer2: "최우임",
    },
    {
      round: "R3",
      court: 1,
      teamAPlayer1: "임창용",
      teamAPlayer2: "정현석",
      teamBPlayer1: "박성찬",
      teamBPlayer2: "김유나",
    },
    {
      round: "R3",
      court: 2,
      teamAPlayer1: "이종현",
      teamAPlayer2: "이경하",
      teamBPlayer1: "박성창",
      teamBPlayer2: "김혜원",
    },
    {
      round: "R4",
      court: 1,
      teamAPlayer1: "임창용",
      teamAPlayer2: "조음정",
      teamBPlayer1: "김영준",
      teamBPlayer2: "김유나",
    },
    {
      round: "R4",
      court: 2,
      teamAPlayer1: "김재형",
      teamAPlayer2: "이종현",
      teamBPlayer1: "박성찬",
      teamBPlayer2: "최우임",
    },
    {
      round: "R5",
      court: 1,
      teamAPlayer1: "임창용",
      teamAPlayer2: "김재형",
      teamBPlayer1: "박성창",
      teamBPlayer2: "최우임",
    },
    {
      round: "R5",
      court: 2,
      teamAPlayer1: "정현석",
      teamAPlayer2: "조음정",
      teamBPlayer1: "김영준",
      teamBPlayer2: "김혜원",
    },
    {
      round: "R6",
      court: 1,
      teamAPlayer1: "이종현",
      teamAPlayer2: "정현석",
      teamBPlayer1: "박성찬",
      teamBPlayer2: "박성창",
    },
    {
      round: "R6",
      court: 2,
      teamAPlayer1: "김재형",
      teamAPlayer2: "이경하",
      teamBPlayer1: "김유나",
      teamBPlayer2: "김혜원",
    },
  ];

  for (const m of matchesData) {
    await prisma.match.create({
      data: {
        ...m,
        scoreA: 0,
        scoreB: 0,
      },
    });
  }

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

