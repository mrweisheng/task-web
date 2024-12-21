<template>
  <div class="dashboard-container">
    <!-- 添加骨架屏 -->
    <el-skeleton :loading="loading" animated>
      <template #template>
        <div class="stat-cards">
          <el-skeleton-item variant="card" style="width: 100%; height: 120px" />
          <el-skeleton-item variant="card" style="width: 100%; height: 120px" />
          <el-skeleton-item variant="card" style="width: 100%; height: 120px" />
        </div>
      </template>
      
      <!-- 原有内容 -->
      <template #default>
        <!-- 统计卡片区域 -->
        <div class="stat-cards">
          <el-card v-for="type in statTypes" 
            :key="type.key"
            class="stat-card"
            :class="[type.key]"
            v-loading="loading"
            @mousemove="handleMouseMove($event, $event.target)"
          >
            <template #header>
              <div class="card-header">
                <span>{{ type.label }}</span>
                <el-icon><component :is="type.icon" /></el-icon>
              </div>
            </template>
            
            <div class="stat-value">
              {{ stats[type.key] }}
            </div>
            <div class="stat-label">个任务</div>
          </el-card>
        </div>

        <!-- 用户信息卡片 -->
        <el-card class="user-profile" 
          :class="{ 'is-error': !userStore.user }"
          v-loading="loading"
        >
          <div class="profile-header">
            <div class="avatar-wrapper">
              <el-avatar :size="64" :icon="User" class="user-avatar" />
              <div class="online-status" />
            </div>
            <div class="user-info">
              <h3 class="nickname">{{ userStore.userInfo.nickname || '未知用户' }}</h3>
              <p class="username">@{{ userStore.userInfo.username || '--' }}</p>
            </div>
          </div>
          
          <div class="profile-stats">
            <div class="completion-chart">
              <!-- 左侧环形图表 -->
              <div class="chart-container">
                <el-progress
                  type="circle"
                  :percentage="calculateCompletionRate"
                  :stroke-width="10"
                  :width="80"
                  :show-text="false"
                  :color="progressColor"
                />
                <div class="chart-center">
                  <span class="rate-value">{{ calculateCompletionRate }}%</span>
                </div>
              </div>
              
              <!-- 右侧说明 -->
              <div class="chart-info">
                <div class="info-header">
                  <span class="info-title">完成率</span>
                  <el-tooltip content="已完成任务占总任务的百分比" placement="top">
                    <el-icon><InfoFilled /></el-icon>
                  </el-tooltip>
                </div>
                <div class="info-details">
                  <div class="detail-item">
                    <div class="item-dot completed"></div>
                    <span class="item-label">已完成</span>
                    <span class="item-value">{{ stats.completedTasks }}</span>
                  </div>
                  <div class="detail-item">
                    <div class="item-dot total"></div>
                    <span class="item-label">总任务</span>
                    <span class="item-value">{{ stats.totalTasks }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="quick-actions">
            <el-button type="primary" @click="router.push('/create-task')">
              <el-icon><Plus /></el-icon>
              创建新任务
            </el-button>
            <el-button @click="router.push('/tasks')">
              <el-icon><List /></el-icon>
              查看所有任务
            </el-button>
          </div>
        </el-card>

        <!-- 最新任务卡片 -->
        <el-card class="recent-task-card" v-loading="loading">
          <template #header>
            <div class="card-header">
              <div class="header-left">
                <span class="title">最新任务</span>
                <el-tag size="small" type="info" effect="plain">
                  {{ formatDate(latestTask?.createTime) }}
                </el-tag>
              </div>
              <el-button link @click="router.push('/tasks')">
                查看全部
                <el-icon class="el-icon--right"><ArrowRight /></el-icon>
              </el-button>
            </div>
          </template>

          <el-empty v-if="!latestTask" description="暂无任务" />
          
          <div v-else class="task-item">
            <div class="task-circles">
              <!-- 状态圆圈 -->
              <div class="circle-item status">
                <el-tag 
                  :type="getStatusType(latestTask.status)" 
                  class="status-tag"
                  :effect="latestTask.status === '已完成' ? 'dark' : 'light'"
                >
                  <el-icon class="status-icon">
                    <Check v-if="latestTask.status === '已完成'" />
                    <Loading v-else-if="latestTask.status === '处理中'" />
                    <Warning v-else />
                  </el-icon>
                </el-tag>
                <span class="circle-label">{{ getStatusText(latestTask.status) }}</span>
              </div>

              <!-- 媒体类型圆圈 -->
              <div class="circle-item media">
                <div class="circle-icon">
                  <el-icon>
                    <VideoCamera v-if="latestTask.media_type === 'video'" />
                    <Picture v-else-if="latestTask.media_type === 'image'" />
                    <Document v-else />
                  </el-icon>
                </div>
                <span class="circle-label">{{ getMediaTypeText(latestTask.media_type) }}</span>
              </div>

              <!-- 号码数量圆圈 -->
              <div class="circle-item numbers">
                <div class="circle-value">{{ latestTask.phoneNumbers?.length || 0 }}</div>
                <span class="circle-label">个号码</span>
              </div>
            </div>

            <!-- 消息内容方块 -->
            <div class="message-box">
              <div class="message-content">
                <p class="message-text">{{ latestTask.message }}</p>
                <span class="message-time">{{ formatDate(latestTask.createTime) }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </template>
    </el-skeleton>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, h, markRaw, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { 
  DataLine, Calendar, Check, User, Timer, 
  TrendCharts, Plus, List, ArrowRight, Phone,
  Picture, VideoCamera, Loading, Document, Clock, VideoPlay, InfoFilled
} from '@element-plus/icons-vue'
import { ElMessage, ElImageViewer, ElMessageBox } from 'element-plus'
import request from '../utils/request'
import CountTo from 'vue3-count-to'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
let refreshTimer = null

// 初始化数据
const latestTask = ref(null)
const stats = ref({
  totalTasks: 0,
  todayTasks: 0,
  completedTasks: 0
})

// 添加监听器以调试
watch(stats, (newVal) => {
  console.log('统计数据变化:', newVal)
}, { deep: true })

// 统计卡片配置
const statTypes = [
  { key: 'totalTasks', label: '总任务数', icon: markRaw(DataLine) },
  { key: 'todayTasks', label: '今日任务', icon: markRaw(Calendar) },
  { key: 'completedTasks', label: '已完成任务', icon: markRaw(Check) }
]

// 添加加载图标配置
const loadingSpinner = markRaw(Loading)

// 使用 markRaw 优化图标组件
const icons = {
  dataLine: markRaw(DataLine),
  calendar: markRaw(Calendar),
  check: markRaw(Check),
  // ... 其他图标
}

// 获取最新任务
const fetchLatestTask = async () => {
  try {
    console.log('开始获取最新任务')
    const response = await request.get('/api/tasks/latest')
    console.log('最新任务响应:', response)
    
    if (response) {
      latestTask.value = {
        id: response.id,
        message: response.content,
        phoneNumbers: response.numbers,
        status: response.status,
        createTime: response.created_at,
        media_type: response.media_type,
        media_urls: response.media_urls
      }
    }
  } catch (error) {
    console.error('获取最新任务失败:', error)
    if (error.response?.status === 401) {
      router.push('/login')
    } else if (error.response?.status !== 404) {
      ElMessage.error('获取最新任务失败')
    }
    latestTask.value = null
  }
}

// 获取统计数据
const fetchStats = async () => {
  try {
    const response = await request.get('/api/stats')
    console.log('统计数据响应:', response)  // 用于调试
    
    if (response) {
      // 确保数据正确赋值
      stats.value = {
        totalTasks: response.totalTasks || 0,
        todayTasks: response.todayTasks || 0,
        completedTasks: response.completedTasks || 0
      }
      console.log('更新后的统计数据:', stats.value)  // 用于调试
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    // 出错时重置为默认值
    stats.value = {
      totalTasks: 0,
      todayTasks: 0,
      completedTasks: 0
    }
  }
}

// 计算完成率
const calculateCompletionRate = computed(() => {
  if (!stats.value.totalTasks) return 0
  return Math.round((stats.value.completedTasks / stats.value.totalTasks) * 100)
})

// 状态样式
const getStatusType = (status) => {
  const types = {
    '待处理': 'warning',
    '已完成': 'success',
    '失败': 'danger'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  return status || '未知'
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 添加获取用户信息的逻辑
const fetchUserProfile = async () => {
  try {
    await userStore.fetchUserProfile()
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

// 添加错误状态
const hasError = ref(false)

// 初始化数据
const initData = async () => {
  loading.value = true
  
  try {
    // 开调用以便于调试
    console.log('开始初始化数据')
    await fetchStats()
    await fetchLatestTask()
    await userStore.fetchUserProfile()
    console.log('数据初始化完成')
  } catch (error) {
    console.error('数据初始化失败:', error)
  } finally {
    loading.value = false
  }
}

// 组件挂载时立即获取数据
onMounted(() => {
  console.log('Dashboard 组件挂载')
  initData()
  
  // 设置定时刷新
  refreshTimer = setInterval(() => {
    console.log('执行定时刷新')
    initData()
  }, 5 * 60 * 1000)
})

// 组件卸载时清理
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})

// 添加鼠标跟踪效果
const handleMouseMove = (event, card) => {
  const rect = card.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * 100
  const y = ((event.clientY - rect.top) / rect.height) * 100
  card.style.setProperty('--x', `${x}%`)
  card.style.setProperty('--y', `${y}%`)
}

// 添加媒体类型转换函数
const getMediaTypeText = (type) => {
  const types = {
    'image': '图片',
    'video': '视频',
    'text': '纯文本'
  }
  return types[type] || '未知类型'
}

// 添加进度条颜色计算
const progressColor = computed(() => {
  const rate = calculateCompletionRate.value
  if (rate >= 80) return '#67C23A'
  if (rate >= 50) return '#409EFF'
  if (rate >= 20) return '#E6A23C'
  return '#F56C6C'
})
</script>

<style scoped>
.dashboard-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  padding: 24px;
  animation: fade-in 0.5s ease;
}

.stat-cards {
  grid-column: span 3;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.stat-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: slide-up 0.5s ease;
  animation-fill-mode: both;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  border: none;
  
  /* 为每个卡片设置不同的渐变背景 */
  &.totalTasks {
    background: linear-gradient(135deg, #409EFF 0%, #85c1ff 100%);
  }
  
  &.todayTasks {
    background: linear-gradient(135deg, #67C23A 0%, #95d475 100%);
  }
  
  &.completedTasks {
    background: linear-gradient(135deg, #E6A23C 0%, #f3d19e 100%);
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }
  
  .stat-value {
    font-size: 42px;
    font-weight: 600;
    color: white;
    margin: 20px 0;
    text-align: center;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .stat-label {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.9);
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    
    span {
      font-weight: 500;
      color: rgba(255, 255, 255, 0.95);
      font-size: 16px;
    }
    
    .el-icon {
      font-size: 24px;
      color: rgba(255, 255, 255, 0.95);
      transition: all 0.3s ease;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
      
      &:hover {
        transform: scale(1.1) rotate(15deg);
        filter: brightness(1.2) drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
      }
    }
  }

  /* 为每个卡片设置不同的图标颜色 */
  &.totalTasks {
    .card-header .el-icon {
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
  
  &.todayTasks {
    .card-header .el-icon {
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
  
  &.completedTasks {
    .card-header .el-icon {
      color: #ffffff;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }

  /* 为每个卡片添加不同的强调色 */
  &.totalTasks {
    border-left: 4px solid var(--el-color-primary);
    .stat-value {
      background: linear-gradient(120deg, var(--el-color-primary), #409EFF);
    }
  }
  
  &.todayTasks {
    border-left: 4px solid var(--el-color-success);
    .stat-value {
      background: linear-gradient(120deg, var(--el-color-success), #67C23A);
    }
  }
  
  &.completedTasks {
    border-left: 4px solid var(--el-color-warning);
    .stat-value {
      background: linear-gradient(120deg, var(--el-color-warning), #E6A23C);
    }
  }
}

/* 优化动画效果 */
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 添加响应式光效 */
.stat-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
    circle at var(--x, 50%) var(--y, 50%),
    rgba(255, 255, 255, 0.1) 0%,
    transparent 80%
  );
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  border-radius: inherit;
}

.stat-card:hover::after {
  opacity: 1;
}

/* 暗色模式优化 */
.dark {
  .stat-card {
    background: linear-gradient(145deg, rgba(30, 30, 30, 0.8), rgba(40, 40, 40, 0.8));
    border-color: rgba(255, 255, 255, 0.05);
    
    &:hover {
      border-color: var(--el-color-primary-dark-2);
      background: linear-gradient(145deg, rgba(35, 35, 35, 0.9), rgba(45, 45, 45, 0.9));
    }
    
    .stat-value {
      opacity: 0.9;
    }
  }
}

.user-profile {
  grid-column: span 1;
  
  .profile-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 24px;
  }
  
  .avatar-wrapper {
    position: relative;
    
    .online-status {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: var(--success-color);
      border: 2px solid var(--bg-color-light);
    }
  }
  
  .user-avatar {
    background-color: var(--primary-light);
    color: var(--primary-color);
  }
  
  .user-info {
    flex: 1;
    
    .nickname {
      margin: 0;
      font-size: 20px;
      color: var(--text-primary);
    }
    
    .username {
      margin: 4px 0 0;
      font-size: 14px;
      color: var(--text-secondary);
    }
  }
  
  .profile-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin: 24px 0;
    
    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background-color: var(--bg-color-dark);
      border-radius: 8px;
      
      .el-icon {
        font-size: 24px;
        color: var(--primary-color);
      }
      
      .stat-content {
        display: flex;
        flex-direction: column;
        gap: 4px;
        
        .stat-label {
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        .stat-value {
          font-size: 16px;
          font-weight: 500;
          color: var(--text-primary);
        }
      }
    }
  }
  
  .quick-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    
    .el-button {
      justify-content: flex-start;
      padding: 12px 16px;
      
      .el-icon {
        margin-right: 8px;
      }
    }
  }
}

.recent-task-card {
  grid-column: span 2;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
      
      .title {
        font-weight: 600;
        font-size: 16px;
      }
    }
  }
  
  .task-item {
    display: flex;
    gap: 20px;
    padding: 20px;
  }
  
  /* 圆圈布局 */
  .task-circles {
    display: flex;
    flex-direction: column;
    gap: 16px;
    
    .circle-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      
      .circle-icon,
      .circle-value,
      .status-tag {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        
        .el-icon {
          font-size: 20px;
        }
      }
      
      .circle-label {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
      
      &.status .status-tag {
        padding: 0;
        border: none;
      }
      
      &.media .circle-icon {
        background: var(--el-color-primary-light-9);
        color: var(--el-color-primary);
      }
      
      &.numbers .circle-value {
        background: var(--el-color-success-light-9);
        color: var(--el-color-success);
        font-size: 18px;
        font-weight: 600;
      }
    }
  }
  
  /* 消息方块 */
  .message-box {
    flex: 1;
    background: var(--el-bg-color-overlay);
    border-radius: 8px;
    border: 1px solid var(--el-border-color-lighter);
    
    .message-content {
      height: 100%;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      
      .message-text {
        font-size: 14px;
        line-height: 1.6;
        color: var(--el-text-color-primary);
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
      }
      
      .message-time {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin-top: 8px;
      }
    }
  }
}

/* 暗色模式适配 */
.dark {
  .task-item {
    background: var(--el-bg-color);
    
    &:hover {
      background: var(--el-bg-color-darker);
    }
    
    .task-message {
      background: var(--el-bg-color-darker);
    }
    
    .task-meta .meta-item {
      background: var(--el-bg-color);
      
      &.has-media {
        background: var(--el-color-primary-dark-9);
      }
      
      &.numbers {
        background: var(--el-color-success-dark-9);
      }
    }
  }
}

/* 添加更多动画效果 */
/* 1. 卡片光晕效果 */
.stat-card {
  &::after {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      45deg,
      transparent 45%,
      rgba(255, 255, 255, 0.1) 48%,
      rgba(255, 255, 255, 0.2) 50%,
      rgba(255, 255, 255, 0.1) 52%,
      transparent 55%
    );
    transform: rotate(45deg);
    animation: shine 6s infinite;
  }
}

@keyframes shine {
  0% {
    transform: translateX(-200%) translateY(-200%) rotate(45deg);
  }
  100% {
    transform: translateX(200%) translateY(200%) rotate(45deg);
  }
}

/* 2. 用户头像呼吸灯效 */
.online-status {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.4);
  }
  70% {
    box-shadow: 0 0 0 6px rgba(103, 194, 58, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0);
  }
}

/* 3. 快捷操作按钮动 */
.quick-actions .el-button {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    
    .el-icon {
      animation: bounce 0.5s ease;
    }
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/* 4. 任务项波纹效果 */
.task-item {
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    background: radial-gradient(circle, var(--primary-color) 0%, transparent 100%);
    transition: all 0.5s ease;
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
  }
  
  &:active::after {
    width: 300%;
    height: 300%;
    top: -150%;
    left: -150%;
    opacity: 0.1;
  }
}

/* 5. 标签动画效果 */
.el-tag {
  animation: tag-in 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }
}

@keyframes tag-in {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* 6. 数字滚动的强调动画 */
.stat-value {
  &.changed {
    animation: number-change 0.5s ease;
  }
}

@keyframes number-change {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
    color: var(--primary-color);
  }
  100% {
    transform: scale(1);
  }
}

/* 7. 加载状态过 */
.el-loading-mask {
  backdrop-filter: blur(4px);
  animation: loading-in 0.3s ease;
}

@keyframes loading-in {
  from {
    backdrop-filter: blur(0);
    background-color: rgba(0, 0, 0, 0);
  }
  to {
    backdrop-filter: blur(4px);
    background-color: rgba(0, 0, 0, 0.3);
  }
}

/* 8. 图标旋转动画 */
.el-icon {
  transition: transform 0.3s ease;
  
  &:hover {
    transform: rotate(15deg);
  }
}

/* 9. 暗式切换动 */
.dark {
  .stat-card,
  .user-profile,
  .recent-tasks,
  .el-button,
  .el-tag {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .stat-card::after {
    background: linear-gradient(
      45deg,
      transparent 45%,
      rgba(255, 255, 255, 0.05) 48%,
      rgba(255, 255, 255, 0.1) 50%,
      rgba(255, 255, 255, 0.05) 52%,
      transparent 55%
    );
  }
}

/* 10. 页切换动画 */
.dashboard-container {
  animation: slide-in 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slide-in {
  from {
    transform: translateY(20px) scale(0.98);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

/* 添加错误状态式 */
.stat-card.is-error,
.user-profile.is-error {
  border-color: var(--el-color-danger);
  
  &::after {
    background: linear-gradient(
      45deg,
      transparent 45%,
      rgba(245, 108, 108, 0.1) 48%,
      rgba(245, 108, 108, 0.2) 50%,
      rgba(245, 108, 108, 0.1) 52%,
      transparent 55%
    );
  }
}

/* 优化加载状态过渡 */
.el-loading-mask {
  backdrop-filter: blur(4px);
  transition: all 0.3s ease;
}

/* 优化空状态显示 */
.el-empty {
  padding: 40px 0;
  
  .el-empty__description {
    margin-top: 20px;
    color: var(--el-text-color-secondary);
  }
}

.completion-chart {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px;
  background: var(--el-bg-color-overlay);
  border-radius: 8px;
  
  .chart-container {
    position: relative;
    width: 80px;
    height: 80px;
    
    .chart-center {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .rate-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--el-color-primary);
      }
    }
  }
  
  .chart-info {
    flex: 1;
    
    .info-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      
      .info-title {
        font-size: 16px;
        font-weight: 500;
        color: var(--el-text-color-primary);
      }
      
      .el-icon {
        font-size: 14px;
        color: var(--el-text-color-secondary);
        cursor: help;
      }
    }
    
    .info-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      
      .detail-item {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .item-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          
          &.completed {
            background-color: var(--el-color-success);
          }
          
          &.total {
            background-color: var(--el-color-info);
          }
        }
        
        .item-label {
          font-size: 13px;
          color: var(--el-text-color-secondary);
          min-width: 48px;
        }
        
        .item-value {
          font-size: 13px;
          font-weight: 500;
          color: var(--el-text-color-primary);
        }
      }
    }
  }
}

/* 暗色模式适配 */
.dark {
  .completion-chart {
    background: var(--el-bg-color);
  }
}
</style> 