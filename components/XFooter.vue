<script lang="ts" setup>
withDefaults(defineProps<{
  version: string
}>(), {
  version: '1.0',
})
</script>

<template>
  <div class="footer max-w-[1080px] mx-auto flex gap-2 text-xs my-4 px-2 md:px-0 pb-4 text-gray-400 justify-between md:justify-normal relative">
    <span class="">
      @2024
    </span>
    <span>版本v{{ version }}</span>
    <span class="mx-1">•</span>
    <a target="_blank" href="https://m.mblog.club">极简朋友圈</a>
    <span class="mx-1">•</span>
    <a target="_blank" href="https://dev.mblog.club">极简博客</a>
    <span class="mx-1">•</span>
    <a target="_blank" href="https://discussion.mblog.club">极简论坛</a>
  </div>
</template>

<style></style>
