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

type SummaryRow = {
  name: string;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  scored: number;
  conceded: number;
};

const API_BASE = "http://localhost:4000";

export const App: React.FC = () => {
  const [me, setMe] = useState<string | null>(null);
  const [loginName, setLoginName] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [voteTarget, setVoteTarget] = useState("");
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
    loadSummary();
    loadVoteSummary();
  }, [me]);

  const loadMatches = async () => {
    const res = await fetch(`${API_BASE}/api/matches`, { credentials: "include" });
    if (res.ok) setMatches(await res.json());
  };

  const loadSummary = async () => {
    const res = await fetch(`${API_BASE}/api/summary`, { credentials: "include" });
    if (res.ok) setSummary(await res.json());
  };

  const loadVoteSummary = async () => {
    const res = await fetch(`${API_BASE}/api/votes/summary`, { credentials: "include" });
    if (res.ok) setVoteSummary(await res.json());
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
    await loadSummary();
  };

  const handleVote = async () => {
    if (!voteTarget) return;
    await fetch(`${API_BASE}/api/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ targetName: voteTarget }),
    });
    await loadVoteSummary();
  };

  if (!me) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-sky-900 flex items-center justify-center text-slate-50">
        <div className="relative max-w-xl w-full px-8 py-10 rounded-3xl bg-slate-900/70 border border-slate-700/60 shadow-[0_18px_60px_rgba(15,23,42,0.9)] backdrop-blur-2xl">
          <div className="absolute -top-10 -left-10 h-24 w-24 rounded-3xl bg-sky-500/40 blur-xl" />
          <div className="absolute -bottom-12 -right-8 h-32 w-32 rounded-full bg-emerald-400/40 blur-2xl" />

          <div className="relative space-y-6">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-sky-300/80">Tennis Club Event 2026</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50">
                Destiny Doubles
                <span className="block text-base font-normal text-slate-300/80">
                  오늘 경기 &amp; 마니또 대시보드
                </span>
              </h1>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">이름을 입력해 입장해 주세요</label>
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400/70 transition"
                  placeholder="예: 김테니스"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                />
                <p className="mt-1 text-xs text-slate-400">최대 35명까지 동시에 접속 가능합니다.</p>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center rounded-2xl bg-sky-400 hover:bg-sky-300 text-slate-900 font-semibold py-3 text-sm shadow-lg shadow-sky-500/40 transition"
              >
                코트로 입장하기
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950">
        <div className="absolute inset-0 opacity-50 mix-blend-screen">
          <div className="h-full w-full bg-[radial-gradient(circle_at_0_0,rgba(56,189,248,0.26),transparent_55%),radial-gradient(circle_at_100%_0,rgba(45,212,191,0.2),transparent_55%)]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-sky-300/80">Tennis Club Event</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Destiny Doubles Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-200/80">
              오늘의 경기 진행 상황과 마니또를 한 눈에 확인하세요.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm">
            <span className="px-3 py-1 rounded-full bg-slate-900/70 border border-slate-700 text-slate-100">
              입장한 플레이어: <span className="font-semibold text-sky-300">{me}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        <section className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-3xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold tracking-wide text-slate-200 uppercase">
                경기 대진표
              </h2>
            </div>
            <div className="space-y-4">
              {rounds.map((round) => (
                <div key={round}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">
                      {round}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {matches
                      .filter((m) => m.round === round)
                      .map((m) => (
                        <div
                          key={m.id}
                          className="rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>코트 {m.court}</span>
                            <span className="rounded-full border border-slate-700 px-2 py-0.5">
                              더블스
                            </span>
                          </div>
                          <div className="text-xs text-slate-300">
                            <div className="flex justify-between">
                              <span className="font-medium text-sky-300">
                                {m.teamAPlayer1}, {m.teamAPlayer2}
                              </span>
                              <input
                                type="number"
                                min={0}
                                className="w-14 rounded-xl bg-slate-800 border border-slate-700 text-center text-sm"
                                value={m.scoreA}
                                onChange={(e) => handleScoreChange(m, "scoreA", e.target.value)}
                                onBlur={() => handleScoreBlur(m)}
                              />
                            </div>
                            <div className="flex justify-between mt-1">
                              <span className="font-medium text-emerald-300">
                                {m.teamBPlayer1}, {m.teamBPlayer2}
                              </span>
                              <input
                                type="number"
                                min={0}
                                className="w-14 rounded-xl bg-slate-800 border border-slate-700 text-center text-sm"
                                value={m.scoreB}
                                onChange={(e) => handleScoreChange(m, "scoreB", e.target.value)}
                                onBlur={() => handleScoreBlur(m)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">
                  합산 결과
                </h2>
                <button
                  onClick={loadSummary}
                  className="text-xs px-2 py-1 rounded-xl border border-slate-700 hover:border-sky-400 text-slate-200"
                >
                  새로 고침
                </button>
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {summary.map((row, idx) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between text-xs rounded-2xl px-3 py-2 bg-slate-900 border border-slate-800"
                  >
                    <div>
                      <span className="text-slate-200 font-medium">
                        {idx + 1}. {row.name}
                      </span>
                      <span className="ml-2 text-slate-400">
                        {row.played}경기 • {row.wins}승 {row.draws}무 {row.losses}패
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 backdrop-blur-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold tracking-[0.2em] uppercase text-slate-400">
                  오늘의 마니또 투표
                </h2>
              </div>
              <div className="space-y-2">
                <input
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="마니또로 뽑을 사람 이름"
                  value={voteTarget}
                  onChange={(e) => setVoteTarget(e.target.value)}
                />
                <button
                  onClick={handleVote}
                  className="w-full text-xs font-semibold rounded-2xl bg-emerald-400 text-slate-900 py-2 hover:bg-emerald-300 transition"
                >
                  비밀 투표하기
                </button>
              </div>
              <div className="pt-2 border-t border-slate-800">
                <p className="text-[11px] text-slate-400 mb-1">현재 득표 현황</p>
                <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                  {voteSummary.map((v) => (
                    <div
                      key={v.targetName}
                      className="flex items-center justify-between text-xs rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5"
                    >
                      <span>{v.targetName}</span>
                      <span className="text-emerald-300 font-semibold">{v.count}표</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

