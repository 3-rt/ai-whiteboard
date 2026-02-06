"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { deleteDocument, uploadDocument } from "@/lib/documents"
import { supabase } from "@/lib/supabase"
import { FileText, MessageSquare, ClipboardCheck, X } from "lucide-react"

interface DocumentMeta {
  id: string
  filename: string
  storage_path: string
}

interface DocumentsPanelProps {
  onOpenAssistant: () => void
  onOpenUpload: () => void
}

export function DocumentsPanel({ onOpenAssistant, onOpenUpload }: DocumentsPanelProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [documents, setDocuments] = useState<DocumentMeta[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)
    setUploadedFileName(null)
    setIsUploading(true)

    try {
      const boardId = localStorage.getItem("whiteboard-id")
      if (!boardId) {
        throw new Error("Missing board id")
      }
      await uploadDocument(boardId, file)
      setUploadedFileName(file.name)
      await loadDocuments()
    } catch (error) {
      console.error("Upload failed", error)
      setUploadError("Upload failed. Please try again.")
    } finally {
      setIsUploading(false)
      if (input) {
        input.value = ""
      }
    }
  }

  const handleDelete = async (doc: DocumentMeta) => {
    setDeletingId(doc.id)
    setUploadError(null)
    try {
      await deleteDocument({ id: doc.id, storage_path: doc.storage_path })
      await loadDocuments()
    } catch (error) {
      console.error("Delete failed", error)
      setUploadError("Delete failed. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex w-[400px] flex-col bg-card">
      <div className="border-b border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Documents</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload supporting files so the assistant can reference them later.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={onOpenAssistant} className="text-foreground hover:bg-muted">
              <MessageSquare className="h-4 w-4" />
              Open AI Assistant
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onOpenUpload}
              disabled
              className="text-foreground hover:bg-muted"
            >
              <ClipboardCheck className="h-4 w-4" />
              Go to Upload
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">Upload a document</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p className="mb-3 text-xs">Add requirements, specs, or notes to improve the AI context.</p>
            <div className="flex items-center gap-2">
              <Input type="file" onChange={handleFileChange} className="bg-muted text-foreground" />
              <Button type="button" size="sm" variant="outline" disabled={isUploading}>
                {isUploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
            {uploadedFileName && <p className="mt-2 text-xs text-emerald-400">Uploaded: {uploadedFileName}</p>}
            {uploadError && <p className="mt-2 text-xs text-red-400">{uploadError}</p>}
          </CardContent>
        </Card>

        <Card className="mt-4 border-border bg-card">
          <CardHeader>
            <CardTitle className="text-sm text-foreground">Uploaded files</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-2 text-xs text-muted-foreground">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{doc.filename}</span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="h-5 w-5 text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${doc.filename}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
