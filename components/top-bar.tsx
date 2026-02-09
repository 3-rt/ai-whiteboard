"use client"

import { Button } from "@/components/ui/button"
import { HelpCircle } from "lucide-react"

interface TopBarProps {
  onHowToOpen: () => void
}

export function TopBar({ onHowToOpen }: TopBarProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-4">
      <div className="flex items-center gap-2">
        <img src="/favicon.svg" alt="Flow Design AI" className="h-6 w-6" />
        <span className="text-lg font-semibold text-foreground">Flow Design AI</span>
      </div>
      <Button type="button" size="sm" variant="ghost" onClick={onHowToOpen} className="text-foreground hover:bg-muted">
        <HelpCircle className="h-4 w-4" />
        How to use
      </Button>
    </header>
  )
}
