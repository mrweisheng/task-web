import { defineStore } from 'pinia'
import request from '../utils/request'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    userInfo: {},
    messagePoints: null, // 添加消息积分配置
  }),

  getters: {
    // 添加获取用户余额的 getter
    userBalance: (state) => state.userInfo?.balance || 0,
    
    // 添加获取指定消息类型所需积分的方法
    getMessageTypePoints: (state) => (messageType) => {
      return state.messagePoints?.[messageType]?.points || 0
    }
  },

  actions: {
    // 设置用户信息
    setUser(payload) {
      this.user = payload.user
      if (payload.token) {
        sessionStorage.setItem('token', payload.token)
      }
    },

    // 添加 logout 方法
    logout() {
      this.user = null
      this.userInfo = {}
      this.messagePoints = null
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('tokenExpires')
    },

    // 获取消息积分配置
    async fetchMessagePoints() {
      try {
        const response = await request.get('/taskapi/user/message-points')
        if (response?.data) {
          this.messagePoints = response.data.reduce((acc, curr) => {
            acc[curr.message_type] = {
              points: curr.points,
              description: curr.description
            }
            return acc
          }, {})
        }
        return this.messagePoints
      } catch (error) {
        console.error('获取消息积分配置失败:', error)
        throw error
      }
    },

    // 修改获取用户信息的方法，确保返回余额信息
    async fetchUserProfile() {
      try {
        const response = await request.get('/taskapi/user/profile')
        if (response) {
          this.userInfo = response
          return response
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        throw error
      }
    }
  }
})
