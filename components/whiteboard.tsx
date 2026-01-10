"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Square, Link2, StickyNote, GripVertical, Globe, Shield, Database } from "lucide-react"

interface Box {
  id: string
  title: string
  type: "gateway" | "service" | "database"
  x: number
  y: number
}

interface Connection {
  id: string
  from: string
  to: string
}

interface Note {
  id: string
  content: string
  x: number
  y: number
}

const getNodeIcon = (type: Box["type"]) => {
  switch (type) {
    case "gateway":
      return <Globe className="h-4 w-4 text-blue-400" />
    case "service":
      return <Shield className="h-4 w-4 text-green-400" />
    case "database":
      return <Database className="h-4 w-4 text-amber-400" />
  }
}

const getNodeLabel = (type: Box["type"]) => {
  switch (type) {
    case "gateway":
      return "Gateway"
    case "service":
      return "Service"
    case "database":
      return "Storage"
  }
}

export function Whiteboard() {
  const [boxes, setBoxes] = useState<Box[]>([
    { id: "1", title: "API Gateway", type: "gateway", x: 100, y: 100 },
    { id: "2", title: "Auth Service", type: "service", x: 350, y: 100 },
    { id: "3", title: "Database", type: "database", x: 225, y: 280 },
  ])
  const [connections, setConnections] = useState<Connection[]>([
    { id: "c1", from: "1", to: "2" },
    { id: "c2", from: "1", to: "3" },
    { id: "c3", from: "2", to: "3" },
  ])
  const [notes, setNotes] = useState<Note[]>([])
  const [dragging, setDragging] = useState<string | null>(null)
  const [connectMode, setConnectMode] = useState(false)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const whiteboardRef = useRef<HTMLDivElement>(null)

  const handleAddBox = () => {
    const newBox: Box = {
      id: `box-${Date.now()}`,
      title: `Service ${boxes.length + 1}`,
      type: "service",
      x: 150 + Math.random() * 100,
      y: 150 + Math.random() * 100,
    }
    setBoxes([...boxes, newBox])
  }

  const handleConnect = () => {
    setConnectMode(!connectMode)
    setConnectFrom(null)
  }

  const handleAddNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      content: "New note",
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 100,
    }
    setNotes([...notes, newNote])
  }

  const handleBoxClick = (boxId: string) => {
    if (connectMode) {
      if (!connectFrom) {
        setConnectFrom(boxId)
      } else if (connectFrom !== boxId) {
        const newConnection: Connection = {
          id: `conn-${Date.now()}`,
          from: connectFrom,
          to: boxId,
        }
        setConnections([...connections, newConnection])
        setConnectFrom(null)
        setConnectMode(false)
      }
    }
  }

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    if (connectMode) return
    e.preventDefault()
    setDragging(id)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !whiteboardRef.current) return

    const rect = whiteboardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - 75
    const y = e.clientY - rect.top - 25

    if (dragging.startsWith("note-")) {
      setNotes(notes.map((n) => (n.id === dragging ? { ...n, x, y } : n)))
    } else {
      setBoxes(boxes.map((b) => (b.id === dragging ? { ...b, x, y } : b)))
    }
  }

  const handleMouseUp = () => {
    setDragging(null)
  }

  const getBoxCenter = (box: Box) => ({
    x: box.x + 75,
    y: box.y + 30,
  })

  return (
    <div className="flex flex-1 flex-col border-r border-border">
      <div className="flex items-center gap-2 border-b border-border bg-zinc-900 p-3">
        <span className="mr-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Canvas Tools</span>
        <div className="h-4 w-px bg-zinc-700" />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddBox}
          className="border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white bg-transparent"
        >
          <Square className="h-4 w-4" />
          Add Box
        </Button>
        <Button
          variant={connectMode ? "default" : "outline"}
          size="sm"
          onClick={handleConnect}
          className={connectMode ? "" : "border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white"}
        >
          <Link2 className="h-4 w-4" />
          Connect
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddNote}
          className="border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white bg-transparent"
        >
          <StickyNote className="h-4 w-4" />
          Add Note
        </Button>
        {connectMode && (
          <span className="ml-2 text-sm text-zinc-300">
            {connectFrom ? "Click another box to connect" : "Click a box to start connection"}
          </span>
        )}
      </div>

      {/* Canvas Area */}
      <div
        ref={whiteboardRef}
        className="relative flex-1 overflow-hidden bg-zinc-950"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid pattern */}
        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-zinc-800"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Connection lines */}
          {connections.map((conn) => {
            const fromBox = boxes.find((b) => b.id === conn.from)
            const toBox = boxes.find((b) => b.id === conn.to)
            if (!fromBox || !toBox) return null

            const from = getBoxCenter(fromBox)
            const to = getBoxCenter(toBox)

            return (
              <line
                key={conn.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="currentColor"
                strokeWidth="2"
                className="text-zinc-500"
                markerEnd="url(#arrowhead)"
              />
            )
          })}

          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-zinc-500" />
            </marker>
          </defs>
        </svg>

        {/* Whiteboard label */}
        <div className="absolute left-4 top-4 text-sm font-medium text-zinc-500">Whiteboard</div>

        {/* Boxes */}
        {boxes.map((box) => (
          <Card
            key={box.id}
            className={`absolute w-[150px] cursor-move select-none border-zinc-700 bg-zinc-900 transition-shadow ${
              connectMode ? "cursor-pointer hover:ring-2 hover:ring-primary" : ""
            } ${connectFrom === box.id ? "ring-2 ring-primary" : ""}`}
            style={{ left: box.x, top: box.y }}
            onMouseDown={(e) => handleMouseDown(box.id, e)}
            onClick={() => handleBoxClick(box.id)}
          >
            <CardHeader className="p-3">
              <div className="mb-1 flex items-center gap-1">
                {getNodeIcon(box.type)}
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">{getNodeLabel(box.type)}</span>
              </div>
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-zinc-500" />
                <CardTitle className="text-sm text-zinc-100">{box.title}</CardTitle>
              </div>
            </CardHeader>
          </Card>
        ))}

        {/* Notes */}
        {notes.map((note) => (
          <div
            key={note.id}
            className="absolute w-[120px] cursor-move select-none rounded-md bg-yellow-500/90 p-2 text-xs text-yellow-950 shadow-md"
            style={{ left: note.x, top: note.y }}
            onMouseDown={(e) => handleMouseDown(note.id, e)}
          >
            {note.content}
          </div>
        ))}
      </div>
    </div>
  )
}
