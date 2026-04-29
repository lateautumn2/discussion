import { S3Client } from '@aws-sdk/client-s3'
import short from 'short-uuid'

import { PrismaClient } from '@prisma/client'
import nodemailer from 'nodemailer'

import { createCache, memoryStore } from 'cache-manager'
import type { SysConfigDTO, recaptchaResponse } from '~/types'

export const prisma = new PrismaClient({ log: ['warn', 'error'] })

let s3ClientInstance: S3Client | null = null
let s3ClientConfigKey = ''

export function getS3Client(config: SysConfigDTO): S3Client {
  const configKey = `${config.s3.endpoint}|${config.s3.region}|${config.s3.ak}`
  if (s3ClientInstance && s3ClientConfigKey === configKey) {
    return s3ClientInstance
  }
  if (s3ClientInstance) {
    s3ClientInstance.destroy()
  }
  s3ClientInstance = new S3Client({
    region: config.s3.region,
    endpoint: config.s3.endpoint,
    credentials: {
      accessKeyId: config.s3.ak,
      secretAccessKey: config.s3.sk,
    },
  })
  s3ClientConfigKey = configKey
  return s3ClientInstance
}

let cachedSysConfig: { data: SysConfigDTO, ts: number } | null = null
const SYS_CONFIG_TTL = 60_000

export async function getSysConfigDTO(): Promise<SysConfigDTO> {
  if (cachedSysConfig && Date.now() - cachedSysConfig.ts < SYS_CONFIG_TTL) {
    return cachedSysConfig.data
  }
  const config = await prisma.sysConfig.findFirst()
  const dto = config?.content as unknown as SysConfigDTO
  cachedSysConfig = { data: dto, ts: Date.now() }
  return dto
}

export function invalidateSysConfigCache() {
  cachedSysConfig = null
}

const config = useRuntimeConfig()

export function randomId() {
  return short.generate().toString()
}

export function getAvatarUrl(hash: string) {
  return `${config.public.avatarCdn}${hash}`
}

export const emailCodeCache = createCache(memoryStore({
  max: 100,
  ttl: 5 * 60 * 1000,
}))

export async function sendMail(to: string, subject: string, html: string) {
  const sysConfigDTO = await getSysConfigDTO()
  const { host, port, username, password, senderName } = sysConfigDTO.email
  if (host === '' || port === 0 || username === '' || password === '' || senderName === '') {
    return '请先配置邮箱'
  }

  return sendMailWithParams({ ...sysConfigDTO.email, to, subject, html }, sysConfigDTO.ForwardUrl)
}

export interface sendMailParams {
  host: string
  username: string
  port: number
  secure: boolean
  password: string
  to: string
  subject: string
  html: string
  senderName: string
}

export async function sendMailWithParams({ host, username, port, secure, password, to, subject, html, senderName }: sendMailParams, url: string) {
  if (host === '' || port === 0 || username === '' || password === '' || senderName === '') {
    return '请先配置邮箱'
  }
  if (url) {
    const res: any = await fetch(url, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ host, username, port, secure, password, to, subject, html, senderName }),
      signal: AbortSignal.timeout(10000),
    })
    const body = await res.json()
    return body.message
  }

  let transporter
  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      pool: true,
      maxConnections: 5,
      auth: {
        user: username,
        pass: password,
      },
      dnsTimeout: 3000,
      socketTimeout: 3000,
      greetingTimeout: 3000,
      connectionTimeout: 3000,
    })

    await transporter.sendMail({
      from: `${senderName} <${username}>`,
      to,
      subject,
      html,
    })
  }
  catch (e: any) {
    console.log(e)
    return `发送邮件失败${'message' in e ? e.message : ''}`
  }
  finally {
    transporter?.close()
  }
  return ''
}

export async function checkGoogleRecaptcha(sk: string, token?: string) {
  if (!token) {
    return {
      success: false,
      message: '请先通过人机验证',
    }
  }
  const url = `https://recaptcha.net/recaptcha/api/siteverify?secret=${sk}&response=${token}`
  const response = (await $fetch(url)) as any as recaptchaResponse
  if (response.success === false) {
    return {
      success: false,
      message: '傻逼,还来??',
    }
  }
  if (response.score <= 0.5) {
    return {
      success: false,
      message: '二货,你是不是人机?',
    }
  }
  return {
    success: true,
    message: '验证通过',
  }
}

export async function sendTgMessage(sysConfigDTO: SysConfigDTO, chatId: string | null, message: string) {
  if (!chatId) {
    return
  }
  if (sysConfigDTO.notify?.tgBotEnabled && sysConfigDTO.notify.tgBotToken) {
    let url = sysConfigDTO.notify.tgProxyUrl ? sysConfigDTO.notify.tgProxyUrl : 'https://api.telegram.org'
    if (url.endsWith('/')) {
      url = url.substring(0, url.length - 1)
    }
    const target = `${url}/bot${sysConfigDTO.notify.tgBotToken}/sendMessage`
    const escapeMessage = message.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&')
    console.log(new Date(), '开始发送tg消息通知，chatId:', chatId, 'message:', escapeMessage, target)
    try {
      const res = await fetch(target, {
        method: 'POST',
        body: JSON.stringify({
          chat_id: chatId,
          text: escapeMessage,
          parse_mode: 'MarkdownV2',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      })
      const resJson = await res.json()
      console.log('tg消息发送结果:', resJson)
    }
    catch (e) {
      console.log('tg消息发送失败:', e)
    }
  }
}
