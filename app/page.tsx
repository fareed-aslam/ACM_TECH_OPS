"use client";

import { FormEvent, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Papa from "papaparse";
import { QRCodeSVG } from "qrcode.react";
import { MathText } from "@/components/MathText";

type Board = { players?: Array<{ name: string; score: number; rank?: number }>; joined?: number; finished?: number; status?: string; pin?: string; endsAt?: string };
const API = process.env.NEXT_PUBLIC_API_URL ?? "";
const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60).toString().padStart(2, "0")}:${(Math.max(0, s) % 60).toString().padStart(2, "0")}`;

function Sigil({ className = "" }: { className?: string }) {
  return <span className={`sigil ${className}`} aria-hidden="true"><span>✦</span><i /><b>✧</b></span>;
}
function Atmosphere() {
  return <div className="atmosphere" aria-hidden="true"><div className="moon" /><div className="orbit orbit-a"><span>✧</span></div><div className="orbit orbit-b"><span>✦</span></div><div className="broom broom-a">✦</div><div className="broom broom-b">✧</div><div className="embers" /></div>;
}
function Shell({ children, tab = "home" }: { children: React.ReactNode; tab?: string }) {
  return <main className="app-shell"><Atmosphere /><header className="topbar"><a className="brand" href="/"><span className="brand-mark">✦</span><span>ACM <b>TRIVIA</b></span></a><a className="event-pill" href="/screen"><i /> LIVE EVENT</a></header>{children}<nav className="bottom-nav" aria-label="Main navigation"><a className={tab === "home" ? "active" : ""} href="/"><span>⌂</span>Home</a><a href="/screen"><span>◉</span>Live board</a><a href="/admin"><span>⚙</span>Admin</a></nav><footer className="footer">A little knowledge goes a long way <span>✦</span></footer></main>;
}
function JoinPage() {
  const [form, setForm] = useState({ name: "", roll: "", pin: "" });
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { if (localStorage.getItem("tt_token")) window.location.href = "/play"; }, []);
  async function join(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const r = await fetch(`${API}/api/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name.trim(), roll: form.roll.trim(), pin: form.pin.trim() }) });
      const data = await r.json(); if (!r.ok) throw new Error(data.error || data.message || "We couldn’t join the game. Check your details and try again.");
      localStorage.setItem("tt_token", data.token); window.location.href = "/play";
    } catch (err) { setError(err instanceof Error ? err.message : "Connection failed. Please try again."); }
    finally { setBusy(false); }
  }
  return <Shell><section className="hero"><div className="hero-copy"><div className="eyebrow"><span /> ACM • LIVE TECH TRIVIA</div><h1>Enter the<br /><em>Enchanted</em><br />Hall.</h1><p className="hero-sub">A little logic. A little magic.<br />One leaderboard to rule them all.</p><div className="hero-note"><span className="sparkle">✧</span> Your challenge awaits, wizard.</div></div><div className="hero-art" aria-hidden="true"><div className="halo halo-outer" /><div className="halo halo-inner" /><div className="wand"><i /><b /></div><div className="spell-ring">✧　✦　✧</div><div className="orb">✦</div><div className="float-card">EXPECTO<br /><b>KNOWLEDGE</b></div></div></section>
    <section className="join-card"><div className="card-head"><div><span className="eyebrow">YOUR ADVENTURE STARTS HERE</span><h2>Join the game</h2></div><span className="card-sigil">✧</span></div><form onSubmit={join}><label>Your name<input required maxLength={60} autoComplete="name" placeholder="e.g. Hermione Granger" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label><label>Roll number<input required maxLength={30} autoComplete="off" placeholder="Your student ID" value={form.roll} onChange={e => setForm({ ...form, roll: e.target.value })} /></label><label>Game PIN<input required maxLength={20} autoComplete="one-time-code" placeholder="Enter the hall PIN" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} /></label>{error && <p className="error" role="alert">{error}</p>}<button className="primary-btn" disabled={busy}>{busy ? <><span className="spinner" /> Opening the portal…</> : <>Join the challenge <span>↗</span></>}</button><p className="privacy">One attempt per roll number <span>•</span> Your questions are unique</p></form></section>
    <section className="features"><div><span>01</span><b>Think fast</b><small>Every question has its own clock.</small></div><div><span>02</span><b>Trust your magic</b><small>Quick correct answers score more.</small></div><div><span>03</span><b>Claim your place</b><small>Follow the live leaderboard.</small></div></section><section className="spellbook"><div className="spellbook-head"><div className="eyebrow"><span /> AN ILLUSTRATED FIELD GUIDE</div><h2>A little <em>old magic.</em></h2><p>A few wonders from the wider wizarding world, gathered in one place.</p></div><div className="spell-grid"><article className="spell-card patronus"><span className="spell-art">🦌</span><small>PROTECTIVE CHARM</small><h3>Expecto Patronum</h3><p>A bright guardian summoned from a happy memory to drive away dark creatures.</p><i>THE PATRONUS CHARM</i></article><article className="spell-card curse"><span className="spell-art">✹</span><small>FORBIDDEN MAGIC</small><h3>The Unforgivable</h3><p>Imperius, Cruciatus and Avada Kedavra: three curses with grave consequences.</p><i>DARK ARTS</i></article><article className="spell-card animagus"><span className="spell-art">🐈</span><small>TRANSFIGURATION</small><h3>Animagi</h3><p>Witches and wizards who can transform at will, like McGonagall and Sirius Black.</p><i>ANIMAL FORM</i></article><article className="spell-card metamorph"><span className="spell-art">✧</span><small>RARE INHERITANCE</small><h3>Metamorphmagus</h3><p>A rare, inborn gift for changing one’s appearance at will, known in Tonks.</p><i>SHIFTING FORM</i></article><article className="spell-card serpent"><span className="spell-art">〰</span><small>HEREDITARY GIFT</small><h3>Parseltongue</h3><p>The rare ability to understand and speak the language of serpents.</p><i>SERPENT SPEECH</i></article><article className="spell-card wandless"><span className="spell-art">🪄</span><small>ADVANCED CRAFT</small><h3>Wordless & wandless</h3><p>Powerful magic performed without spoken incantations or a physical wand.</p><i>PURE INTENTION</i></article></div><div className="flying-familiar" aria-hidden="true"><span>🧙🏻‍♂️</span><i>✧</i><b>✦</b></div></section></Shell>;
}
function PlayPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [left, setLeft] = useState(0);
  const [sending, setSending] = useState(false);

  async function load() {
    const token = typeof window !== "undefined" ? localStorage.getItem("tt_token") : null;
    if (!token) {
      location.href = "/";
      return;
    }
    try {
      const r = await fetch(`${API}/api/play`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (r.status === 401) {
        localStorage.removeItem("tt_token");
        location.href = "/";
        return;
      }
      const d = await r.json();
      setData(d);
      if (d.phase === "question") {
        setLeft(d.question?.secondsLeft ?? d.secondsLeft ?? 0);
      }
      setError("");
    } catch {
      setError("Can’t reach the game server. Retrying…");
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Optimized adaptive polling: poll lobby (3s) and done (8s), zero poll during question countdown
  useEffect(() => {
    if (!data) return;
    if (data.phase === "lobby") {
      const id = setInterval(load, 3000);
      return () => clearInterval(id);
    }
    if (data.phase === "done" && !data.gameEnded) {
      const id = setInterval(load, 8000);
      return () => clearInterval(id);
    }
  }, [data?.phase, data?.gameEnded]);

  // Smooth local question timer
  useEffect(() => {
    if (data?.phase !== "question" || !data?.question) return;
    const id = setInterval(() => setLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [data?.phase, data?.question?.number]);

  // Anti-cheating listeners (active only during question phase)
  useEffect(() => {
    if (data?.phase !== "question") return;
    const flag = () => {
      const token = localStorage.getItem("tt_token");
      if (!token) return;
      if (document.visibilityState === "hidden") {
        fetch(`${API}/api/flag`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      } else {
        setWarning("You left the quiz. This tab switch has been recorded.");
        window.setTimeout(() => setWarning(""), 3500);
      }
    };
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("visibilitychange", flag);
    document.addEventListener("copy", block);
    document.addEventListener("cut", block);
    document.addEventListener("paste", block);
    document.addEventListener("contextmenu", block);
    document.addEventListener("selectstart", block);
    return () => {
      document.removeEventListener("visibilitychange", flag);
      document.removeEventListener("copy", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("selectstart", block);
    };
  }, [data?.phase]);

  async function answer(option?: number) {
    if (sending) return;
    setSending(true);
    try {
      const token = localStorage.getItem("tt_token");
      await fetch(`${API}/api/answer`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questionNumber: data?.question?.number, answer: option }),
      });
      await load();
    } catch {
      setError("Your answer could not be sent. Please check your connection.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    if (data?.phase === "question" && data?.question && left === 0 && !sending) {
      answer();
    }
  }, [left, data?.phase, sending]);

  return (
    <Shell tab="play">
      <section className="play-wrap">
        {error && <p className="error">{error}</p>}
        {warning && <p className="warning" role="status">✦ {warning}</p>}
        {!data ? (
          <div className="loading"><Sigil /> Consulting the stars…</div>
        ) : data.phase === "lobby" ? (
          <div className="state-card">
            <Sigil />
            <div className="eyebrow">YOU’RE IN</div>
            <h1>The hall is<br /><em>gathering.</em></h1>
            <p>You’re all set. Your questions will appear as soon as the game begins.</p>
            <div className="waiting-dots"><i /><i /><i /></div>
            <small>Keep this page open</small>
          </div>
        ) : data.phase === "done" ? (
          <div className="state-card done-card">
            <Sigil />
            <div className="eyebrow">THE MAGIC IS COMPLETE</div>
            <h1>Well <em>played.</em></h1>
            <div className="score-box">
              <small>YOUR SCORE</small>
              <strong>{data.score ?? 0}</strong>
              <span>points</span>
            </div>
            <div className="result-grid">
              <span>Correct<b>{data.correct ?? 0}</b></span>
              <span>Rank<b>#{data.rank ?? "—"}</b></span>
              <span>Total time<b>{data.totalTime ?? 0}s</b></span>
            </div>
            <a className="secondary-btn" href="/screen">View the leaderboard ↗</a>
          </div>
        ) : data.question ? (
          <div className="question-card">
            <div className="quiz-top">
              <a href="/" className="mini-brand">✦ ACM TRIVIA</a>
              <span className="game-clock">◷ {fmt(data.gameSecondsLeft ?? 0)}</span>
            </div>
            <div className="quiz-meta">
              <span>QUESTION {data.question.number} <i>/ {data.question.total}</i></span>
              <span className={left <= 4 ? "urgent" : ""}>00:{left.toString().padStart(2, "0")}</span>
            </div>
            <div className="timer-track">
              <i style={{ width: `${Math.max(0, (left / (data.question.secondsTotal ?? 15)) * 100)}%` }} />
            </div>
            <h2><MathText text={data.question.text} /></h2>
            <div className="answers">
              {(data.question.options ?? []).map((option: string, i: number) => (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  disabled={sending}
                  className="answer-btn"
                  type="button"
                >
                  <span className="opt-letter">{String.fromCharCode(65 + i)}</span>
                  <MathText text={option} />
                </button>
              ))}
            </div>
            <p className="question-foot"><span>✧</span> Trust your instincts. The clock is ticking.</p>
          </div>
        ) : (
          <div className="state-card"><h2>Waiting for the next question…</h2></div>
        )}
        <p className="integrity-note">Your score updates when the game ends. Answers stay secret until then.</p>
      </section>
    </Shell>
  );
}
function ScreenPage() {
  const [d, setD] = useState<Board>({});
  const [seconds, setSeconds] = useState(0);
  const [joinUrl, setJoinUrl] = useState("");
  useEffect(() => {
    setJoinUrl(window.location.origin);
    async function load() {
      try {
        const r = await fetch(`${API}/api/leaderboard`, { cache: "no-store" });
        const x = await r.json();
        setD(x);
        if (x.endsAt) setSeconds(Math.max(0, Math.floor((new Date(x.endsAt).getTime() - Date.now()) / 1000)));
      } catch {}
    }
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);
  return (
    <main className="screen-page">
      <div className="screen-stars" />
      <header className="screen-head">
        <a className="brand" href="/"><span className="brand-mark">✦</span><span>ACM <b>TRIVIA</b></span></a>
        <span className="event-pill"><i /> LIVE EVENT</span>
      </header>
      <div className="screen-content">
        <div className="screen-title">
          <span className="eyebrow">THE GREAT HALL • LIVE RANKINGS</span>
          <h1>Tech Trivia</h1>
          <p>Think wisely. Rise brilliantly.</p>
        </div>
        <div className="screen-stats">
          <div><small>GAME TIME LEFT</small><strong>{fmt(seconds)}</strong></div>
          <div><small>WIZARDS JOINED</small><strong>{d.joined ?? 0}</strong></div>
          <div><small>FINISHED</small><strong>{d.finished ?? 0}</strong></div>
          <div><small>GAME PIN</small><strong>{d.status === "ended" ? "CLOSED" : d.pin ?? "••••"}</strong></div>
        </div>
        <div className="leaderboard">
          <div className="leader-head"><h2>Hall of fame</h2><span>TOP 10</span></div>
          {(d.players ?? []).length ? (
            (d.players ?? []).slice(0, 10).map((p, i) => (
              <div className={`leader-row rank-${i + 1}`} key={p.name}>
                <span className="rank-num">{i < 3 ? ["✦", "✧", "✦"][i] : String(i + 1).padStart(2, "0")}</span>
                <b>{p.name}</b>
                <strong>{p.score.toLocaleString()} <small>pts</small></strong>
              </div>
            ))
          ) : (
            <div className="empty-board">
              <span>✧</span>
              <b>The first spell is yet to be cast.</b>
              <small>Join on your phone to claim the top spot.</small>
            </div>
          )}
        </div>
        {joinUrl && d.status !== "ended" && (
          <div className="screen-qr">
            <QRCodeSVG value={joinUrl} size={112} bgColor="#f5f1e9" fgColor="#111522" level="M" />
            <div>
              <b>Ready to play?</b>
              <small>Scan to join on your phone<br />Then enter the game PIN above.</small>
            </div>
          </div>
        )}
        <p className="screen-foot">The leaderboard updates live <span>✦</span></p>
      </div>
    </main>
  );
}
function AdminPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [game, setGame] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [settings, setSettings] = useState({ pin: "", totalMinutes: 30, secondsPerQuestion: 15, questionsPerStudent: 20 });
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState(0);
  const [mode, setMode] = useState("add");

  useEffect(() => {
    const t = sessionStorage.getItem("tt_admin");
    if (t) {
      setToken(t);
      refresh(t);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const id = setInterval(() => refresh(), 4000);
    return () => clearInterval(id);
  }, [token]);

  async function req(path: string, method = "GET", body?: any) {
    const r = await fetch(`${API}/api/admin/${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.error || d.message || "Request failed");
    return d;
  }

  async function refresh(t = token) {
    try {
      const r = await fetch(`${API}/api/admin/game`, {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      if (r.ok) {
        const d = await r.json();
        setGame(d);
        setSettings({
          pin: d.pin ?? "",
          totalMinutes: d.totalMinutes ?? 30,
          secondsPerQuestion: d.secondsPerQuestion ?? 15,
          questionsPerStudent: d.questionsPerStudent ?? 20,
        });
      }
      const qR = await fetch(`${API}/api/admin/questions`, {
        headers: { Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      if (qR.ok) {
        const qD = await qR.json();
        setQuestions(qD.count ?? 0);
      }
    } catch {}
  }

  async function login(e: FormEvent) {
    e.preventDefault();
    try {
      const d = await req("login", "POST", { password });
      sessionStorage.setItem("tt_admin", d.token);
      setToken(d.token);
      setErr("");
      refresh(d.token);
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function action(name: string, body?: any, method = "POST") {
    try {
      await req(name, method, body);
      setMsg("Game controls updated.");
      setErr("");
      refresh();
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    try {
      await req("settings", "POST", settings);
      setMsg("Settings saved.");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function importCsv() {
    if (!file) return;
    try {
      const parsed = Papa.parse<string[]>(await file.text(), { skipEmptyLines: "greedy" });
      if (parsed.errors.length) throw Error(parsed.errors[0].message);
      let rows = parsed.data;
      if (rows[0]?.[0]?.trim().toLowerCase() === "question") rows = rows.slice(1);
      const parsedQuestions = rows
        .map((r) => ({ text: r[0], options: r.slice(1, 5), correct: Number(r[5]) }))
        .filter(
          (q) =>
            q.text &&
            q.options.length === 4 &&
            Number.isInteger(q.correct) &&
            q.correct >= 0 &&
            q.correct <= 3
        );
      if (!parsedQuestions.length)
        throw Error("No valid questions found. Check the CSV columns and correct-option values.");
      const d = await req("questions/import", "POST", { questions: parsedQuestions, mode });
      setQuestions(d.added ?? parsedQuestions.length);
      setMsg("Questions imported.");
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <Shell tab="admin">
      <section className="admin-wrap">
        <div className="eyebrow">ACM EVENT CONTROL</div>
        <h1>Game <em>admin</em></h1>
        <p className="admin-intro">The backstage controls for your live trivia.</p>
        {!token ? (
          <form className="join-card admin-login" onSubmit={login}>
            <h2>Team sign in</h2>
            <label>Admin password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {err && <p className="error">{err}</p>}
            <button className="primary-btn">Unlock controls ↗</button>
          </form>
        ) : (
          <>
            {msg && <p className="success">✦ {msg}</p>}
            {err && <p className="error">{err}</p>}
            <div className="admin-stats">
              {[
                ["STATUS", game?.status ?? "—"],
                ["JOINED", game?.joined ?? 0],
                ["FINISHED", game?.finished ?? 0],
                ["TIME LEFT", fmt(game?.secondsLeft ?? 0)],
              ].map(([k, v]) => (
                <div key={k}><small>{k}</small><b>{v}</b></div>
              ))}
            </div>
            <section className="admin-panel">
              <h2>Game controls</h2>
              <div className="control-grid">
                <button onClick={() => action("start")}>▶ Start</button>
                <button onClick={() => action("extend", { minutes: 2 })}>+2 min</button>
                <button onClick={() => action("extend", { minutes: 5 })}>+5 min</button>
                <button onClick={() => action("join-open", { open: !game?.joinOpen })}>
                  {game?.joinOpen ? "Close joining" : "Open joining"}
                </button>
                <button className="danger" onClick={() => action("end")}>■ End now</button>
                <button
                  className="danger ghost-danger"
                  onClick={() => {
                    if (confirm("Reset the game and clear all players?")) action("reset");
                  }}
                >
                  ↻ Reset players
                </button>
              </div>
            </section>
            <form className="admin-panel" onSubmit={saveSettings}>
              <h2>Game settings</h2>
              <div className="settings-grid">
                <label>Game PIN<input required value={settings.pin} onChange={(e) => setSettings({ ...settings, pin: e.target.value })} /></label>
                <label>Total minutes<input type="number" min="1" max="240" value={settings.totalMinutes} onChange={(e) => setSettings({ ...settings, totalMinutes: +e.target.value })} /></label>
                <label>Seconds per question<input type="number" min="5" max="180" value={settings.secondsPerQuestion} onChange={(e) => setSettings({ ...settings, secondsPerQuestion: +e.target.value })} /></label>
                <label>Questions per student<input type="number" min="1" max="100" value={settings.questionsPerStudent} onChange={(e) => setSettings({ ...settings, questionsPerStudent: +e.target.value })} /></label>
              </div>
              <button className="secondary-btn">Save settings</button>
            </form>
            <section className="admin-panel">
              <h2>Question library</h2>
              <p>Import a CSV with question, four options and correct option number (0–3).</p>
              <label className="file-label">
                Choose CSV
                <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              {file && <span className="file-name">{file.name}</span>}
              <label className="mode-label">
                Import mode
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="add">Add to question pool</option>
                  <option value="replace">Replace all questions</option>
                </select>
              </label>
              <button className="secondary-btn" onClick={importCsv} disabled={!file}>Import questions</button>
              <button className="text-action" onClick={() => action("questions", undefined, "DELETE")}>Clear all questions</button>
              {questions > 0 && <small>{questions} questions added</small>}
            </section>
            <button
              className="download-link"
              onClick={async () => {
                try {
                  const r = await fetch(`${API}/api/admin/results.csv`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  if (!r.ok) throw Error("Could not download results.");
                  const blob = await r.blob(),
                    url = URL.createObjectURL(blob),
                    a = document.createElement("a");
                  a.href = url;
                  a.download = "tech-trivia-results.csv";
                  a.click();
                  URL.revokeObjectURL(url);
                } catch (e) {
                  setErr((e as Error).message);
                }
              }}
            >
              ↓ Download results CSV
            </button>
          </>
        )}
      </section>
    </Shell>
  );
}
export default function Home() { const path = usePathname(); if (path === "/play") return <PlayPage />; if (path === "/screen") return <ScreenPage />; if (path === "/admin") return <AdminPage />; return <JoinPage /> }
