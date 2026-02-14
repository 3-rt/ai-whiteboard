"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import type { BoardSnapshot } from "@/components/whiteboard"
import { Send, Lightbulb, AlertTriangle, HelpCircle, Sparkles, MessageSquare, ClipboardCheck, Wand2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { BoardDiff } from "@/lib/board-diff"

interface DocumentMeta {
  id: string
  filename: string
  storage_path: string
}

interface AIPanelProps {
  board: BoardSnapshot | null
  activeTab: "ask" | "summary" | "risks" | "suggestions"
  onTabChange: (tab: "ask" | "summary" | "risks" | "suggestions") => void
  onApplyDiff: (diff: BoardDiff) => void
  onPreviewDiff: (diff: BoardDiff | null) => void
  onOpenAssistant: () => void
  onOpenUpload: () => void
}

const renderInline = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return <span key={index}>{part}</span>
  })
}

const renderMarkdown = (text: string) => {
  const lines = text.split(/\r?\n/)
  const nodes: React.ReactNode[] = []
  let paragraph: string[] = []
  let list: { type: "ul" | "ol"; items: string[] } | null = null

  const flushParagraph = () => {
    if (!paragraph.length) return
    const content = paragraph.join(" ").trim()
    if (content) {
      nodes.push(
        <p key={`p-${nodes.length}`} className="text-base text-foreground leading-relaxed">
          {renderInline(content)}
        </p>,
      )
    }
    paragraph = []
  }

  const flushList = () => {
    if (!list) return
    const ListTag = list.type
    const listClass =
      list.type === "ol" ? "ml-5 list-inside list-decimal space-y-2 text-base" : "ml-5 list-inside list-disc space-y-2 text-base"
    nodes.push(
      <ListTag key={`list-${nodes.length}`} className={listClass}>
        {list.items.map((item, index) => (
          <li key={`li-${index}`}>{renderInline(item)}</li>
        ))}
      </ListTag>,
    )
    list = null
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed) {
      flushParagraph()
      flushList()
      return
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length
      const content = headingMatch[2]
      const HeadingTag = level === 1 ? "h2" : level === 2 ? "h3" : "h4"
      nodes.push(
        <HeadingTag key={`h-${nodes.length}`} className="text-lg font-semibold text-foreground">
          {renderInline(content)}
        </HeadingTag>,
      )
      return
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/)
    if (unorderedMatch) {
      flushParagraph()
      if (!list || list.type !== "ul") {
        flushList()
        list = { type: "ul", items: [] }
      }
      list.items.push(unorderedMatch[1])
      return
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/)
    if (orderedMatch) {
      flushParagraph()
      if (!list || list.type !== "ol") {
        flushList()
        list = { type: "ol", items: [] }
      }
      list.items.push(orderedMatch[1])
      return
    }

    flushList()
    paragraph.push(trimmed)
  })

  flushParagraph()
  flushList()
  return <div className="space-y-3">{nodes}</div>
}

