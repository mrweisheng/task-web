<template>
  <el-container class="layout-container">
    <el-aside width="200px" class="sidebar">
      <!-- 侧边栏内容 -->
    </el-aside>
    
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <!-- 其他头部内容 -->
        </div>
        <div class="header-right">
          <UserInfo />
        </div>
      </el-header>
      
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import UserInfo from '../components/UserInfo.vue'
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  background: var(--bg-color-light);
  border-bottom: 1px solid var(--border-color);
}

.sidebar {
  background: var(--bg-color);
  border-right: 1px solid var(--border-color);
}
</style> 