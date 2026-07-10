"use client";
import { useState, useEffect, useRef } from "react";
import { STEPS } from "@/lib/steps";

export default function Home() {
  const [step, setStep] = useState(0);
  const [thread, setThread] = useState([]);
  const [answers, setAnswers] = useState(Array(STEPS.length).fill(""));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState(null);
  const [source, setSource] = useState("");
  const started = useRef(false);

  async function askAI(curStep, hist, userText) {
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: curStep, history: hist, userText }),
      });
      const d = await r.json();
      setSource(d.source);
      setThread((t) => [...t, { role: "assistant", content: d.text }]);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    if (started.current) return; started.current = true;
    askAI(0, [], "");
  }, []);

  function send() {
    const text = input.trim();
    if (!text) return;
    const mine = { role: "user", content: text };
    const next = [...thread, mine];
    setThread(next);
    setAnswers((a) => { const c = [...a]; c[step] = c[step] ? c[step] + "\n" + text : text; return c; });
    setInput("");
    askAI(step, next, text);
  }

  function addEmotion(w) {
    setInput((v) => (v && v.trim() ? v.replace(/\s+$/, "") + "、" + w : w));
  }

  async function nextStep() {
    if (step >= STEPS.length - 1) {
      setLoading(true);
      const r = await fetch("/api/summarize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const d = await r.json();
      setSummary(d.summary); setDone(true); setLoading(false);
      return;
    }
    const ns = step + 1; setStep(ns);
    setThread((t) => [...t, { role: "assistant", content: "——次に進みます。急がなくて大丈夫——" }]);
    askAI(ns, thread, "");
  }

  function restart() {
    setStep(0); setThread([]); setAnswers(Array(STEPS.length).fill("")); setInput("");
    setDone(false); setSummary(null); started.current = false;
    setTimeout(() => { started.current = true; askAI(0, [], ""); }, 0);
  }

  const s = STEPS[step];
  const hasAnswer = answers[step] && answers[step].length > 0;

  return (
    <main className="wrap">
      <div className="brand"><span className="dot" /><h1>noticing.</h1>
        <span className="tag">経験から学んで、次に活かす。看護師のリフレクション</span></div>
      <div className="theme">最近の勤務で、心にすこし残っている場面をひとつ思い出してみましょう。「うまくいった/いかなかった」で選ばなくて大丈夫。なんとなく引っかかっている場面で。</div>

      <div className="bar">
        {STEPS.map((_, i) => <div key={i} className={"seg" + (i <= step ? " on" : "")} />)}
      </div>
      <div className="stepname">STEP {step + 1} / {STEPS.length}　{s.label}{source ? `　·　応答: ${source}` : ""}</div>

      {!done && (
        <>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--accd)", margin: "2px 0 10px", lineHeight: 1.6 }}>{s.title}</div>
          <div className="lab">ファシリテーター</div>
          {thread.map((m, i) => (
            <div key={i} className={"msg " + (m.role === "user" ? "me" : "ai")}>{m.content}</div>
          ))}
          {loading && <div className="msg ai">…考えています</div>}

          {s.deep && (
            <div className="nudge">このステップは、急がず何度でも。しっくりくる言葉になるまで、行き来して大丈夫です。</div>
          )}
          {s.examples && (
            <div className="chips">
              <span className="chipslab">近いと思う気持ちをタップ（複数OK・あとで直せます）</span>
              <div className="chiprow">
                {s.examples.map((w) => (
                  <button type="button" key={w} className="chip" onClick={() => addEmotion(w)}>{w}</button>
                ))}
              </div>
            </div>
          )}
          <div className="hint">ヒント：{s.hint}</div>
          <textarea value={input} placeholder="あなたの言葉で書いてみましょう…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
          <div className="row">
            <button className="primary" onClick={send} disabled={loading || !input.trim()}>送る（⌘/Ctrl+Enter）</button>
            <button onClick={nextStep} disabled={loading || !hasAnswer}>
              {step >= STEPS.length - 1 ? "看護観をまとめる →" : "次のステップへ →"}
            </button>
          </div>
        </>
      )}

      {done && summary && (
        <>
          <div className="stepname">セッション完了 — ふりかえりのまとめ</div>
          <div className="card">
            {STEPS.map((st) => (
              <div key={st.key} className="crow">
                <div className="ck">{st.label}</div>
                <div className="cv">{summary[st.key] || "（未記入）"}</div>
              </div>
            ))}
          </div>
          <div className="tend">
            <div className="ck">気づきのきっかけ（傾向）</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--accd)" }}>{summary.meta.tendency_type}</div>
            <div style={{ fontSize: 13, color: "var(--accd)", marginTop: 4, lineHeight: 1.6 }}>{summary.meta.tendency_note}</div>
          </div>
          <div className="one">{summary.meta.philosophy_oneline}</div>
          <div className="src">このまとめは、セッションを重ねるほど更新されます。何回分かを横断して、少しずつ「あなたの看護観」が積み上がっていきます。急がず、また気が向いたときに。</div>
          <div className="row"><button onClick={restart}>↺ もう一度やってみる</button></div>
        </>
      )}
    </main>
  );
}
