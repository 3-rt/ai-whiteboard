"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Square, Link2, StickyNote, GripVertical, Globe, Shield, Database } from "lucide-react"
import { supabase } from "@/lib/supabase"

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

export interface BoardSnapshot {
  boxes: Box[]
  connections: Connection[]
  notes: Note[]
}

interface WhiteboardProps {
  onBoardChange?: (board: BoardSnapshot) => void
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

export function Whiteboard({ onBoardChange }: WhiteboardProps) {
  // Core board state (nodes, edges, notes)
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
  // Interaction state for dragging and connecting
  const [dragging, setDragging] = useState<string | null>(null)
  const [connectMode, setConnectMode] = useState(false)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const whiteboardRef = useRef<HTMLDivElement>(null)
  const [boardId, setBoardId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null)
  const [editingBoxValue, setEditingBoxValue] = useState("")
  const editingInputRef = useRef<HTMLInputElement>(null)
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadBoard = async () => {
      const storedId = localStorage.getItem("whiteboard-id")
      const id = storedId || crypto.randomUUID()

      if (!storedId) {
        localStorage.setItem("whiteboard-id", id)
      }

      if (isMounted) setBoardId(id)

      const { data, error } = await supabase.from("boards").select("data").eq("id", id).maybeSingle()

      if (!error && data?.data) {
        const boardData = data.data as {
          boxes?: Box[]
          connections?: Connection[]
          notes?: Note[]
        }
        if (boardData.boxes) setBoxes(boardData.boxes)
        if (boardData.connections) setConnections(boardData.connections)
        if (boardData.notes) setNotes(boardData.notes)
      } else if (error) {
        console.error("Failed to load board", error)
      }

      if (isMounted) setIsLoading(false)
    }

    loadBoard()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!boardId || isLoading) return
    const timeoutId = window.setTimeout(async () => {
      const payload = {
        id: boardId,
        name: "Default board",
        data: {
          boxes,
          connections,
          notes,
        },
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("boards").upsert(payload)
      if (error) {
        console.error("Failed to autosave board", error)
      }
    }, 800)

    return () => window.clearTimeout(timeoutId)
  }, [boardId, boxes, connections, notes, isLoading])

  const getDefaultTitle = (type: Box["type"]) => {
    switch (type) {
      case "gateway":
        return "New Gateway"
      case "service":
        return "New Service"
      case "database":
        return "New Storage"
    }
  }

  // Add a new box of the selected type at a random-ish position
  const handleAddBox = (type: Box["type"]) => {
    const newBox: Box = {
      id: `box-${Date.now()}`,
      title: getDefaultTitle(type),
      type,
      x: 150 + Math.random() * 100,
      y: 150 + Math.random() * 100,
    }
    setBoxes([...boxes, newBox])
    setEditingBoxId(newBox.id)
    setEditingBoxValue(newBox.title)
  }

  // Toggle connect mode (click two boxes to create a line)
  const handleConnect = () => {
    setConnectMode(!connectMode)
    setConnectFrom(null)
  }

  // Add a sticky note at a random-ish position
  const handleAddNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      content: "New note",
      x: 50 + Math.random() * 100,
      y: 50 + Math.random() * 100,
    }
    setNotes([...notes, newNote])
  }

  // Handle box click when in connect mode
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
      return
    }
    setSelectedBoxId(boxId)
    setSelectedConnectionId(null)
  }

  const handleConnectionClick = (connId: string) => {
    if (connectMode) return
    setSelectedConnectionId(connId)
    setSelectedBoxId(null)
  }

  const startEditingBox = (box: Box) => {
    setEditingBoxId(box.id)
    setEditingBoxValue(box.title)
  }

  const commitBoxTitle = () => {
    if (!editingBoxId) return
    const nextTitle = editingBoxValue.trim() || "Untitled Service"
    setBoxes(boxes.map((b) => (b.id === editingBoxId ? { ...b, title: nextTitle } : b)))
    setEditingBoxId(null)
  }

  // Start dragging a box or note
  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    if (connectMode) return
    e.preventDefault()
    setDragging(id)
  }

  // Update position while dragging
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

  // Stop dragging
  const handleMouseUp = () => {
    setDragging(null)
  }

  // Used to draw lines from the visual center of each box
  const getBoxCenter = (box: Box) => ({
    x: box.x + 75,
    y: box.y + 30,
  })

  useEffect(() => {
    if (editingBoxId && editingInputRef.current) {
      editingInputRef.current.focus()
      editingInputRef.current.select()
    }
  }, [editingBoxId])

  useEffect(() => {
    if (!onBoardChange) return
    onBoardChange({ boxes, connections, notes })
  }, [boxes, connections, notes, onBoardChange])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedBoxId(null)
        setSelectedConnectionId(null)
        setConnectFrom(null)
        setConnectMode(false)
        return
      }
      if (e.key !== "Delete" && e.key !== "Backspace") return
      if (selectedBoxId) {
        if (editingBoxId === selectedBoxId) return
        setBoxes((prev) => prev.filter((b) => b.id !== selectedBoxId))
        setConnections((prev) => prev.filter((c) => c.from !== selectedBoxId && c.to !== selectedBoxId))
        setSelectedBoxId(null)
        return
      }
      if (selectedConnectionId) {
        setConnections((prev) => prev.filter((c) => c.id !== selectedConnectionId))
        setSelectedConnectionId(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedBoxId, editingBoxId])

  useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      if (!whiteboardRef.current) return
      if (whiteboardRef.current.contains(e.target as Node)) return
      setSelectedBoxId(null)
      setSelectedConnectionId(null)
    }

    document.addEventListener("mousedown", handleDocumentMouseDown)
    return () => document.removeEventListener("mousedown", handleDocumentMouseDown)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col border-r border-border">
      <div className="flex items-center gap-2 border-b border-border bg-zinc-900 p-3">
        <span className="mr-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Canvas Tools</span>
        <div className="h-4 w-px bg-zinc-700" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddBox("gateway")}
          className="border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white bg-transparent"
        >
          <Globe className="h-4 w-4" />
          Add Gateway
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddBox("service")}
          className="border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white bg-transparent"
        >
          <Shield className="h-4 w-4" />
          Add Service
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleAddBox("database")}
          className="border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white bg-transparent"
        >
          <Database className="h-4 w-4" />
          Add Storage
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
        onMouseDown={(e) => {
          const target = e.target as HTMLElement
          if (target.closest("[data-whiteboard-item='true']")) return
          setSelectedBoxId(null)
          setSelectedConnectionId(null)
        }}
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
            const isSelected = selectedConnectionId === conn.id

            return (
              <g key={conn.id}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="transparent"
                  strokeWidth="12"
                  className="cursor-pointer"
                  onClick={() => handleConnectionClick(conn.id)}
                  data-whiteboard-item="true"
                />
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="currentColor"
                  strokeWidth={isSelected ? "3" : "2"}
                  className={isSelected ? "text-blue-400" : "text-zinc-500"}
                  markerEnd="url(#arrowhead)"
                  onClick={() => handleConnectionClick(conn.id)}
                  data-whiteboard-item="true"
                />
              </g>
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
            } ${connectFrom === box.id ? "ring-2 ring-primary" : ""} ${
              selectedBoxId === box.id ? "ring-2 ring-blue-500" : ""
            }`}
            style={{ left: box.x, top: box.y }}
            onMouseDown={(e) => handleMouseDown(box.id, e)}
            onClick={() => handleBoxClick(box.id)}
            data-whiteboard-item="true"
          >
            <CardHeader className="p-3">
              <div className="mb-1 flex items-center gap-1">
                {getNodeIcon(box.type)}
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">{getNodeLabel(box.type)}</span>
              </div>
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-zinc-500" />
                {editingBoxId === box.id ? (
                  <input
                    ref={editingInputRef}
                    value={editingBoxValue}
                    onChange={(e) => setEditingBoxValue(e.target.value)}
                    onBlur={commitBoxTitle}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitBoxTitle()
                      if (e.key === "Escape") setEditingBoxId(null)
                    }}
                    className="w-full bg-transparent text-sm text-zinc-100 outline-none"
                  />
                ) : (
                  <CardTitle
                    className="text-sm text-zinc-100"
                    onDoubleClick={() => startEditingBox(box)}
                  >
                    {box.title}
                  </CardTitle>
                )}
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
            data-whiteboard-item="true"
          >
            {note.content}
          </div>
        ))}
      </div>
    </div>
  )
}
