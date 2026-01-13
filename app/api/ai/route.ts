import { NextResponse } from "next/server"

const MODEL = "gpt-4o-mini"

const modeInstructions: Record<string, string> = {
  ask: "Answer the user's question using the board and document context. Be concise and practical.",
  summary: "Summarize the system in 2 short paragraphs and list the main components.",
  risks: "List the top architectural risks with a short mitigation for each.",
  decisions:
    "List key design decisions. For each, include decision, reason, assumptions, consequences, and open questions.",
}

export async function POST(req: Request) {
  const body = await req.json()
  const { mode, board, docs, question } = body

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
  }

  const instruction = modeInstructions[mode] ?? modeInstructions.ask
  const payload = {
    mode,
    board,
    docs,
    question,
  }

  const messages = [
    {
      role: "system",
      content:
        "You are an architecture assistant. Use the provided board and documents as the source of truth. " +
        "If information is missing, state assumptions briefly.",
    },
    {
      role: "user",
      content: `${instruction}\n\nContext:\n${JSON.stringify(payload)}`,
    },
  ]

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("OpenAI error:", errorText)
    return NextResponse.json({ error: errorText }, { status: 500 })
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content ?? ""

  return NextResponse.json({
    mode,
    response: content,
  })
}
