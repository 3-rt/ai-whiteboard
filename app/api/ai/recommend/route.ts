import { NextResponse } from "next/server"
import { boardDiffSchema } from "@/lib/board-diff"

const MODEL = "gpt-4o-mini"

export async function POST(req: Request) {
  const body = await req.json()
  const { board, prompt } = body ?? {}

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
  }

  if (!board) {
    return NextResponse.json({ error: "Missing board" }, { status: 400 })
  }

  const schemaDescription =
    '{ "addBoxes": Array<{ "id": string, "text": string, "x": number, "y": number }>, ' +
    '"addNotes": Array<{ "id": string, "content": string, "x": number, "y": number }>, ' +
    '"addConnections": Array<{ "id": string, "from": string, "to": string }> }'

  const instruction =
    "You recommend additions to an architecture whiteboard. " +
    `Return ONLY valid JSON that matches this schema: ${schemaDescription}. ` +
    "Use unique IDs (prefix with 'ai-') and ensure connections reference existing or newly added box IDs. " +
    "If nothing to add, return empty arrays for addBoxes, addNotes, addConnections. " +
    "Do not include any extra text or markdown."

  const messages = [
    {
      role: "system",
      content:
        "You are an architecture assistant. Suggest concrete nodes and connections to improve the diagram. " +
        "Keep additions minimal, practical, and consistent with the existing components.",
    },
    {
      role: "user",
      content: `${instruction}\n\nBoard:\n${JSON.stringify(board)}\n\nUser prompt:\n${prompt ?? ""}`,
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

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (error) {
    console.error("Failed to parse AI JSON:", error)
    return NextResponse.json({ error: "AI response was not valid JSON." }, { status: 500 })
  }

  try {
    const diff = boardDiffSchema.parse(parsed)
    return NextResponse.json({ diff })
  } catch (error) {
    console.error("Invalid AI diff shape:", error)
    return NextResponse.json({ error: "AI response did not match schema." }, { status: 500 })
  }
}
