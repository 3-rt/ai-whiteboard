import { supabase } from "@/lib/supabase"

export async function uploadDocument(boardId: string, file: File) {
  const docId = crypto.randomUUID()
  const path = `boards/${boardId}/${docId}-${file.name}`

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(path, file, { contentType: file.type })

  if (uploadError) {
    throw uploadError
  }

  const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path)

  const { error: insertError } = await supabase.from("documents").insert({
    id: docId,
    board_id: boardId,
    filename: file.name,
    storage_path: path,
  })

  if (insertError) {
    throw insertError
  }

  return { id: docId, url: urlData.publicUrl }
}
