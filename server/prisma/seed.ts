import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 12명 참가자 이름 예시 – 실제 이름에 맞게 수정 가능
const players = [
  "입창용",
  "김재영",
  "박상환",
  "김우나",
  "이종현",
  "최우일",
  "조용용",
  "김학문",
  "정형석",
  "최우일B",
  "김학찬",
  "김영수",
];

async function main() {
  // 기존 데이터 삭제
  await prisma.vote.deleteMany();
  await prisma.match.deleteMany();

  // 경기 편성은 이미지 구조를 참고한 예시 데이터입니다.
  // 필요 시 이후에 실제 일정에 맞게 수정하시면 됩니다.
  const matchesData = [
    {
      round: "R1",
      court: 1,
      teamAPlayer1: players[0],
      teamAPlayer2: players[1],
      teamBPlayer1: players[2],
      teamBPlayer2: players[3],
    },
    {
      round: "R1",
      court: 2,
      teamAPlayer1: players[4],
      teamAPlayer2: players[5],
      teamBPlayer1: players[6],
      teamBPlayer2: players[7],
    },
    {
      round: "R2",
      court: 1,
      teamAPlayer1: players[0],
      teamAPlayer2: players[2],
      teamBPlayer1: players[4],
      teamBPlayer2: players[6],
    },
    {
      round: "R2",
      court: 2,
      teamAPlayer1: players[1],
      teamAPlayer2: players[3],
      teamBPlayer1: players[5],
      teamBPlayer2: players[7],
    },
    // 나머지 라운드도 필요 시 추가
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

