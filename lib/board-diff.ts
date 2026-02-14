import { z } from "zod"

export const boardDiffSchema = z.object({
  addBoxes: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      x: z.number(),
      y: z.number(),
    })
  ),
  addNotes: z.array(
    z.object({
      id: z.string(),
      content: z.string(),
      x: z.number(),
      y: z.number(),
    })
  ),
  addConnections: z.array(
    z.object({
      id: z.string(),
      from: z.string(),
      to: z.string(),
    })
  ),
})

export type BoardDiff = z.infer<typeof boardDiffSchema>
