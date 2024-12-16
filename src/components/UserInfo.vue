<template>
  <div class="user-info">
    <el-dropdown>
      <span class="user-dropdown-link">
        <el-avatar :size="32" class="user-avatar">
          {{ userStore.userInfo.nickname?.charAt(0)?.toUpperCase() }}
        </el-avatar>
        <span class="username">{{ userStore.userInfo.nickname }}</span>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click="handleLogout">
            <el-icon><SwitchButton /></el-icon>
            退出登录
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { useUserStore } from '../stores/user'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { SwitchButton } from '@element-plus/icons-vue'

const userStore = useUserStore()
const router = useRouter()

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
.user-info {
  display: flex;
  align-items: center;
}

.user-dropdown-link {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-dropdown-link:hover {
  background-color: var(--bg-color-dark);
}

.user-avatar {
  background: var(--primary-color);
  color: #fff;
  font-weight: bold;
}

.username {
  margin-left: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style> 