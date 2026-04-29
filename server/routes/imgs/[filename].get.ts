import fs from 'node:fs/promises'
import path from 'node:path'
import { createReadStream } from 'node:fs'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const filename = getRouterParam(event, 'filename')

  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid filename' })
  }

  const filePath = path.resolve(config.uploadDir, filename)

  try {
    await fs.access(filePath)
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const stream = createReadStream(filePath)
  stream.on('error', () => {
    if (!event.node.res.writableEnded) {
      stream.destroy()
    }
  })

  event.node.req.on('close', () => {
    if (!stream.destroyed) {
      stream.destroy()
    }
  })

  return sendStream(event, stream)
})
