<script lang="ts" setup>
import type { PostDTO } from '~/types'

const route = useRoute()
const state = reactive({
  page: 1,
  size: 100,
  key: route.query.key,
})

state.page = Number.parseInt(route.query.page as any as string) || 1
const { data } = await useFetch('/api/post/list', {
  method: 'POST',
  body: JSON.stringify(state),
})

watch(() => route.fullPath, async () => {
  state.page = Number.parseInt(route.query.page as any as string) || 1
  state.key = route.query.key as any as string
  const res = await $fetch('/api/post/list', {
    method: 'POST',
    body: JSON.stringify(state),
  })
  data.value = res
})

const postList = computed(() => {
  return data.value?.posts as any as PostDTO[]
})

const totalPosts = computed(() => {
  return data.value?.total || 0
})

const { getAbsoluteUrl } = useAbsoluteUrl()
function getQuery(page: number) {
  return {
    query: { ...route.query, page },
  }
}
useHead({
  title: `首页`,
  link: [
    {
      rel: 'canonical',
      href: getAbsoluteUrl(route.path),
    },
  ],
})
</script>

<template>
  <UCard class="h-full overflow-y-auto mt-0 md:mt-2 w-full min-h-60" :ui="{ rounded: 'rounded-none md:rounded-lg', body: { padding: 'px-0 sm:p-0' }, header: { padding: ' py-2 sm:px-4 px-2' } }">
    <template #header>
      <XTagList />
    </template>
    <div class="flex flex-col divide-y divide-gray-300 dark:divide-slate-700">
      <XPost v-for="post in postList" :key="post.pid" :show-avatar="true" v-bind="post" />
      <div v-if="postList.length === 0" class="p-4 text-sm">
        暂无帖子,注册登录发言吧
      </div>
    </div>
    <UPagination
      v-if="totalPosts > state.size"
      v-model="state.page" size="sm" class="m-2 p-2" :to="getQuery" :page-count="state.size"
      :total="totalPosts"
    />
  </UCard>

  <XScrollToolbar />
</template>

<style></style>
