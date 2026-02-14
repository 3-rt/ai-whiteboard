"use client"

import type React from "react"

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Link2, StickyNote, GripVertical } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { BoardDiff } from "@/lib/board-diff"

const BOX_WIDTH = 180
const BOX_HEIGHT = 120
const NOTE_WIDTH = 120
const NOTE_HEIGHT = 90
const MIN_GAP = 40
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

interface Box {
  id: string
  x: number
  y: number
  text: string
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

export interface WhiteboardHandle {
  applyDiff: (diff: BoardDiff) => void
}

interface WhiteboardProps {
  onBoardChange?: (board: BoardSnapshot) => void
  previewDiff?: BoardDiff | null
}

export const Whiteboard = forwardRef<WhiteboardHandle, WhiteboardProps>(({ onBoardChange, previewDiff }, ref) => {
  const toNumber = (value: unknown, fallback: number) => {
    const num = typeof value === "number" ? value : Number.parseFloat(String(value))
    return Number.isFinite(num) ? num : fallback
  }

  const rectsOverlapWithGap = (
    a: { x: number; y: number; w: number; h: number },
    b: { x: number; y: number; w: number; h: number },
    gap: number
  ) =>
    a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y

  const findOpenSpot = (
    x: number,
    y: number,
    w: number,
    h: number,
    occupied: Array<{ x: number; y: number; w: number; h: number }>
  ) => {
    const isBlocked = (nx: number, ny: number) =>
      occupied.some((rect) => rectsOverlapWithGap({ x: nx, y: ny, w, h }, rect, MIN_GAP))

    if (!isBlocked(x, y)) return { x, y }

    const step = MIN_GAP
    const maxRadius = step * 8
    for (let radius = step; radius <= maxRadius; radius += step) {
      for (let dx = -radius; dx <= radius; dx += step) {
        for (let dy = -radius; dy <= radius; dy += step) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue
          const nx = x + dx
          const ny = y + dy
          if (!isBlocked(nx, ny)) return { x: nx, y: ny }
        }
      }
    }

    return { x, y }
  }

  const applyMinGapToDiff = (diff: BoardDiff, currentBoxes: Box[], currentNotes: Note[]) => {
    const occupied: Array<{ x: number; y: number; w: number; h: number }> = [
      ...currentBoxes.map((box) => ({ x: box.x, y: box.y, w: BOX_WIDTH, h: BOX_HEIGHT })),
      ...currentNotes.map((note) => ({ x: note.x, y: note.y, w: NOTE_WIDTH, h: NOTE_HEIGHT })),
    ]

    const spacedBoxes = diff.addBoxes.map((box) => {
      const { x, y } = findOpenSpot(box.x, box.y, BOX_WIDTH, BOX_HEIGHT, occupied)
      occupied.push({ x, y, w: BOX_WIDTH, h: BOX_HEIGHT })
      return { ...box, x, y }
    })

    const spacedNotes = diff.addNotes.map((note) => {
      const { x, y } = findOpenSpot(note.x, note.y, NOTE_WIDTH, NOTE_HEIGHT, occupied)
      occupied.push({ x, y, w: NOTE_WIDTH, h: NOTE_HEIGHT })
      return { ...note, x, y }
    })

    return { ...diff, addBoxes: spacedBoxes, addNotes: spacedNotes }
  }

  // Core board state (nodes, edges, notes)
  const [boxes, setBoxes] = useState<Box[]>([
    { id: "1", text: "API Gateway", x: 100, y: 100 },
    { id: "2", text: "Auth Service", x: 350, y: 100 },
    { id: "3", text: "Database", x: 225, y: 280 },
  ])
  const [connections, setConnections] = useState<Connection[]>([
    { id: "c1", from: "1", to: "2" },
    { id: "c2", from: "1", to: "3" },
    { id: "c3", from: "2", to: "3" },
  ])
  const [notes, setNotes] = useState<Note[]>([])
  // Interaction state for dragging and connecting
  const [dragging, setDragging] = useState<string | null>(null)
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null)
  const [connectMode, setConnectMode] = useState(false)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const whiteboardRef = useRef<HTMLDivElement>(null)
  const [boardId, setBoardId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null)
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null)
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)
  const [editingBoxId, setEditingBoxId] = useState<string | null>(null)
  const [editingBoxValue, setEditingBoxValue] = useState("")
  const editingInputRef = useRef<HTMLTextAreaElement>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingNoteValue, setEditingNoteValue] = useState("")
  const editingNoteRef = useRef<HTMLTextAreaElement>(null)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 })
  const boxesRef = useRef<Box[]>([])
  const notesRef = useRef<Note[]>([])
  const panStartRef = useRef<{ x: number; y: number; viewX: number; viewY: number } | null>(null)
  const spacePressedRef = useRef(false)

  useEffect(() => {
    boxesRef.current = boxes
    notesRef.current = notes
  }, [boxes, notes])

  useImperativeHandle(
    ref,
    () => ({
      applyDiff: (diff) => {
        const spacedDiff = applyMinGapToDiff(diff, boxesRef.current, notesRef.current)
        setBoxes((prev) => [...prev, ...spacedDiff.addBoxes])
        setNotes((prev) => [...prev, ...spacedDiff.addNotes])
        setConnections((prev) => [...prev, ...spacedDiff.addConnections])
      },
    }),
    []
  )

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
        if (boardData.boxes) {
          const normalized = boardData.boxes.map((box) => ({
            id: box.id,
            x: toNumber(box.x, 0),
            y: toNumber(box.y, 0),
            text: typeof (box as Box).text === "string" ? (box as Box).text : (box as { title?: string }).title ?? "",
          }))
          setBoxes(normalized)
        }
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

  // Add a new box at a random-ish position
  const handleAddBox = () => {
    const newBox: Box = {
      id: `box-${Date.now()}`,
      text: "New box",
      x: 150 + Math.random() * 100,
      y: 150 + Math.random() * 100,
    }
    setBoxes([...boxes, newBox])
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

  const handleClearCanvas = () => {
    setBoxes([])
    setConnections([])
    setNotes([])
    setSelectedBoxId(null)
    setSelectedConnectionId(null)
    setConnectFrom(null)
    setConnectMode(false)
    setShowClearDialog(false)
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
    setSelectedNoteId(null)
  }

  const startEditingBox = (box: Box) => {
    setEditingBoxId(box.id)
    setEditingBoxValue(box.text)
  }

  const commitBoxText = () => {
    if (!editingBoxId) return
    const nextText = editingBoxValue.trim()
    setBoxes((prev) => prev.map((b) => (b.id === editingBoxId ? { ...b, text: nextText } : b)))
    setEditingBoxId(null)
  }

  const startEditingNote = (note: Note) => {
    setEditingNoteId(note.id)
    setEditingNoteValue(note.content)
  }

  const commitNoteText = () => {
    if (!editingNoteId) return
    const nextText = editingNoteValue.trim()
    setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? { ...n, content: nextText } : n)))
    setEditingNoteId(null)
  }

  const getWorldPoint = (e: { clientX: number; clientY: number }) => {
    if (!whiteboardRef.current) return { x: 0, y: 0 }
    const rect = whiteboardRef.current.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left - view.x) / view.scale,
      y: (e.clientY - rect.top - view.y) / view.scale,
    }
  }

  // Start dragging a box or note
  const handleMouseDown = (id: string, x: number, y: number, e: React.MouseEvent) => {
    if (connectMode) return
    e.preventDefault()
    setDragging(id)
    const world = getWorldPoint(e)
    dragOffsetRef.current = { x: world.x - x, y: world.y - y }
  }

  // Update position while dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (panStartRef.current) {
      const deltaX = e.clientX - panStartRef.current.x
      const deltaY = e.clientY - panStartRef.current.y
      setView({
        x: panStartRef.current.viewX + deltaX,
        y: panStartRef.current.viewY + deltaY,
        scale: view.scale,
      })
      return
    }
    if (!dragging || !whiteboardRef.current) return

    const offset = dragOffsetRef.current ?? { x: 0, y: 0 }
    const world = getWorldPoint(e)
    const x = world.x - offset.x
    const y = world.y - offset.y

    if (dragging.startsWith("note-")) {
      setNotes((prev) => prev.map((n) => (n.id === dragging ? { ...n, x, y } : n)))
    } else {
      setBoxes((prev) => prev.map((b) => (b.id === dragging ? { ...b, x, y } : b)))
    }
  }

  // Stop dragging
  const handleMouseUp = () => {
    panStartRef.current = null
    setDragging(null)
    dragOffsetRef.current = null
  }

  // Used to draw lines from the visual center of each box
  const getBoxCenter = (box: Box) => ({
    x: box.x + BOX_WIDTH / 2,
    y: box.y + BOX_HEIGHT / 2,
  })

  useEffect(() => {
    if (editingBoxId && editingInputRef.current) {
      editingInputRef.current.focus()
      editingInputRef.current.select()
    }
  }, [editingBoxId])

  useEffect(() => {
    if (editingNoteId && editingNoteRef.current) {
      editingNoteRef.current.focus()
      editingNoteRef.current.select()
    }
  }, [editingNoteId])

  useEffect(() => {
    if (!onBoardChange) return
    onBoardChange({ boxes, connections, notes })
  }, [boxes, connections, notes, onBoardChange])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === " ") {
        spacePressedRef.current = true
      }
      if (e.key === "Escape") {
        setSelectedBoxId(null)
        setSelectedConnectionId(null)
        setConnectFrom(null)
        setConnectMode(false)
        return
      }
      if (e.key !== "Delete" && e.key !== "Backspace") return
      if (selectedBoxId) {
        setBoxes((prev) => prev.filter((b) => b.id !== selectedBoxId))
        setConnections((prev) => prev.filter((c) => c.from !== selectedBoxId && c.to !== selectedBoxId))
        setSelectedBoxId(null)
        return
      }
      if (selectedConnectionId) {
        setConnections((prev) => prev.filter((c) => c.id !== selectedConnectionId))
        setSelectedConnectionId(null)
      }
      if (selectedNoteId) {
        if (editingNoteId === selectedNoteId) return
        setNotes((prev) => prev.filter((n) => n.id !== selectedNoteId))
        setSelectedNoteId(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        spacePressedRef.current = false
      }
    }
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [selectedBoxId, selectedNoteId, editingNoteId])

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

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!whiteboardRef.current) return
    e.preventDefault()
    const rect = whiteboardRef.current.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top

    if (e.ctrlKey) {
      const zoomFactor = 1 - e.deltaY * 0.005
      setView((prev) => {
        const nextScale = clamp(prev.scale * zoomFactor, 0.25, 3)
        const wx = (cx - prev.x) / prev.scale
        const wy = (cy - prev.y) / prev.scale
        const nextX = cx - wx * nextScale
        const nextY = cy - wy * nextScale
        return { x: nextX, y: nextY, scale: nextScale }
      })
      return
    }

    setView((prev) => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY,
      scale: prev.scale,
    }))
  }, [])

  useEffect(() => {
    const node = whiteboardRef.current
    if (!node) return
    node.addEventListener("wheel", handleWheel, { passive: false })
    return () => node.removeEventListener("wheel", handleWheel)
  }, [handleWheel])

  return (
    <div className="flex min-h-0 flex-1 flex-col border-r border-border">
      <div className="flex items-center gap-2 border-b border-border bg-zinc-900 p-3">
        <span className="mr-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Canvas Tools</span>
        <div className="h-4 w-px bg-zinc-700" />
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddBox}
          className="border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white bg-transparent"
        >
          <GripVertical className="h-4 w-4" />
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowClearDialog(true)}
          className="border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-white bg-transparent"
        >
          Clear Canvas
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
          if (e.button === 1 || spacePressedRef.current) {
            e.preventDefault()
            panStartRef.current = { x: e.clientX, y: e.clientY, viewX: view.x, viewY: view.y }
            return
          }
          setSelectedBoxId(null)
          setSelectedConnectionId(null)
          setSelectedNoteId(null)
        }}
      >
        {/* Grid pattern */}
        <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${view.x} ${view.y}) scale(${view.scale})`}
            >
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

        </svg>

        {/* Whiteboard label */}
        <div className="absolute left-4 top-4 text-sm font-medium text-zinc-500">Whiteboard</div>

        <div
          className="absolute inset-0 origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        >
          {/* Connection lines */}
          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            style={{ overflow: "visible" }}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" className="text-zinc-500" />
              </marker>
            </defs>
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
            {previewDiff &&
              previewDiff.addConnections.map((conn) => {
                const fromBox =
                  previewDiff.addBoxes.find((b) => b.id === conn.from) ?? boxes.find((b) => b.id === conn.from)
                const toBox = previewDiff.addBoxes.find((b) => b.id === conn.to) ?? boxes.find((b) => b.id === conn.to)
                if (!fromBox || !toBox) return null

                const from = getBoxCenter(fromBox)
                const to = getBoxCenter(toBox)

                return (
                  <g key={conn.id} className="pointer-events-none">
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-blue-400/70"
                      strokeDasharray="6 6"
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                )
              })}
          </svg>

          {/* Boxes */}
          {boxes.map((box) => (
            <Card
              key={box.id}
              className={`absolute cursor-move select-none border-zinc-700 bg-zinc-900 transition-shadow ${
                connectMode ? "cursor-pointer hover:ring-2 hover:ring-primary" : ""
              } ${connectFrom === box.id ? "ring-2 ring-primary" : ""} ${
                selectedBoxId === box.id ? "ring-2 ring-blue-500" : ""
              }`}
              style={{ left: box.x, top: box.y, width: BOX_WIDTH, height: BOX_HEIGHT }}
              onMouseDown={(e) => handleMouseDown(box.id, box.x, box.y, e)}
              onClick={() => handleBoxClick(box.id)}
              data-whiteboard-item="true"
            >
              {editingBoxId === box.id ? (
                <textarea
                  ref={editingInputRef}
                  value={editingBoxValue}
                  onChange={(e) => setEditingBoxValue(e.target.value)}
                  onBlur={commitBoxText}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitBoxText()
                    if (e.key === "Escape") setEditingBoxId(null)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="h-full w-full resize-none bg-transparent p-2 text-center text-sm text-zinc-100 outline-none"
                  placeholder="Type here..."
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center p-2 text-center text-sm text-zinc-100"
                  onDoubleClick={() => startEditingBox(box)}
                >
                  {box.text || <span className="text-zinc-500">Double-click to edit</span>}
                </div>
              )}
            </Card>
          ))}

          {previewDiff && (
            <div className="pointer-events-none">
              {previewDiff.addBoxes.map((box) => (
                <div
                  key={box.id}
                  className="absolute border border-dashed border-blue-400/80 bg-blue-500/10 text-[10px] text-blue-200/90"
                  style={{ left: box.x, top: box.y, width: BOX_WIDTH, height: BOX_HEIGHT }}
                >
                  <div className="flex h-full w-full items-center justify-center p-2 text-center">
                    {box.text}
                  </div>
                </div>
              ))}
              {previewDiff.addNotes.map((note) => (
                <div
                  key={note.id}
                  className="absolute w-[120px] rounded-md border border-dashed border-yellow-400/80 bg-yellow-200/10 p-2 text-[10px] text-yellow-100/90"
                  style={{ left: note.x, top: note.y }}
                >
                  {note.content}
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          {notes.map((note) => (
            <div
              key={note.id}
              className={`absolute w-[120px] cursor-move select-none rounded-md bg-yellow-500/90 p-2 text-xs text-yellow-950 shadow-md ${
                selectedNoteId === note.id ? "ring-2 ring-blue-500" : ""
              }`}
              style={{ left: note.x, top: note.y }}
              onMouseDown={(e) => handleMouseDown(note.id, note.x, note.y, e)}
              onClick={() => {
                setSelectedNoteId(note.id)
                setSelectedBoxId(null)
                setSelectedConnectionId(null)
              }}
              data-whiteboard-item="true"
            >
              {editingNoteId === note.id ? (
                <textarea
                  ref={editingNoteRef}
                  value={editingNoteValue}
                  onChange={(e) => setEditingNoteValue(e.target.value)}
                  onBlur={commitNoteText}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitNoteText()
                    if (e.key === "Escape") setEditingNoteId(null)
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="h-full w-full resize-none bg-transparent text-xs text-yellow-950 outline-none"
                />
              ) : (
                <div onDoubleClick={() => startEditingNote(note)}>
                  {note.content || <span className="text-yellow-900/70">Double-click to edit</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showClearDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg">
            <h3 className="text-base font-semibold text-foreground">Clear canvas?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will remove all boxes, connections, and notes. This action can’t be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowClearDialog(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleClearCanvas}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

Whiteboard.displayName = "Whiteboard"
