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

  return (
    <div className="flex h-screen flex-col bg-background dark">
      <TopBar
        onExplain={() => {
          setActiveTab("summary")
          setShowDocumentsPanel(false)
        }}
        onReview={() => {
          setShowDocumentsPanel(true)
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        <Whiteboard onBoardChange={setBoardSnapshot} />
        {showDocumentsPanel ? (
          <DocumentsPanel />
        ) : (
          <AIPanel board={boardSnapshot} activeTab={activeTab} onTabChange={setActiveTab} />
        )}
      </div>
    </div>
  )
}
