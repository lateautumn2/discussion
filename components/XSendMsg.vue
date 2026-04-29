<script lang="ts" setup>
import { toast } from 'vue-sonner'
import type { SysConfigDTO } from '~/types'

const props = defineProps<{
  toUsername: string
}>()
const emit = defineEmits(['sendMsgSuccess'])

const state = reactive({
  content: '',
  toUser: props.toUsername,
})
const pending = ref(false)
const global = useGlobalConfig()
const sysconfig = computed(() => global.value?.sysConfig as SysConfigDTO | undefined)

async function sendMsg() {
  pending.value = true
  try {
    if (sysconfig.value?.googleRecaptcha?.enable) {
      if (typeof grecaptcha !== 'undefined') {
        grecaptcha.ready(() => {
          const executePromise = grecaptcha.execute(sysconfig.value!.googleRecaptcha.siteKey, { action: 'sendMsg' }) as Promise<string>
          executePromise.then(async (token) => {
            await doSendMsg(token)
            pending.value = false
          }).catch((err: any) => {
            toast.error('reCAPTCHA 验证失败')
            console.error(err)
            pending.value = false
          })
        })
      }
      else {
        toast.error('reCAPTCHA 脚本未加载')
        pending.value = false
      }
    }
    else {
      await doSendMsg()
      pending.value = false
    }
  }
  catch (err: any) {
    toast.error('发送失败，请重试')
    console.error(err)
    pending.value = false
  }
}

async function doSendMsg(token?: string) {
  try {
    const { success, message } = await $fetch('/api/member/sendMsg', {
      method: 'POST',
      body: {
        content: state.content,
        toUser: state.toUser,
        token,
      },
    })
    if (success) {
      toast.success(message)
      state.content = ''
      emit('sendMsgSuccess')
    }
    else {
      toast.error(message)
    }
  }
  catch (err: any) {
    toast.error(err?.data?.message || err?.message || '发送失败')
    console.error(err)
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <UTextarea v-model="state.content" color="white" variant="outline" :rows="5" autoresize padded :placeholder="`发送私信给${props.toUsername}`" />
    <UButtonGroup size="sm">
      <UButton color="primary" class="w-fit" @click="sendMsg">
        发送私信
      </UButton>
    </UButtonGroup>
  </div>
</template>

<style scoped>

</style>
