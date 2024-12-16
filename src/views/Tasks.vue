<template>
  <div class="tasks-container">
    <div class="page-header">
      <h2>我的任务</h2>
      <el-button type="primary" @click="router.push('/create-task')">
        <el-icon><Plus /></el-icon>创建任务
      </el-button>
    </div>

    <div class="tasks-grid">
      <el-empty v-if="!tasks.length" description="暂无任务" />
      
      <el-card
        v-for="task in tasks"
        :key="task.id"
        class="task-card"
        :class="{ 'completed': task.status === 'completed' }"
      >
        <template #header>
          <div class="card-header">
            <el-tag :type="getStatusType(task.status)">
              {{ getStatusText(task.status) }}
            </el-tag>
            <span class="create-time">
              {{ formatDate(task.createTime) }}
            </span>
          </div>
        </template>

        <div class="task-content">
          <p class="message">{{ task.message }}</p>
          
          <div v-if="task.media_urls?.length" class="media-content">
            <template v-if="task.media_type === 'image'">
              <el-image
                :src="task.media_urls[0]"
                :preview-src-list="task.media_urls"
                fit="cover"
                class="media-preview"
              />
            </template>
            <template v-else-if="task.media_type === 'video'">
              <video
                :src="task.media_urls[0]"
                class="media-preview"
                controls
              />
            </template>
          </div>
          
          <div class="phone-numbers">
            <div class="number-count">
              <el-icon><Phone /></el-icon>
              <span>发送号码：{{ task.phoneNumbers.length }} 个</span>
            </div>
            <el-popover
              placement="bottom"
              :width="300"
              trigger="hover"
            >
              <template #reference>
                <el-button link type="primary">查看号码</el-button>
              </template>
              <div class="number-list">
                <p v-for="(number, index) in task.phoneNumbers" :key="index">
                  {{ number }}
                </p>
              </div>
            </el-popover>
          </div>
        </div>

        <div class="task-footer">
          <el-button 
            v-if="task.status === 'pending'"
            type="primary" 
            link
            @click="handleTaskComplete(task.id)"
          >
            标记完成
          </el-button>
          <el-button 
            type="danger" 
            link
            @click="handleTaskDelete(task.id)"
          >
            删除任务
          </el-button>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Phone } from '@element-plus/icons-vue'
import request from '../utils/request'

const router = useRouter()
const tasks = ref([])

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
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const fetchTasks = async () => {
  try {
    const response = await request.get('/api/tasks')
    tasks.value = response.map(task => ({
      id: task.id,
      message: task.content,
      phoneNumbers: task.numbers,
      status: task.status,
      createTime: task.created_at,
      media_urls: task.media_urls,
      media_type: task.media_type
    }))
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const handleTaskComplete = async (taskId) => {
  try {
    await request.put(`/api/tasks/${taskId}/complete`)
    ElMessage.success('任务已标记为完成')
    fetchTasks()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const handleTaskDelete = (taskId) => {
  ElMessageBox.confirm('确定要删除该任务吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await request.delete(`/api/tasks/${taskId}`)
      ElMessage.success('任务已删除')
      fetchTasks()
    } catch (error) {
      ElMessage.error(error.message)
    }
  })
}

onMounted(() => {
  fetchTasks()
})
</script>

<style scoped>
.tasks-container {
  min-height: 100%;
  background-color: var(--bg-color);
  border-radius: 12px;
  padding: 24px;
  transition: all 0.3s ease;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 4px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: var(--text-primary);
  font-weight: 600;
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
  padding: 4px;
}

.task-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: var(--bg-color-light);
  border: 1px solid var(--border-color) !important;
  backdrop-filter: blur(10px);
  
  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: var(--box-shadow);
    border-color: var(--primary-color) !important;
  }
}

.task-card.completed {
  opacity: 0.7;
  background-color: var(--bg-color-dark);
  
  .message {
    text-decoration: line-through;
    color: var(--text-secondary);
  }
}

.card-header {
  padding: 16px !important;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-color-light);
}

.create-time {
  font-size: 13px;
  color: var(--text-secondary);
}

.task-content {
  padding: 20px !important;
}

.message {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
}

.phone-numbers {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-top: 1px solid var(--border-color);
}

.number-count {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 13px;
}

.number-list {
  padding: 12px;
  background-color: var(--bg-color-dark);
  border-radius: 8px;
  max-height: 240px;
  overflow-y: auto;
  font-family: 'Fira Code', monospace;
  
  p {
    padding: 4px 8px;
    margin: 2px 0;
    border-radius: 4px;
    
    &:hover {
      background-color: var(--bg-color-light);
    }
  }
}

.task-footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

:deep(.el-tag) {
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 500;
  letter-spacing: 0.5px;
  
  &.el-tag--warning {
    color: var(--warning-color);
    background-color: rgba(235, 181, 99, 0.15);
    border-color: rgba(235, 181, 99, 0.3);
  }
  
  &.el-tag--success {
    color: var(--success-color);
    background-color: rgba(133, 206, 97, 0.15);
    border-color: rgba(133, 206, 97, 0.3);
  }
  
  &.el-tag--danger {
    color: var(--danger-color);
    background-color: rgba(247, 137, 137, 0.15);
    border-color: rgba(247, 137, 137, 0.3);
  }
}

:deep(.el-button--link) {
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: var(--bg-color-dark);
    transform: translateY(-1px);
  }
  
  &.el-button--primary {
    color: var(--primary-color);
    
    &:hover {
      color: var(--primary-dark);
    }
  }
  
  &.el-button--danger {
    color: var(--danger-color);
    
    &:hover {
      color: #f56c6c;
    }
  }
}

.media-content {
  margin: 16px 0;
  border-radius: 8px;
  overflow: hidden;
}

.media-preview {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 8px;
  background-color: var(--bg-color-dark);
}
</style> 