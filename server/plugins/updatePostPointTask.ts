import dayjs from 'dayjs'
import { useScheduler } from '#scheduler'

let isUpdatingPosts = false

export default defineNitroPlugin((nitroApp) => {
  if (process.env.APP_ENV === 'build') {
    console.log(
      '[server/plugins/updatePostPointTask.ts] Skipping scheduler, in build context',
    )
    return
  }
  const scheduler = useScheduler()

  const updateUserLevel = async (min: number, max: number, level: number) => {
    return await prisma.user.updateMany({
      where: {
        point: {
          gte: min,
          lt: max,
        },
      },
      data: {
        level,
      },
    })
  }

  scheduler.run(async () => {
    const levels = [
      [0, 200],
      [200, 400],
      [400, 900],
      [900, 1600],
      [1600, 2500],
      [2500, 3600],
    ]
    for (let level = 1; level <= levels.length; level++) {
      await updateUserLevel(levels[level - 1][0], levels[level - 1][1], level + 1)
    }
  }).everyHours(1)

  scheduler
    .run(async () => {
      if (isUpdatingPosts) {
        console.log('[updatePostPointTask] 上一轮帖子积分更新尚未完成，跳过本次执行')
        return
      }
      isUpdatingPosts = true
      try {
        const twoMonthsAgo = dayjs().subtract(2, 'month').toDate()

        await prisma.$executeRaw`
          UPDATE "Post"
          SET point = (
            (("Post_author"."point" * 2 + "Post_author"."PostSupportCount" * 2 + "Post_author"."CommentCount" - 1)
              / POWER(EXTRACT(EPOCH FROM (NOW() - "Post"."createdAt"))::float + 600, 1.1))
            * 10000000
          )
          FROM (
            SELECT "Post"."pid",
              "Author"."point" as "point",
              (SELECT COUNT(*) FROM "Comment" WHERE "Comment"."pid" = "Post"."pid" AND "Comment"."uid" != "Post"."uid")::int as "CommentCount",
              (SELECT COUNT(*) FROM "PostSupport" WHERE "PostSupport"."pid" = "Post"."pid")::int as "PostSupportCount"
            FROM "Post"
            INNER JOIN "User" AS "Author" ON "Post"."uid" = "Author"."uid"
            WHERE "Post"."createdAt" >= ${twoMonthsAgo}
          ) AS "Post_author"
          WHERE "Post"."pid" = "Post_author"."pid"
        `
      }
      catch (e) {
        console.error('[updatePostPointTask] 帖子积分更新失败:', e)
      }
      finally {
        isUpdatingPosts = false
      }
    })
    .everyMinutes(3)

  nitroApp.hooks.hook('close', async () => {
    console.log('[updatePostPointTask] Nitro closing, cleaning up...')
    await prisma.$disconnect()
  })
})
