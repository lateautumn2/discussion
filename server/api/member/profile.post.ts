import { PointReason } from '@prisma/client'

function getTodayMidnight() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

export default defineEventHandler(async (event) => {
  if (!event.context.uid) {
    return {}
  }

  const user = await prisma.user.findUnique({
    where: {
      uid: event.context.uid,
    },
    include: {
      _count: {
        select: {
          fav: true,
        },
      },
    },
  })

  const unRead = await prisma.message.count({
    where: {
      toUid: event.context.uid,
      read: false,
    },
  })

  const signInCount = await prisma.pointHistory.count({
    where: {
      uid: event.context.uid,
      createdAt: {
        gte: getTodayMidnight(),
      },
      reason: PointReason.SIGNIN,
    },
  })

  // @ts-expect-error 删除用户密码
  delete user.password
  return {
    ...user,
    unRead,
    signInToday: signInCount > 0,
  }
})
