import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import request from '../utils/request'

export const useUserStore = defineStore('user', () => {
  const token = ref(sessionStorage.getItem('token') || '')
  const userInfo = ref({
    username: '未知用户',
    nickname: '未知用户'
  })

  const userNickname = computed(() => userInfo.value.nickname)

  const setUser = (data) => {
    if (data.token) {
      token.value = data.token
      sessionStorage.setItem('token', data.token)
    }
    if (data.user) {
      userInfo.value = data.user
    }
  }

  const fetchUserProfile = async () => {
    try {
      const data = await request.get('/api/user/profile')
      if (data.username) {
        userInfo.value = data
      }
      return data
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  }

  const logout = () => {
    token.value = ''
    userInfo.value = {
      username: '未知用户',
      nickname: '未知用户'
    }
    sessionStorage.removeItem('token')
  }

  return {
    token,
    userInfo,
    userNickname,
    setUser,
    fetchUserProfile,
    logout
  }
}) 