"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, ClipboardCheck } from "lucide-react"

interface TopBarProps {
  onExplain?: () => void
  onReview?: () => void
}

export function TopBar({ onExplain, onReview }: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <span className="text-sm font-bold text-primary-foreground">SD</span>
        </div>
        <span className="text-lg font-semibold text-foreground">System Designer</span>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onExplain} className="text-foreground hover:bg-muted">
          <MessageSquare className="h-4 w-4" />
          Open AI Assistant
        </Button>
        <Button variant="ghost" size="sm" onClick={onReview} className="text-foreground hover:bg-muted">
          <ClipboardCheck className="h-4 w-4" />
          Go to Upload
        </Button>
      </div>
    </header>
  )
}
