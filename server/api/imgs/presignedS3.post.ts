import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import dayjs from 'dayjs'
import short from 'short-uuid'

export default defineEventHandler(async (event) => {
  const { fileType } = (await readBody(event)) as { fileType: string }
  const sysConfigDTO = await getSysConfigDTO()

  if (sysConfigDTO.upload.imgStrategy !== 's3' && sysConfigDTO.upload.attachmentStrategy !== 's3') {
    return {
      success: false,
      message: '未开启S3上传',
      preSignedUrl: '',
      imgUrl: '',
    }
  }

  const client = getS3Client(sysConfigDTO)

  const key = `discussion/${dayjs(new Date()).format('YYYY/MM/DD/')}${short.generate()}`
  const command = new PutObjectCommand({
    Bucket: sysConfigDTO.s3.bucket,
    Key: key,
    ContentType: fileType,
  })
  const url = await getSignedUrl(client, command, { expiresIn: 600 })
  const imgUrl = `${sysConfigDTO.s3.domain}/${key}`
  return {
    success: true,
    message: '',
    preSignedUrl: url,
    imgUrl,
  }
})
