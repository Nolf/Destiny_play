import express from "express";
import cors from "cors";
import morgan from "morgan";
import session from "express-session";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.use(
  session({
    secret: "tennis-event-secret",
    resave: false,
    saveUninitialized: true,
  })
);

declare module "express-session" {
  interface SessionData {
    userName?: string;
  }
}

// 로그인: 이름만으로 세션에 저장
app.post("/api/login", async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }
  req.session.userName = name;
  res.json({ name });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(204).end();
  });
});

app.get("/api/me", (req, res) => {
  if (!req.session.userName) {
    return res.status(401).json({ message: "not logged in" });
  }
  res.json({ name: req.session.userName });
});

// 전체 경기 조회
app.get("/api/matches", async (_req, res) => {
  const matches = await prisma.match.findMany({
    orderBy: [{ round: "asc" }, { court: "asc" }],
  });
  res.json(matches);
});

// 점수 업데이트
app.put("/api/matches/:id/score", async (req, res) => {
  const id = Number(req.params.id);
  const { scoreA, scoreB } = req.body as { scoreA?: number; scoreB?: number };
  if (Number.isNaN(id) || scoreA == null || scoreB == null) {
    return res.status(400).json({ message: "invalid payload" });
  }
  const updated = await prisma.match.update({
    where: { id },
    data: {
      scoreA,
      scoreB,
      lastUpdatedBy: req.session.userName ?? null,
      lastUpdatedAt: new Date(),
    },
  });
  res.json(updated);
});

// 합산 결과
app.get("/api/summary", async (_req, res) => {
  const matches = await prisma.match.findMany();
  const stats: Record<
    string,
    { name: string; played: number; wins: number; losses: number; draws: number; scored: number; conceded: number }
  > = {};

  const addPlayer = (name: string) => {
    if (!stats[name]) {
      stats[name] = { name, played: 0, wins: 0, losses: 0, draws: 0, scored: 0, conceded: 0 };
    }
    return stats[name];
  };

  for (const m of matches) {
    const playersA = [m.teamAPlayer1, m.teamAPlayer2];
    const playersB = [m.teamBPlayer1, m.teamBPlayer2];

    const isDraw = m.scoreA === m.scoreB;
    const teamAWon = m.scoreA > m.scoreB;
    const teamBWon = m.scoreB > m.scoreA;

    for (const p of playersA) {
      const s = addPlayer(p);
      s.played += 1;
      s.scored += m.scoreA;
      s.conceded += m.scoreB;
      if (isDraw) s.draws += 1;
      else if (teamAWon) s.wins += 1;
      else if (teamBWon) s.losses += 1;
    }
    for (const p of playersB) {
      const s = addPlayer(p);
      s.played += 1;
      s.scored += m.scoreB;
      s.conceded += m.scoreA;
      if (isDraw) s.draws += 1;
      else if (teamBWon) s.wins += 1;
      else if (teamAWon) s.losses += 1;
    }
  }

  const summary = Object.values(stats).sort(
    (a, b) => b.wins - a.wins || (b.scored - b.conceded) - (a.scored - a.conceded)
  );
  res.json(summary);
});

// 마니또 투표
app.post("/api/votes", async (req, res) => {
  const voterName = req.session.userName;
  const { targetName } = req.body as { targetName?: string };
  if (!voterName) return res.status(401).json({ message: "not logged in" });
  if (!targetName || targetName === voterName) {
    return res.status(400).json({ message: "invalid target" });
  }

  try {
    const vote = await prisma.vote.upsert({
      where: { voterName },
      create: { voterName, targetName },
      update: { targetName },
    });
    res.json(vote);
  } catch (e) {
    res.status(500).json({ message: "failed to vote" });
  }
});

app.get("/api/votes/summary", async (_req, res) => {
  const votes = await prisma.vote.groupBy({
    by: ["targetName"],
    _count: { targetName: true },
    orderBy: { _count: { targetName: "desc" } },
  });
  res.json(
    votes.map(v => ({
      targetName: v.targetName,
      count: v._count.targetName,
    }))
  );
});

// 공통 에러 처리 미들웨어
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
