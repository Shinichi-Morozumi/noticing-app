import { STEPS } from "@/lib/steps";
export const runtime = "nodejs";

export async function POST(req) {
  const { answers = [] } = await req.json();
  const json = {};
  STEPS.forEach((s, i) => { json[s.key] = answers[i] || ""; });
  json.meta = {
    tendency_type: "共感・関係性を手がかりにするタイプ",
    tendency_note: "気づきのスイッチが入るのは、患者さんご本人の気持ちに触れたとき。感情から看護観へつながりやすい傾向です。",
    philosophy_oneline: "私は、やることを終わらせるより、その人の傍らに居ることを選べる看護師でありたい。",
  };
  return Response.json({ summary: json });
}
