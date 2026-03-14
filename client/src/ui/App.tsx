import React, { useEffect, useState } from "react";

type Match = {
  id: number;
  round: string;
  court: number;
  teamAPlayer1: string;
  teamAPlayer2: string;
  teamBPlayer1: string;
  teamBPlayer2: string;
  scoreA: number;
  scoreB: number;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const TEAM_ROSTER: { team: string; members: string[] }[] = [
  {
    team: "청팀",
    members: ["임창용", "이종현", "정현석", "이경하", "조음정", "김재형"],
  },
  {
    team: "홍팀",
    members: ["박성창", "박성찬", "최우임", "김유나", "김혜원", "김영준"],
  },
];

type ScheduleRow =
  | { type: "event"; time: string; duration: number; label: string }
  | { type: "match"; round: string; time: string; duration: number };

const SCHEDULE_ROWS: ScheduleRow[] = [
  { type: "event", time: "11:00 ~ 11:25", duration: 25, label: "마니또추첨 + 라켓빼기" },
  { type: "match", round: "R1", time: "11:25 ~ 11:50", duration: 25 },
  { type: "match", round: "R2", time: "11:50 ~ 12:15", duration: 25 },
  { type: "match", round: "R3", time: "12:15 ~ 12:40", duration: 25 },
  { type: "match", round: "R4", time: "12:40 ~ 13:05", duration: 25 },
  { type: "match", round: "R5", time: "13:05 ~ 13:30", duration: 25 },
  { type: "match", round: "R6", time: "13:30 ~ 13:55", duration: 25 },
  { type: "event", time: "13:55 ~ 14:00", duration: 5, label: "마니또결과 공개 + 마무리" },
];

export const App: React.FC = () => {
  const [me, setMe] = useState<string | null>(null);
  const [loginName, setLoginName] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [voteTarget, setVoteTarget] = useState("");
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voteSummary, setVoteSummary] = useState<{ targetName: string; count: number }[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.name) setMe(data.name);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!me) return;
    loadMatches();
    loadVoteSummary();
    loadMyVote();
  }, [me]);

  useEffect(() => {
    if (!me) return;
    const timerId = window.setInterval(() => {
      loadVoteSummary();
      loadMyVote();
    }, 5000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [me]);

  const loadMatches = async () => {
    const res = await fetch(`${API_BASE}/api/matches`, { credentials: "include" });
    if (res.ok) setMatches(await res.json());
  };

  const loadVoteSummary = async () => {
    const res = await fetch(`${API_BASE}/api/votes/summary`, { credentials: "include" });
    if (res.ok) setVoteSummary(await res.json());
  };

  const loadMyVote = async () => {
    const res = await fetch(`${API_BASE}/api/votes/me`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setMyVote(data.targetName ?? null);
      if (data.targetName) setVoteTarget(data.targetName);
      else setVoteTarget("");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = loginName.trim();
    if (!trimmed) return;
    // 서버 응답과 무관하게 먼저 클라이언트 상태를 전환하여 UX와 테스트를 안정적으로 유지합니다.
    setMe(trimmed);
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        // 세션 설정이 실패하면 다시 로그인 화면으로 되돌립니다.
        setMe(null);
      }
    } catch {
      setMe(null);
    }
  };

  const handleScoreChange = async (match: Match, field: "scoreA" | "scoreB", value: string) => {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return;
    const updated = { ...match, [field]: num };
    setMatches((prev) => prev.map((m) => (m.id === match.id ? updated : m)));
  };

  const handleScoreBlur = async (match: Match) => {
    await fetch(`${API_BASE}/api/matches/${match.id}/score`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ scoreA: match.scoreA, scoreB: match.scoreB }),
    });
  };

  const handleVote = async (target: string) => {
    if (!target) {
      setVoteTarget("");
      setMyVote(null);
      await fetch(`${API_BASE}/api/votes/me`, {
        method: "DELETE",
        credentials: "include",
      });
      await loadVoteSummary();
      return;
    }

    setVoteTarget(target);
    setMyVote(target);
    await fetch(`${API_BASE}/api/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ targetName: target }),
    });
    await loadVoteSummary();
  };

  const postResetVotes = async (adminKey?: string) => {
    const headers: Record<string, string> = {};
    if (adminKey) {
      headers["x-admin-reset-key"] = adminKey;
    }

    return fetch(`${API_BASE}/api/votes/reset`, {
      method: "POST",
      credentials: "include",
      headers,
    });
  };

  const handleResetVotes = async () => {
    const resetKeyStorage = "destiny_admin_reset_key";
    const savedKey = window.sessionStorage.getItem(resetKeyStorage) ?? "";
    let failureMessage = "";

    let res = await postResetVotes(savedKey || undefined);

    if (res.status === 403) {
      try {
        const data = await res.json();
        failureMessage = data?.message ?? "";
      } catch {
        failureMessage = "forbidden";
      }

      if (failureMessage === "invalid admin key") {
        const entered = window.prompt("관리자 초기화 키를 입력해 주세요.")?.trim() ?? "";
        if (!entered) return;

        window.sessionStorage.setItem(resetKeyStorage, entered);
        res = await postResetVotes(entered);

        if (!res.ok) {
          failureMessage = "";
        }
      }
    }

    if (!res.ok) {
      if (!failureMessage) {
        try {
          const data = await res.json();
          failureMessage = data?.message ?? "";
        } catch {
          failureMessage = "failed to reset votes";
        }
      }

      if (failureMessage === "invalid admin key") {
        window.sessionStorage.removeItem(resetKeyStorage);
      }
      window.alert(`초기화 실패: ${failureMessage || "권한을 확인해 주세요."}`);
      return;
    }

    setVoteTarget("");
    setMyVote(null);
    setVoteSummary([]);
    await loadVoteSummary();
    await loadMyVote();
  };

  const handleReenter = async () => {
    await fetch(`${API_BASE}/api/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    setMatches([]);
    setVoteTarget("");
    setMyVote(null);
    setVoteSummary([]);
    setLoginName(me ?? "");
    setMe(null);
  };

  if (!me) {
    return (
      <div
        className="relative min-h-screen flex items-start sm:items-center justify-center px-[0.65rem] sm:px-4 pt-0 pb-16 sm:py-10 overflow-hidden"
        style={{ background: "linear-gradient(145deg, #d6cdea 0%, #cec4e5 45%, #c7bddf 100%)" }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -top-28 -left-24 w-[28rem] h-[28rem] rounded-full opacity-35"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0) 72%)" }}
          />
          <div
            className="absolute -bottom-32 -right-28 w-[24rem] h-[24rem] rounded-full opacity-30"
            style={{ background: "radial-gradient(circle, rgba(179,160,219,0.85) 0%, rgba(179,160,219,0) 72%)" }}
          />
        </div>

        <div
          className="relative w-[96vw] sm:w-full max-w-[860px] rounded-[38px] overflow-hidden origin-center scale-[0.82] sm:scale-[0.68] md:scale-[0.75]"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.64) 0%, rgba(240,235,250,0.72) 100%)",
            border: "1px solid rgba(232,223,249,0.95)",
            boxShadow: "0 26px 55px rgba(84,57,143,0.22), 0 1px 0 rgba(255,255,255,0.85) inset",
            backdropFilter: "blur(12px)",
          }}
        >
          <div
            className="relative px-4 sm:px-5 md:px-12 py-8 md:py-10"
            style={{
              background:
                "radial-gradient(120% 110% at 0% 0%, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0) 56%), linear-gradient(145deg, rgba(235,227,248,0.9) 0%, rgba(225,215,244,0.7) 100%)",
              borderBottom: "1px solid rgba(207,191,235,0.7)",
            }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-[0.26]"
              style={{
                background: "repeating-radial-gradient(circle at 0 0, rgba(130,103,185,0.2) 0 18px, transparent 18px 54px)",
              }}
            />
            <div className="pointer-events-none absolute top-7 right-8 w-14 h-14 opacity-40"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0) 72%)" }}
            />
            <div className="pointer-events-none absolute bottom-8 right-24 w-10 h-10 opacity-35"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 72%)" }}
            />

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
              <div
                className="rounded-[28px] p-4 md:p-5"
                style={{
                  background: "linear-gradient(155deg, rgba(255,255,255,0.96) 0%, rgba(242,237,250,0.86) 100%)",
                  border: "1px solid rgba(234,227,248,0.92)",
                  boxShadow: "0 14px 30px rgba(100,78,158,0.18), 0 1px 0 rgba(255,255,255,0.95) inset",
                }}
              >
                <img
                  src="/destiny.png"
                  alt="Destiny Day"
                  draggable={false}
                  className="w-44 h-44 md:w-56 md:h-56 object-contain rounded-2xl"
                  style={{ opacity: 0.88 }}
                />
              </div>

              <div className="min-w-0 flex-1 text-center md:text-left pt-1 md:pt-4">
                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                  <span
                    className="inline-flex rounded-full px-4 py-1 text-[12px] font-semibold tracking-[0.18em] uppercase"
                    style={{
                      color: "#a0672d",
                      border: "1px solid rgba(186,135,85,0.42)",
                      background: "linear-gradient(90deg, rgba(247,220,189,0.55) 0%, rgba(247,220,189,0.18) 100%)",
                    }}
                  >
                    Tennis Club · 2026.03.13
                  </span>
                  <span className="hidden md:block h-px w-16" style={{ background: "rgba(160,109,61,0.4)" }} />
                </div>

                <h1 className="leading-none">
                  <span
                    className="text-[3.15rem] md:text-[4.35rem] font-bold tracking-[-0.04em]"
                    style={{
                      color: "#4f2b8d",
                      fontFamily: "Georgia, Times New Roman, serif",
                      textShadow: "0 10px 18px rgba(79,43,141,0.16)",
                    }}
                  >
                    Destiny
                  </span>
                  <span
                    className="text-[3.15rem] md:text-[4.35rem] font-semibold tracking-[-0.04em]"
                    style={{
                      color: "#c38e52",
                      fontFamily: "Georgia, Times New Roman, serif",
                    }}
                  >
                    DAY
                  </span>
                </h1>

                <div className="mt-2 flex items-center justify-center md:justify-start gap-3">
                  <span className="h-[3px] w-16 rounded-full" style={{ background: "linear-gradient(90deg, #a76735 0%, rgba(167,103,53,0.2) 100%)" }} />
                  <p className="text-[1.05rem] font-semibold tracking-[0.22em]" style={{ color: "#a76735" }}>
                    대시보드 입장
                  </p>
                  <span className="h-[3px] w-16 rounded-full" style={{ background: "linear-gradient(90deg, rgba(167,103,53,0.2) 0%, #a76735 100%)" }} />
                </div>

                <p className="mt-2 text-[0.95rem] font-semibold tracking-[0.16em] uppercase" style={{ color: "#7f6ba8" }}>
                  Photography Edition
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-5 md:px-12 py-9 md:py-10 bg-[rgba(255,255,255,0.72)]">
            <form onSubmit={handleLogin} className="max-w-[700px] mx-auto space-y-4">
              <div>
                <label className="block text-[1.7rem] md:text-[1.8rem] font-semibold mb-2" style={{ color: "#6b4fa8" }}>
                  이름
                </label>
                <input
                  className="w-full rounded-[22px] px-7 py-4 md:py-5 text-[1.2rem] md:text-[1.3rem] focus:outline-none"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(247,244,252,0.94) 100%)",
                    color: "#5a3a91",
                    border: "3px solid rgba(114,88,174,0.72)",
                    boxShadow: "0 6px 16px rgba(114,88,174,0.17), 0 1px 0 rgba(255,255,255,0.92) inset",
                  }}
                  placeholder="예: 임창용"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-[20px] py-4 text-[2rem] font-bold transition active:scale-[0.99]"
                style={{
                  color: "#d5a56d",
                  background: "linear-gradient(180deg, #47278a 0%, #3c1f79 100%)",
                  boxShadow: "0 9px 18px rgba(56,33,112,0.35), 0 1px 0 rgba(255,255,255,0.15) inset",
                }}
              >
                입장하기
              </button>
            </form>

            <p className="mt-8 text-center text-[0.85rem] md:text-[0.9rem]" style={{ color: "#9b8db8" }}>
              최대 35명 동시 접속 · 이름만 입력하면 됩니다
            </p>
          </div>
        </div>
      </div>
    );
  }

  const matchMap = new Map(matches.map((m) => [`${m.round}-${m.court}`, m] as const));
  const totalDuration = SCHEDULE_ROWS.reduce((sum, row) => sum + row.duration, 0);

  const scoreTotals = matches.reduce(
    (acc, match) => {
      if (match.court === 1) {
        acc.court1A += match.scoreA;
        acc.court1B += match.scoreB;
      }
      if (match.court === 2) {
        acc.court2A += match.scoreA;
        acc.court2B += match.scoreB;
      }
      return acc;
    },
    { court1A: 0, court1B: 0, court2A: 0, court2B: 0 }
  );

  const renderCourtCell = (match: Match | undefined, court: 1 | 2) => {
    if (!match) {
      return (
        <>
          <td className="border px-3 py-1.5 text-xs" style={{ borderColor: "rgba(167,139,250,0.35)", background: "rgba(243,240,252,0.5)", color: "#9f8ac8" }}>미정</td>
          <td className="border px-3 py-1.5 text-xs" style={{ borderColor: "rgba(167,139,250,0.35)", background: "rgba(243,240,252,0.5)", color: "#9f8ac8" }}>미정</td>
          <td className="border px-2 py-1.5 text-center text-xs" style={{ borderColor: "rgba(167,139,250,0.35)", background: "rgba(255,255,255,0.55)", color: "#9f8ac8" }}>-</td>
        </>
      );
    }

    return (
      <>
        <td className="border px-3 py-1.5 text-sm font-medium" style={{ borderColor: "rgba(167,139,250,0.35)", background: "rgba(186,230,253,0.25)", color: "#0c4a6e" }}>
          {match.teamAPlayer1}, {match.teamAPlayer2}
        </td>
        <td className="border px-3 py-1.5 text-sm font-medium" style={{ borderColor: "rgba(167,139,250,0.35)", background: "rgba(254,243,199,0.35)", color: "#78350f" }}>
          {match.teamBPlayer1}, {match.teamBPlayer2}
        </td>
        <td className="border px-2 py-1.5 text-center" style={{ borderColor: "rgba(167,139,250,0.35)", background: "rgba(255,255,255,0.55)" }}>
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 p-1">
            <input
              type="number"
              min={0}
              aria-label={`${match.round} ${court}코트 청팀 점수`}
              className="w-10 rounded-md border border-slate-300 bg-white px-1 py-1 text-center text-xs"
              value={match.scoreA}
              onChange={(e) => handleScoreChange(match, "scoreA", e.target.value)}
              onBlur={() => handleScoreBlur(match)}
            />
            <span className="text-xs font-semibold text-slate-500">:</span>
            <input
              type="number"
              min={0}
              aria-label={`${match.round} ${court}코트 홍팀 점수`}
              className="w-10 rounded-md border border-slate-300 bg-white px-1 py-1 text-center text-xs"
              value={match.scoreB}
              onChange={(e) => handleScoreChange(match, "scoreB", e.target.value)}
              onBlur={() => handleScoreBlur(match)}
            />
          </div>
        </td>
      </>
    );
  };

  return (
    <div className="min-h-screen text-slate-900" style={{ background: "linear-gradient(160deg, #ede9f6 0%, #e8e3f4 45%, #e2ddf0 100%)" }}>
      <header className="border-b" style={{ borderColor: "rgba(167,139,250,0.35)", background: "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(237,233,248,0.82) 100%)", backdropFilter: "blur(8px)" }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase font-semibold" style={{ color: "#9b76e8" }}>Tennis Club Event</p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight" style={{ color: "#3d2c6b" }}>Destiny Day Dashboard</h1>
            <p className="mt-0.5 text-xs" style={{ color: "#7f6ba8" }}>서로를 배려해주시고 , 즐테 위주로 진행할게요!!</p>
          </div>
          <div className="flex flex-col items-start md:items-end gap-1.5 text-sm">
            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(196,181,253,0.6)", color: "#3d2c6b" }}>
              입장한 플레이어: <span className="ml-1 font-bold" style={{ color: "#7c5cbf" }}>{me}</span>
            </span>
            <button
              onClick={handleReenter}
              className="text-xs px-3 py-1 rounded-full transition"
              style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(196,181,253,0.5)", color: "#7f6ba8" }}
            >
              재입장하기 (이름 변경)
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <section className="rounded-2xl overflow-hidden shadow-sm" style={{ border: "1px solid rgba(196,181,253,0.5)" }}>
          <div className="px-4 py-2.5 border-b" style={{ background: "linear-gradient(90deg, rgba(124,92,191,0.18) 0%, rgba(155,118,232,0.08) 100%)", borderColor: "rgba(196,181,253,0.4)" }}>
            <h2 className="text-sm font-bold" style={{ color: "#3d2c6b" }}>팀 명단 + 합산</h2>
          </div>
          <div className="grid md:grid-cols-2" style={{ background: "rgba(255,255,255,0.6)" }}>
            {TEAM_ROSTER.map((group, i) => {
              const total = i === 0
                ? scoreTotals.court1A + scoreTotals.court2A
                : scoreTotals.court1B + scoreTotals.court2B;
              return (
                <div
                  key={group.team}
                  className={`p-3 flex items-center gap-3 ${
                    i === 0 ? "border-b md:border-b-0 md:border-r" : ""
                  }`}
                  style={{ borderColor: "rgba(196,181,253,0.4)" }}
                >
                  <div
                    className={`flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold text-white shadow ${
                      group.team === "청팀" ? "bg-sky-500" : "bg-amber-500"
                    }`}
                  >
                    <span className="text-[10px]">{group.team}</span>
                    <span className="text-xl leading-none">{total}</span>
                    <span className="text-[9px] opacity-80">점</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {group.members.map((name) => (
                      <span
                        key={name}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          group.team === "청팀"
                            ? "bg-sky-50 border-sky-200 text-sky-800"
                            : "bg-amber-50 border-amber-200 text-amber-800"
                        }`}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ border: "1px solid rgba(196,181,253,0.5)" }}>
            <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ background: "linear-gradient(90deg, rgba(124,92,191,0.18) 0%, rgba(155,118,232,0.08) 100%)", borderColor: "rgba(196,181,253,0.4)" }}>
              <h2 className="text-sm font-bold" style={{ color: "#3d2c6b" }}>경기 대진표</h2>
              <p className="text-xs" style={{ color: "#7f6ba8" }}>시간표 기준 / 점수 즉시 저장</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-sm" style={{ background: "rgba(255,255,255,0.6)" }}>
                <thead>
                  <tr style={{ background: "rgba(124,92,191,0.18)", color: "#3d2c6b" }}>
                    <th rowSpan={2} className="border px-2 py-1.5 w-48" style={{ borderColor: "rgba(167,139,250,0.4)" }}>시간</th>
                    <th rowSpan={2} className="border px-2 py-1.5 w-24" style={{ borderColor: "rgba(167,139,250,0.4)" }}>경기시간(분)</th>
                    <th colSpan={3} className="border px-2 py-1.5" style={{ borderColor: "rgba(167,139,250,0.4)" }}>1코트</th>
                    <th colSpan={3} className="border px-2 py-1.5" style={{ borderColor: "rgba(167,139,250,0.4)" }}>2코트</th>
                  </tr>
                  <tr style={{ background: "rgba(155,118,232,0.1)", color: "#4a3580" }}>
                    <th className="border px-2 py-1.5" style={{ borderColor: "rgba(167,139,250,0.4)" }}>청팀</th>
                    <th className="border px-2 py-1.5" style={{ borderColor: "rgba(167,139,250,0.4)" }}>홍팀</th>
                    <th className="border px-2 py-1.5" style={{ borderColor: "rgba(167,139,250,0.4)" }}>점수</th>
                    <th className="border px-2 py-1.5" style={{ borderColor: "rgba(167,139,250,0.4)" }}>청팀</th>
                    <th className="border px-2 py-1.5" style={{ borderColor: "rgba(167,139,250,0.4)" }}>홍팀</th>
                    <th className="border px-2 py-1.5" style={{ borderColor: "rgba(167,139,250,0.4)" }}>점수</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEDULE_ROWS.map((row) => {
                    if (row.type === "event") {
                      return (
                        <tr key={`${row.time}-${row.label}`}>
                          <td className="border px-3 py-2 text-center font-semibold" style={{ borderColor: "rgba(167,139,250,0.45)", background: "rgba(221,214,254,0.55)", color: "#3d2c6b" }}>
                            {row.label}
                            <div className="mt-0.5 text-xs font-bold" style={{ color: "#6d4db4" }}>{row.time}</div>
                          </td>
                          <td className="border px-3 py-2 text-center font-semibold" style={{ borderColor: "rgba(167,139,250,0.45)", background: "rgba(221,214,254,0.45)", color: "#4a3580" }}>{row.duration}</td>
                          <td colSpan={6} className="border px-3 py-2 text-center font-semibold" style={{ borderColor: "rgba(167,139,250,0.45)", background: "rgba(221,214,254,0.45)", color: "#4a3580" }}>
                            {row.label}
                          </td>
                        </tr>
                      );
                    }

                    const court1 = matchMap.get(`${row.round}-1`);
                    const court2 = matchMap.get(`${row.round}-2`);

                    return (
                      <tr key={row.round}>
                        <td className="border px-3 py-2 text-center font-semibold" style={{ borderColor: "rgba(167,139,250,0.35)", background: "rgba(209,250,229,0.35)", color: "#1e3a2f" }}>
                          {row.time} ({row.round})
                        </td>
                        <td className="border px-3 py-2 text-center font-semibold" style={{ borderColor: "rgba(167,139,250,0.35)", background: "rgba(243,240,252,0.6)" }}>{row.duration}</td>
                        {renderCourtCell(court1, 1)}
                        {renderCourtCell(court2, 2)}
                      </tr>
                    );
                  })}
                  <tr className="font-semibold" style={{ background: "rgba(124,92,191,0.1)" }}>
                    <td className="border px-3 py-2 text-center" style={{ borderColor: "rgba(167,139,250,0.4)", color: "#4a3580" }}>총 경기시간</td>
                    <td className="border px-3 py-2 text-center" style={{ borderColor: "rgba(167,139,250,0.4)" }}>{totalDuration}</td>
                    <td colSpan={2} className="border px-3 py-2 text-center" style={{ borderColor: "rgba(167,139,250,0.4)" }}>합산</td>
                    <td className="border px-3 py-2 text-center text-sm" style={{ borderColor: "rgba(167,139,250,0.4)" }}>
                      {scoreTotals.court1A} : {scoreTotals.court1B}
                    </td>
                    <td colSpan={2} className="border px-3 py-2 text-center" style={{ borderColor: "rgba(167,139,250,0.4)" }}>합산</td>
                    <td className="border px-3 py-2 text-center text-sm" style={{ borderColor: "rgba(167,139,250,0.4)" }}>
                      {scoreTotals.court2A} : {scoreTotals.court2B}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl p-4 shadow-sm" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(196,181,253,0.5)" }}>
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-sm font-bold" style={{ color: "#3d2c6b" }}>오늘의 마니또 투표</h2>
              <span className="text-xs" style={{ color: "#9f8ac8" }}>비밀 투표 · 언제든 변경 가능</span>
              <div className="ml-auto flex items-center gap-2">
                {myVote && <span className="text-xs font-semibold" style={{ color: "#7c5cbf" }}>내 투표: {myVote}</span>}
                {me === "임창용" && (
                  <button
                    type="button"
                    onClick={handleResetVotes}
                    className="rounded-lg px-2.5 py-1 text-xs font-semibold transition"
                    style={{ border: "1px solid rgba(239,68,68,0.4)", background: "rgba(254,242,242,0.8)", color: "#b91c1c" }}
                  >
                    초기화
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5">
              <label
                className="flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2 transition"
                style={voteTarget === ""
                  ? { border: "1px solid rgba(124,92,191,0.7)", background: "rgba(237,233,246,0.9)", boxShadow: "0 1px 4px rgba(124,92,191,0.15)" }
                  : { border: "1px solid rgba(196,181,253,0.4)", background: "rgba(255,255,255,0.5)" }
                }
              >
                <input
                  type="radio"
                  name="voteTarget"
                  value=""
                  checked={voteTarget === ""}
                  onChange={() => handleVote("")}
                  className="accent-violet-600"
                />
                <span className="text-sm font-medium text-slate-700">선택안함</span>
                <span className="ml-auto text-[10px] text-slate-400">투표취소</span>
              </label>
              {TEAM_ROSTER.flatMap((group) =>
                group.members
                  .filter((name) => name !== me)
                  .map((name) => {
                    const checked = voteTarget === name;
                    return (
                      <label
                        key={name}
                        className="flex items-center gap-2 cursor-pointer rounded-xl px-3 py-2 transition"
                        style={checked
                          ? { border: "1px solid rgba(124,92,191,0.7)", background: "rgba(237,233,246,0.9)", boxShadow: "0 1px 4px rgba(124,92,191,0.15)" }
                          : { border: "1px solid rgba(196,181,253,0.4)", background: "rgba(255,255,255,0.5)" }
                        }
                      >
                        <input
                          type="radio"
                          name="voteTarget"
                          value={name}
                          checked={checked}
                          onChange={() => handleVote(name)}
                          className="accent-violet-600"
                        />
                        <span
                          className={`text-sm font-medium ${
                            group.team === "청팀" ? "text-sky-800" : "text-amber-800"
                          }`}
                        >
                          {name}
                        </span>
                        <span className="ml-auto text-[10px] text-slate-400">{group.team}</span>
                      </label>
                    );
                  })
              )}
            </div>
            {voteSummary.length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(196,181,253,0.35)" }}>
                <p className="text-xs mb-1.5" style={{ color: "#9f8ac8" }}>현재 득표 현황</p>
                <div className="flex flex-wrap gap-1.5">
                  {voteSummary.map((v) => (
                    <span
                      key={v.targetName}
                      className="inline-flex items-center gap-1 text-xs rounded-full px-3 py-0.5"
                      style={{ background: "rgba(237,233,246,0.9)", border: "1px solid rgba(167,139,250,0.45)", color: "#4a3580" }}
                    >
                      <span>{v.targetName}</span>
                      <span className="font-bold" style={{ color: "#7c5cbf" }}>{v.count}표</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

