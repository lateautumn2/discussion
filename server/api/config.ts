import fs from 'node:fs/promises'

let cachedVersion: string | null = null

export default defineEventHandler(async (_) => {
  const config = await prisma.sysConfig.findFirst({
    select: {
      content: true,
    },
  })

  if (cachedVersion === null) {
    try {
      cachedVersion = await fs.readFile('/app/version', { encoding: 'utf8' })
    }
    catch {
      cachedVersion = '1.0'
    }
  }

  return {
    success: true,
    data: config?.content,
    version: cachedVersion,
  }
})
