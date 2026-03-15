import express from "express";
import cors from "cors";
import morgan from "morgan";
import session from "express-session";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const logDir = path.join(__dirname, "../log");
const logRetentionMs = 7 * 24 * 60 * 60 * 1000;
const maxScore = 10;

const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET || "change-this-session-secret";
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:4000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const adminResetKey = process.env.ADMIN_RESET_KEY;
const normalizeName = (value: string) => value.replace(/\s+/g, "");
const allowedLoginNameMap = new Map(
  (process.env.ALLOWED_LOGIN_NAMES || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => [normalizeName(name), name] as const)
);

const ensureLogDirectory = () => {
  fs.mkdirSync(logDir, { recursive: true });
};

const getLogDate = () => new Date().toISOString().slice(0, 10);

const getClientIp = (req: express.Request) => {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : "";

  return (forwardedIp || req.ip || req.socket.remoteAddress || "unknown").replace(/^::ffff:/, "");
};

const getSessionUserName = (req: express.Request) => req.session?.userName ?? "-";

const isValidScore = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maxScore;

const appendJsonLog = async (prefix: "access" | "audit", payload: Record<string, unknown>) => {
  const filePath = path.join(logDir, `${prefix}-${getLogDate()}.log`);
  const line = `${JSON.stringify({ timestamp: new Date().toISOString(), ...payload })}\n`;
  await fsPromises.appendFile(filePath, line, "utf8");
};

const writeJsonLog = (prefix: "access" | "audit", payload: Record<string, unknown>) => {
  void appendJsonLog(prefix, payload).catch((error) => {
    console.error("log write failed", error);
  });
};

const writeAuditLog = (req: express.Request, action: string, details: Record<string, unknown> = {}) => {
  writeJsonLog("audit", {
    action,
    ip: getClientIp(req),
    userName: req.session.userName ?? null,
    ...details,
  });
};

const cleanupExpiredLogs = async () => {
  try {
    const entries = await fsPromises.readdir(logDir, { withFileTypes: true });
    const now = Date.now();

    await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const filePath = path.join(logDir, entry.name);
          const stats = await fsPromises.stat(filePath);
          if (now - stats.mtimeMs > logRetentionMs) {
            await fsPromises.unlink(filePath);
          }
        })
    );
  } catch (error) {
    console.error("log cleanup failed", error);
  }
};

ensureLogDirectory();
void cleanupExpiredLogs();

if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "20kb" }));
app.use(morgan("dev"));
morgan.token("client-ip", (req) => getClientIp(req as express.Request));
morgan.token("user-name", (req) => getSessionUserName(req as express.Request));
app.use(
  morgan((tokens, req, res) => JSON.stringify({
    ip: tokens["client-ip"](req, res),
    userName: tokens["user-name"](req, res),
    method: tokens.method(req, res),
    path: tokens.url(req, res),
    status: Number(tokens.status(req, res) || 0),
    responseTimeMs: Number(tokens["response-time"](req, res) || 0),
    contentLength: tokens.res(req, res, "content-length") ?? null,
  }), {
    stream: {
      write: (message) => {
        try {
          const parsed = JSON.parse(message.trim()) as Record<string, unknown>;
          writeJsonLog("access", parsed);
        } catch (error) {
          console.error("access log parse failed", error);
        }
      },
    },
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.use(
  session({
    name: "destiny.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 12 * 60 * 60 * 1000,
    },
  })
);

declare module "express-session" {
  interface SessionData {
    userName?: string;
  }
}

// 로그인: 이름만으로 세션에 저장
app.post("/api/login", loginLimiter, async (req, res) => {
  const { name } = req.body as { name?: string };
  const normalizedName = normalizeName(typeof name === "string" ? name : "");
  if (!normalizedName) {
    writeAuditLog(req, "login_failed", { reason: "missing_name" });
    return res.status(400).json({ message: "name is required" });
  }

  let loginName = normalizedName;
  if (allowedLoginNameMap.size > 0) {
    const allowedName = allowedLoginNameMap.get(normalizedName);
    if (!allowedName) {
      writeAuditLog(req, "login_failed", { reason: "name_not_allowed", attemptedName: normalizedName });
      return res.status(403).json({ message: "이름을 정확하게 입력하세요!" });
    }
    loginName = allowedName;
  }

  req.session.userName = loginName;
  writeAuditLog(req, "login_success", { loginName });
  res.json({ name: loginName });
});

app.post("/api/logout", (req, res) => {
  writeAuditLog(req, "logout");
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
  if (Number.isNaN(id) || !isValidScore(scoreA) || !isValidScore(scoreB)) {
    writeAuditLog(req, "score_update_failed", { matchId: req.params.id, reason: "invalid_payload" });
    return res.status(400).json({ message: "score must be an integer between 0 and 10" });
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
  writeAuditLog(req, "score_updated", { matchId: id, scoreA, scoreB });
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
  if (!voterName) {
    writeAuditLog(req, "vote_submit_failed", { reason: "not_logged_in" });
    return res.status(401).json({ message: "not logged in" });
  }
  if (!targetName || targetName === voterName) {
    writeAuditLog(req, "vote_submit_failed", { reason: "invalid_target" });
    return res.status(400).json({ message: "invalid target" });
  }

  try {
    const vote = await prisma.vote.upsert({
      where: { voterName },
      create: { voterName, targetName },
      update: { targetName },
    });
    writeAuditLog(req, "vote_submitted", { hasTarget: true });
    res.json(vote);
  } catch (_error) {
    writeAuditLog(req, "vote_submit_failed", { reason: "server_error" });
    res.status(500).json({ message: "failed to vote" });
  }
});

app.get("/api/votes/me", async (req, res) => {
  const voterName = req.session.userName;
  if (!voterName) return res.status(401).json({ message: "not logged in" });
  const vote = await prisma.vote.findUnique({ where: { voterName } });
  res.json({ targetName: vote?.targetName ?? null });
});

app.delete("/api/votes/me", async (req, res) => {
  const voterName = req.session.userName;
  if (!voterName) {
    writeAuditLog(req, "vote_clear_failed", { reason: "not_logged_in" });
    return res.status(401).json({ message: "not logged in" });
  }

  await prisma.vote.deleteMany({ where: { voterName } });
  writeAuditLog(req, "vote_cleared");
  res.status(204).end();
});

app.post("/api/votes/reset", async (req, res) => {
  const requesterName = req.session.userName;
  if (!requesterName) {
    writeAuditLog(req, "vote_reset_failed", { reason: "not_logged_in" });
    return res.status(401).json({ message: "not logged in" });
  }
  if (requesterName !== "임창용") {
    writeAuditLog(req, "vote_reset_failed", { reason: "forbidden_user" });
    return res.status(403).json({ message: "forbidden" });
  }
  if (adminResetKey) {
    const key = req.header("x-admin-reset-key");
    if (key !== adminResetKey) {
      writeAuditLog(req, "vote_reset_failed", { reason: "invalid_admin_key" });
      return res.status(403).json({ message: "invalid admin key" });
    }
  }

  const result = await prisma.vote.deleteMany();
  writeAuditLog(req, "vote_reset", { deletedCount: result.count });
  res.json({ deletedCount: result.count });
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

// 클라이언트 빌드 파일 서빙 (프로덕션)
const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
