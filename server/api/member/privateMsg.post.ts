interface ListPostRequest {
  page: number
  size: number
}

export default defineEventHandler(async (event) => {
  const request = (await readBody(event)) as ListPostRequest
  if (!event.context.uid) {
    return {
      success: false,
      message: '请先去登录',
      list: [],
      total: 0,
    }
  }

  const page = Math.max(1, Number(request.page) || 1)
  const size = Math.max(1, Math.min(100, Number(request.size) || 20))
  const offset = (page - 1) * size

  const lastMessagesIds = await prisma.$queryRawUnsafe(`
    WITH all_msg AS (
      SELECT
        "id",
        "content",
        "fromUid",
        "toUid",
        "createdAt",
        CASE
          WHEN "fromUid" = '${event.context.uid}' THEN "toUid"
          ELSE "fromUid"
        END AS partner_uid
      FROM "Message"
      WHERE type = 'PRIVATE_MSG'
        AND ("fromUid" = '${event.context.uid}' OR "toUid" = '${event.context.uid}')
    ),
    latest_per_partner AS (
      SELECT partner_uid, MAX("createdAt") AS latest
      FROM all_msg
      GROUP BY partner_uid
    )
    SELECT m."id"
    FROM all_msg m
    INNER JOIN latest_per_partner l ON m.partner_uid = l.partner_uid AND m."createdAt" = l.latest
    ORDER BY m."createdAt" DESC
    LIMIT ${size} OFFSET ${offset}
  `) as any

  const result = await prisma.message.findMany({
    select: {
      id: true,
      content: true,
      createdAt: true,
      read: true,
      type: true,
      fromUid: true,
      toUid: true,
      from: {
        select: {
          uid: true,
          username: true,
          avatarUrl: true,
          headImg: true,
        },
      },
      to: {
        select: {
          uid: true,
          username: true,
          avatarUrl: true,
          headImg: true,
        },
      },
    },
    where: {
      id: {
        in: lastMessagesIds.map((item: any) => item.id),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },

  })

  const list = result.map((msg: any) => ({
    ...msg,
    partnerUser: msg.fromUid === event.context.uid ? msg.to : msg.from,
  }))

  const totalRecords = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT partner_uid) AS count
    FROM (
      SELECT
        CASE
          WHEN "fromUid" = '${event.context.uid}' THEN "toUid"
          ELSE "fromUid"
        END AS partner_uid
      FROM "Message"
      WHERE type = 'PRIVATE_MSG'
        AND ("fromUid" = '${event.context.uid}' OR "toUid" = '${event.context.uid}')
    ) t
  `) as any

  return {
    success: true,
    list,
    total: Number(totalRecords[0]?.count) || 0,

  }
})
