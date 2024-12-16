<script setup>
import { onMounted } from 'vue'
import { useThemeStore } from './stores/theme'
import { useUserStore } from './stores/user'
import { useRouter } from 'vue-router'

const themeStore = useThemeStore()
const userStore = useUserStore()
const router = useRouter()

onMounted(async () => {
  // 初始化主题
  const isDark = localStorage.getItem('theme') === 'dark'
  themeStore.setTheme(isDark ? 'dark' : 'light')

  // 如果有token，尝试获取用户信息
  if (localStorage.getItem('token')) {
    try {
      await userStore.fetchUserProfile()
    } catch (error) {
      if (error.response?.status === 401) {
        router.push('/login')
      }
    }
  }
})
</script>

<template>
  <router-view />
</template>

<style lang="scss">
@use './styles/global.scss' as *;

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
}
</style>
