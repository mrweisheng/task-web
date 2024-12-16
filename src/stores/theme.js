import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    isDark: false
  }),
  
  actions: {
    setTheme(theme) {
      this.isDark = theme === 'dark'
      document.documentElement.classList.toggle('dark', this.isDark)
      localStorage.setItem('theme', theme)
    },
    
    toggleTheme() {
      this.setTheme(this.isDark ? 'light' : 'dark')
    }
  }
}) 