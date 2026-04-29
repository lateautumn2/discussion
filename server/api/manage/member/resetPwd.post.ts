import { default as bcrypt } from 'bcryptjs'

interface ResetPwdRequest {
  uid: string
}

function generateRandomPassword(length: number = 10): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

export default defineEventHandler(async (event) => {
  const request = (await readBody(event)) as ResetPwdRequest
  if (!request.uid) {
    return {
      success: false,
      message: '用户ID不能为空',
    }
  }

  const target = await prisma.user.findUnique({
    where: { uid: request.uid },
  })

  if (!target) {
    return {
      success: false,
      message: '用户不存在',
    }
  }

  const newPassword = generateRandomPassword()
  const hashedPassword = bcrypt.hashSync(newPassword, 10)

  await prisma.user.update({
    where: { uid: request.uid },
    data: { password: hashedPassword },
  })

  return {
    success: true,
    message: '密码重置成功',
    newPassword,
  }
})
