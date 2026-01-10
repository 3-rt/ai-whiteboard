import { TopBar } from "@/components/top-bar"
import { Whiteboard } from "@/components/whiteboard"
import { AIPanel } from "@/components/ai-panel"

export default function Home() {
  return (
    <div className="flex h-screen flex-col bg-background dark">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Whiteboard />
        <AIPanel />
      </div>
    </div>
  )
}