export function AIPanel({
  board,
  activeTab,
  onTabChange,
  onApplyDiff,
  onPreviewDiff,
  onOpenAssistant,
  onOpenUpload,
}: AIPanelProps) {
  const [query, setQuery] = useState("")
  const [documents, setDocuments] = useState<DocumentMeta[]>([])
  const [askResponse, setAskResponse] = useState<string | null>(null)
  const [askError, setAskError] = useState<string | null>(null)
  const [isAsking, setIsAsking] = useState(false)
  const [summaryResponse, setSummaryResponse] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [isSummaryLoading, setIsSummaryLoading] = useState(false)
  const [risksResponse, setRisksResponse] = useState<string | null>(null)
  const [risksError, setRisksError] = useState<string | null>(null)
  const [isRisksLoading, setIsRisksLoading] = useState(false)
  const [suggestPrompt, setSuggestPrompt] = useState("")
  const [suggestions, setSuggestions] = useState<BoardDiff | null>(null)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [isSuggesting, setIsSuggesting] = useState(false)

  const loadDocuments = async () => {
    const boardId = localStorage.getItem("whiteboard-id")
    if (!boardId) return

    const { data, error } = await supabase
      .from("documents")
      .select("id, filename, storage_path")
      .eq("board_id", boardId)
      .order("uploaded_at", { ascending: false })

    if (error) {
      console.error("Failed to load documents", error)
      return
    }

    setDocuments(data ?? [])
  }

  useEffect(() => {
    loadDocuments().catch((error) => {
      console.error("Failed to load documents", error)
    })
  }, [])

  useEffect(() => {
    if (activeTab !== "suggestions") {
      onPreviewDiff(null)
    }
  }, [activeTab, onPreviewDiff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setIsAsking(true)
    setAskError(null)

    try {
      const boardPayload = board ?? { boxes: [], connections: [], notes: [] }
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ask",
          board: boardPayload,
          docs: documents,
          question: query.trim(),
        }),
      })

      if (!res.ok) {
        throw new Error("Request failed")
      }

      const data = await res.json()
      setAskResponse(data.response ?? "No response")
    } catch (error) {
      console.error("Ask AI failed", error)
      setAskError("Something went wrong. Try again.")
    } finally {
      setIsAsking(false)
      setQuery("")
    }
  }

  const handleGenerate = async (mode: "summary" | "risks") => {
    const boardPayload = board ?? { boxes: [], connections: [], notes: [] }
    switch (mode) {
      case "summary":
        setIsSummaryLoading(true)
        setSummaryError(null)
        break
      case "risks":
        setIsRisksLoading(true)
        setRisksError(null)
        break
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          board: boardPayload,
          docs: documents,
          question: "",
        }),
      })

      if (!res.ok) {
        throw new Error("Request failed")
      }

      const data = await res.json()
      const responseText = data.response ?? "No response"

      switch (mode) {
        case "summary":
          setSummaryResponse(responseText)
          break
        case "risks":
          setRisksResponse(responseText)
          break
      }
    } catch (error) {
      console.error(`${mode} generation failed`, error)
      switch (mode) {
        case "summary":
          setSummaryError("Something went wrong. Try again.")
          break
        case "risks":
          setRisksError("Something went wrong. Try again.")
          break
      }
    } finally {
      switch (mode) {
        case "summary":
          setIsSummaryLoading(false)
          break
        case "risks":
          setIsRisksLoading(false)
          break
      }
    }
  }

  const handleSuggest = async () => {
    setIsSuggesting(true)
    setSuggestionsError(null)

    try {
      const boardPayload = board ?? { boxes: [], connections: [], notes: [] }
      const res = await fetch("/api/ai/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board: boardPayload,
          prompt: suggestPrompt.trim(),
        }),
      })

      if (!res.ok) {
        throw new Error("Request failed")
      }

      const data = await res.json()
      const next = data.diff ?? null
      setSuggestions(next)
      onPreviewDiff(next)
    } catch (error) {
      console.error("Suggestion request failed", error)
      setSuggestionsError("Something went wrong. Try again.")
      onPreviewDiff(null)
    } finally {
      setIsSuggesting(false)
    }
  }

  const handleApplySuggestions = () => {
    if (!suggestions) return
    onApplyDiff(suggestions)
    setSuggestions(null)
    onPreviewDiff(null)
  }

  return (
    <div className="flex w-[400px] min-h-0 flex-col bg-card">
      <div className="border-b border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">AI Assistant</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Analyze your architecture, identify risks, and explore what-if scenarios. Select a tab or ask a question
              below.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onOpenAssistant}
              disabled
              className="text-foreground hover:bg-muted"
            >
              <MessageSquare className="h-4 w-4" />
              Open AI Assistant
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onOpenUpload} className="text-foreground hover:bg-muted">
              <ClipboardCheck className="h-4 w-4" />
              Go to Upload
            </Button>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange(value as AIPanelProps["activeTab"])}
        className="flex min-h-0 flex-1 flex-col"
      >
        <TabsList className="mx-4 mt-4 grid w-auto grid-cols-4 bg-muted">
          <TabsTrigger value="ask" className="text-xs data-[state=active]:text-foreground">
            <HelpCircle className="mr-1 h-3 w-3" />
            Ask AI
          </TabsTrigger>
          <TabsTrigger value="summary" className="text-xs data-[state=active]:text-foreground">
            <Lightbulb className="mr-1 h-3 w-3" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="risks" className="text-xs data-[state=active]:text-foreground">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Risks
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs data-[state=active]:text-foreground">
            <Wand2 className="mr-1 h-3 w-3" />
            Suggest
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-1 min-h-0 flex-col overflow-hidden p-4">
          <TabsContent value="ask" className="mt-0 flex min-h-0 flex-1 flex-col">
            <Card className="flex min-h-0 flex-1 flex-col border-border bg-card">
              <CardContent className="min-h-0 flex-1 overflow-auto text-sm text-muted-foreground">
                {!askResponse ? (
                  <p>
                    Ask open-ended questions about the system, why choices were made, or what-if scenarios. The
                    assistant will use the board context to respond.
                  </p>
                ) : (
                  <div className="text-base text-foreground">{renderMarkdown(askResponse)}</div>
                )}
                {askError && <p className="mt-2 text-xs text-red-400">{askError}</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="mt-0 flex min-h-0 flex-1 flex-col">
            <Card className="flex min-h-0 flex-1 flex-col border-border bg-card">
              <CardContent className="min-h-0 flex-1 overflow-auto text-sm text-muted-foreground">
                <div className="mb-3 flex items-center justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerate("summary")}
                    disabled={isSummaryLoading}
                  >
                    {isSummaryLoading ? "Generating..." : summaryResponse ? "Refresh" : "Generate"}
                  </Button>
                </div>
                {summaryResponse ? (
                  <div className="text-base text-foreground">{renderMarkdown(summaryResponse)}</div>
                ) : (
                  <>
                    <p>
                      Your current architecture shows a typical microservices pattern with an API Gateway handling
                      incoming requests, routing them to the Auth Service for authentication, and connecting to a
                      central Database for data persistence.
                    </p>
                    <p className="mt-3">
                      This setup provides good separation of concerns and allows for independent scaling of services.
                    </p>
                  </>
                )}
                {summaryError && <p className="mt-2 text-xs text-red-400">{summaryError}</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks" className="mt-0 flex min-h-0 flex-1 flex-col">
            <Card className="flex min-h-0 flex-1 flex-col border-border bg-card">
              <CardContent className="min-h-0 flex-1 overflow-auto space-y-3">
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerate("risks")}
                    disabled={isRisksLoading}
                  >
                    {isRisksLoading ? "Generating..." : risksResponse ? "Refresh" : "Generate"}
                  </Button>
                </div>
                {risksResponse ? (
                  <div className="text-base text-foreground">{renderMarkdown(risksResponse)}</div>
                ) : (
                  <>
                    <div className="rounded-md bg-red-500/10 p-3">
                      <p className="text-sm font-medium text-red-400">Single Point of Failure</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The API Gateway is a single point of failure. Consider adding redundancy.
                      </p>
                    </div>
                    <div className="rounded-md bg-yellow-500/10 p-3">
                      <p className="text-sm font-medium text-yellow-400">Database Bottleneck</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        All services connect to one database. Consider read replicas for scaling.
                      </p>
                    </div>
                  </>
                )}
                {risksError && <p className="mt-2 text-xs text-red-400">{risksError}</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions" className="mt-0 flex min-h-0 flex-1 flex-col">
            <Card className="flex min-h-0 flex-1 flex-col border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-foreground">AI Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 space-y-3 overflow-auto text-sm text-muted-foreground">
                <div className="space-y-2">
                  <Input
                    placeholder="Optional: focus the recommendation (e.g. add caching + observability)"
                    value={suggestPrompt}
                    onChange={(e) => setSuggestPrompt(e.target.value)}
                    className="bg-muted text-foreground placeholder:text-muted-foreground"
                  />
                  <Button type="button" size="sm" variant="outline" onClick={handleSuggest} disabled={isSuggesting}>
                    {isSuggesting ? "Generating..." : "Get Suggestions"}
                  </Button>
                </div>

                {suggestions ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-border bg-muted/40 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Additions</p>
                      <div className="mt-2 space-y-2 text-sm text-foreground">
                        <p>Boxes: {suggestions.addBoxes.length}</p>
                        <p>Notes: {suggestions.addNotes.length}</p>
                        <p>Connections: {suggestions.addConnections.length}</p>
                      </div>
                    </div>
                    {suggestions.addBoxes.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Boxes</p>
                        <div className="mt-2 space-y-1 text-sm text-foreground">
                          {suggestions.addBoxes.map((box) => (
                            <div key={box.id} className="rounded-md border border-border px-2 py-1">
                              {box.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {suggestions.addNotes.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                        <div className="mt-2 space-y-1 text-sm text-foreground">
                          {suggestions.addNotes.map((note) => (
                            <div key={note.id} className="rounded-md border border-border px-2 py-1">
                              {note.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {suggestions.addConnections.length > 0 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Connections</p>
                        <div className="mt-2 space-y-1 text-sm text-foreground">
                          {suggestions.addConnections.map((conn) => (
                            <div key={conn.id} className="rounded-md border border-border px-2 py-1">
                              {conn.from} → {conn.to}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Button type="button" size="sm" onClick={handleApplySuggestions}>
                        Apply
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSuggestions(null)
                          onPreviewDiff(null)
                        }}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p>Generate suggestions to see AI-proposed additions.</p>
                )}
                {suggestionsError && <p className="text-xs text-red-400">{suggestionsError}</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </div>

        {activeTab === "ask" && (
          <form onSubmit={handleSubmit} className="border-t border-border p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ask about this architecture..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-muted text-foreground placeholder:text-muted-foreground"
              />
              <Button type="submit" size="icon" disabled={isAsking}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
          </form>
        )}
      </Tabs>
    </div>
  )
}
