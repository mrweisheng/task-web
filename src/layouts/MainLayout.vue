<template>
  <div class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <div class="logo-container">
        <img src="../assets/logo.png" alt="Logo" class="logo">
        <h3 v-if="!isCollapse">任务管理平台</h3>
      </div>
      
      <el-menu
        :default-active="route.path"
        class="sidebar-menu"
        router
        :collapse="isCollapse"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <template #title>我的面板</template>
        </el-menu-item>
        
        <el-menu-item index="/tasks">
          <el-icon><List /></el-icon>
          <template #title>我的任务</template>
        </el-menu-item>
        
        <el-menu-item index="/create-task">
          <el-icon><Plus /></el-icon>
          <template #title>创建任务</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon 
            class="fold-btn"
            @click="toggleCollapse"
          >
            <Fold v-if="!isCollapse"/>
            <Expand v-else/>
          </el-icon>
        </div>
        
        <div class="header-right">
          <!-- 主题切换按钮 -->
          <el-button
            class="theme-button"
            :icon="isDark ? Sunny : Moon"
            circle
            @click="toggleTheme"
          />

          <el-dropdown trigger="click">
            <div class="user-info">
              <el-avatar :size="32" :icon="User"/>
              <span class="nickname">{{ userStore.userInfo.nickname || '未知用户' }}</span>
              <el-icon class="el-icon--right"><CaretBottom /></el-icon>
            </div>
            
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>
                  <el-icon><User /></el-icon>
                  当前用户：{{ userStore.userInfo.nickname || '未知用户' }}
                </el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容区 -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { 
  User, 
  List, 
  Plus, 
  SwitchButton,
  Fold,
  Expand,
  CaretBottom,
  Moon,
  Sunny,
  DataBoard
} from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import UserInfo from '../components/UserInfo.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const isCollapse = ref(false)
const isDark = ref(false)

// 获取用户信息
const fetchUserInfo = async () => {
  try {
    await userStore.fetchUserProfile()
  } catch (error) {
    if (error.response?.status === 401) {
      userStore.logout()
      router.push('/login')
    }
  }
}

onMounted(() => {
  if (userStore.isLoggedIn) {
    fetchUserInfo()
  }
})

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  // 这里可以添加切换主题的具体实现
  document.documentElement.classList.toggle('dark')
}

const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    userStore.logout()
    router.push('/login')
  })
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
}

.sidebar {
  background-color: var(--bg-color-light);
  border-right: 1px solid var(--border-color);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.logo-container {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  border-bottom: 1px solid #f0f0f0;
  overflow: hidden;
}

.logo {
  width: 32px;
  height: 32px;
  margin-right: 12px;
  object-fit: contain;
  flex-shrink: 0;
}

.logo-container h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
  white-space: nowrap;
}

.header {
  background-color: var(--bg-color-light);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  backdrop-filter: blur(10px);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.theme-button {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color-dark);
  border: 1px solid var(--border-color);
  color: var(--text-regular);
  
  &:hover {
    background-color: var(--primary-light);
    color: var(--primary-color);
    border-color: var(--primary-color);
  }
}

.fold-btn {
  font-size: 20px;
  cursor: pointer;
  color: #666;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: var(--bg-color-dark);
  }
}

.nickname {
  font-size: 14px;
  color: var(--text-regular);
  font-weight: 500;
  min-width: 60px;
}

.main-content {
  background-color: var(--bg-color-dark);
  padding: 20px;
  transition: all 0.3s ease;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

:deep(.el-menu) {
  background-color: transparent !important;
  border: none;
}

:deep(.el-menu-item) {
  height: 50px;
  line-height: 50px;
  color: var(--text-regular);
  margin: 4px 0;
  border-radius: 6px;
  
  &:hover {
    color: var(--primary-color);
    background-color: var(--bg-color-dark);
  }
  
  &.is-active {
    color: var(--primary-color);
    background-color: var(--primary-light);
    
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 16px;
      background-color: var(--primary-color);
      border-radius: 0 4px 4px 0;
    }
  }
}

:deep(.el-dropdown-menu) {
  background-color: var(--bg-color-light);
  border: 1px solid var(--border-color);
  box-shadow: var(--box-shadow);
  
  .el-dropdown-menu__item {
    color: var(--text-regular);
    
    &:hover {
      background-color: var(--bg-color-dark);
      color: var(--primary-color);
    }
    
    .el-icon {
      margin-right: 8px;
      color: var(--text-secondary);
    }
  }
}

:deep(.el-avatar) {
  background-color: var(--primary-light);
  color: var(--primary-color);
}
</style> 