import { STEPS, SYSTEM_PROMPT } from "@/lib/steps";

export const runtime = "nodejs";

function fallbackReply(step, userText) {
  const s = STEPS[step] || STEPS[0];
  if (!userText) return s.self;
  if (s.key === "feelings" && s.examples) {
    const ex = s.examples.slice(0, 4).join("」「");
    return `書いてくれてありがとう。その場面に立ってみると、たとえば「${ex}」どれか、ちょっと近いものはありますか？（はい／いいえ／ちょっと近い、で大丈夫です）`;
  }
  if (s.key === "description") {
    return "ありがとう。もう少し、その場面を一緒に見せてください。次に起きたことは？（誰が、何と言った・した？）";
  }
  if (s.patientPass) {
    return "ありがとう。ここで一度だけ、患者さんの側に立ってみましょう。その人はどんな状況で、あなたの関わりはどんなふうに届いたと思いますか？";
  }
  return "なるほど、そう感じていたのですね。もう少しだけ、そのことを聞かせてください。";
}

async function claudeReply(step, history, userText) {
  const s = STEPS[step] || STEPS[0];
  const extra = [];
  extra.push(`現在のステップ: ${s.label}（${s.key}）— ${s.title || ""}`);
  extra.push(`このステップで本人に向ける問いの軸: ${s.self}`);
  if (s.probes) extra.push(`掘り下げの切り口（一度に全部ではなく、1つずつ）: ${s.probes.join(" / ")}`);
  if (s.key === "feelings" && s.examples) {
    extra.push(`感情の候補として使える例（この中から状況に合うものを2〜4個選んで差し出す）: ${s.examples.join("、")}。本人が「はい／いいえ／ちょっと近い」で答えて絞れるように問うこと。`);
  }
  if (s.patientPass) {
    extra.push("このステップは、セッション中で唯一「患者さんの視点」に引き戻す場面です。ここでのみ患者視点の問いをすること。");
  } else {
    extra.push("このステップでは患者さんの視点の問いは挟まない。本人の経験と気持ちに集中すること。");
  }
  const sys = `${SYSTEM_PROMPT}\n\n${extra.join("\n")}`;

  const messages = history.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));
  if (userText) messages.push({ role: "user", content: userText });
  if (messages.length === 0) messages.push({ role: "user", content: "（セッションを始めます。最初の問いをください）" });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
      max_tokens: 400,
      system: sys,
      messages,
    }),
  });
  if (!res.ok) throw new Error("anthropic " + res.status);
  const data = await res.json();
  return (data.content || []).map((c) => (c.type === "text" ? c.text : "")).join("");
}

export async function POST(req) {
  try {
    const { step = 0, history = [], userText = "" } = await req.json();
    let text, source;
    if (process.env.ANTHROPIC_API_KEY) {
      try { text = await claudeReply(step, history, userText); source = "claude"; }
      catch (e) { text = fallbackReply(step, userText); source = "fallback"; }
    } else {
      text = fallbackReply(step, userText); source = "local";
    }
    return Response.json({ text, source });
  } catch (e) {
    return Response.json({ text: "エラーが発生しました。", source: "error" }, { status: 200 });
  }
}
