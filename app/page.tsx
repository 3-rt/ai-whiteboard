"use client"

import { TopBar } from "@/components/top-bar"
import { useState } from "react"
import { Whiteboard, type BoardSnapshot } from "@/components/whiteboard"
import { AIPanel } from "@/components/ai-panel"
import { DocumentsPanel } from "@/components/documents-panel"

export default function Home() {
  const [boardSnapshot, setBoardSnapshot] = useState<BoardSnapshot | null>(null)
  const [activeTab, setActiveTab] = useState<"ask" | "summary" | "risks" | "decisions">("ask")
  const [showDocumentsPanel, setShowDocumentsPanel] = useState(false)
  const [showHowTo, setShowHowTo] = useState(true)

  return (
    <div className="flex h-screen flex-col bg-background dark">
      <TopBar onHowToOpen={() => setShowHowTo(true)} />
      {showHowTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-foreground">How to use</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Use the canvas to add gateways, services, and storage nodes. Drag to reposition, connect nodes, and
              double-click a title to edit it.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask questions in the AI Assistant panel, or upload supporting docs in the Documents panel. Your board
              autosaves as you make changes.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                onClick={() => setShowHowTo(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Whiteboard onBoardChange={setBoardSnapshot} />
        {showDocumentsPanel ? (
          <DocumentsPanel
            onOpenAssistant={() => {
              setActiveTab("summary")
              setShowDocumentsPanel(false)
            }}
            onOpenUpload={() => {
              setShowDocumentsPanel(true)
            }}
          />
        ) : (
          <AIPanel
            board={boardSnapshot}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onOpenAssistant={() => {
              setActiveTab("summary")
              setShowDocumentsPanel(false)
            }}
            onOpenUpload={() => {
              setShowDocumentsPanel(true)
            }}
          />
        )}
      </div>
    </div>
  )
}
