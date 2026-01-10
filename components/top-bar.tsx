"use client"

import { Button } from "@/components/ui/button"
import { Circle, MessageSquare, ClipboardCheck, Save } from "lucide-react"

export function TopBar() {
  const handleRecordSession = () => {
    console.log("Record session clicked")
  }

  const handleExplain = () => {
    console.log("Explain clicked")
  }

  const handleReview = () => {
    console.log("Review clicked")
  }

  const handleSave = () => {
    console.log("Save clicked")
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <span className="text-sm font-bold text-primary-foreground">SD</span>
        </div>
        <span className="text-lg font-semibold text-foreground">System Designer</span>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={handleRecordSession} className="bg-red-600 text-white hover:bg-red-700">
          <Circle className="h-4 w-4 fill-current" />
          Record Session
        </Button>
        <Button variant="ghost" size="sm" onClick={handleExplain} className="text-foreground hover:bg-muted">
          <MessageSquare className="h-4 w-4" />
          Explain
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReview} className="text-foreground hover:bg-muted">
          <ClipboardCheck className="h-4 w-4" />
          Review
        </Button>
        <Button variant="default" size="sm" onClick={handleSave}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
    </header>
  )
}
