<template>
  <div class="orders-container">
    <div class="page-header">
      <h2>我的订单</h2>
      
      <!-- 搜索和筛选区域 -->
      <div class="filter-section">
        <el-select v-model="filters.message_type" placeholder="消息类型" clearable>
          <el-option label="普通消息" value="普通消息" />
          <el-option label="超链消息" value="超链消息" />
        </el-select>
        
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-card v-for="(value, key) in stats" :key="key" class="stat-card">
        <template #header>
          {{ getStatLabel(key) }}
        </template>
        <div class="stat-value">{{ formatStatValue(key, value) }}</div>
      </el-card>
    </div>

    <!-- 订单列表 -->
    <el-table
      v-loading="loading"
      :data="orders"
      style="width: 100%"
      class="orders-table"
    >
      <el-table-column prop="id" label="订单号" width="100" />
      <el-table-column prop="message_type" label="消息类型" width="120" />
      <el-table-column prop="message_count" label="消息数量" width="100" />
      <el-table-column prop="unit_price" label="单价(积分)" width="120">
        <template #default="{ row }">
          {{ row.unit_price }} 积分
        </template>
      </el-table-column>
      <el-table-column prop="total_points" label="总积分" width="120">
        <template #default="{ row }">
          {{ row.total_points }} 积分
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="120">
        <template #default="{ row }">
          <el-tag 
            :type="row.is_deleted ? 'danger' : getStatusType(row.status)"
            :effect="row.is_deleted ? 'dark' : 'light'"
          >
            {{ row.is_deleted ? '已删除' : row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180">
        <template #default="{ row }">
          {{ formatDate(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" fixed="right" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="showOrderDetail(row)">
            查看详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.current_page"
        v-model:page-size="pagination.per_page"
        :page-sizes="[10, 20, 30, 50]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 订单详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="订单详情"
      width="600px"
      destroy-on-close
    >
      <div v-if="currentOrder" class="order-detail">
        <div class="detail-header">
          <h3>订单信息</h3>
          <el-tag 
            v-if="currentOrder.is_deleted" 
            type="danger" 
            effect="dark"
            class="delete-tag"
          >
            <el-icon><Delete /></el-icon>
            任务已删除
          </el-tag>
        </div>

        <div class="detail-item">
          <span class="label">订单号：</span>
          <span>{{ currentOrder.id }}</span>
        </div>
        <div class="detail-item">
          <span class="label">消息类型：</span>
          <span>{{ currentOrder.message_type }}</span>
        </div>
        <div class="detail-item">
          <span class="label">消息数量：</span>
          <span>{{ currentOrder.message_count }}</span>
        </div>
        <div class="detail-item">
          <span class="label">单价：</span>
          <span>{{ currentOrder.unit_price }} 积分</span>
        </div>
        <div class="detail-item">
          <span class="label">总积分：</span>
          <span>{{ currentOrder.total_points }} 积分</span>
        </div>
        <div class="detail-item">
          <span class="label">消费前余额：</span>
          <span>{{ currentOrder.balance_before }} 积分</span>
        </div>
        <div class="detail-item">
          <span class="label">消费后余额：</span>
          <span>{{ currentOrder.balance_after }} 积分</span>
        </div>
        <div class="detail-item">
          <span class="label">创建时间：</span>
          <span>{{ formatDate(currentOrder.created_at) }}</span>
        </div>
        
        <div class="task-info" v-if="currentOrder.task">
          <div class="info-header">
            <h4>关联任务信息</h4>
            <el-tag 
              :type="getStatusType(currentOrder.task.status)"
              effect="light"
            >
              {{ currentOrder.task.status }}
            </el-tag>
          </div>
          <div class="detail-item">
            <span class="label">消息内容：</span>
            <span>{{ currentOrder.task.content }}</span>
          </div>
          <div class="detail-item">
            <span class="label">发送号码：</span>
            <div class="number-list">
              <p v-for="(number, index) in currentOrder.task.numbers" 
                :key="index">{{ number }}</p>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import request from '../utils/request'

const loading = ref(false)
const orders = ref([])
const currentOrder = ref(null)
const detailVisible = ref(false)
const dateRange = ref([])

const filters = reactive({
  message_type: '',
  start_date: '',
  end_date: ''
})

const pagination = reactive({
  current_page: 1,
  per_page: 10,
  total: 0,
  total_pages: 0
})

const stats = ref({
  total_messages: 0,
  total_points: 0,
  total_orders: 0
})

// 监听日期范围变化
watch(dateRange, (newValue) => {
  if (newValue) {
    filters.start_date = newValue[0]
    filters.end_date = newValue[1]
    fetchOrders()
  }
})

// 获取订单列表
const fetchOrders = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.current_page,
      limit: pagination.per_page,
      ...filters
    }
    
    const response = await request.get('/taskapi/user/orders', { params })
    orders.value = response.data.orders
    stats.value = response.data.stats
    pagination.total = response.data.pagination.total
    pagination.total_pages = response.data.pagination.total_pages
  } catch (error) {
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

// 获取订单详情
const showOrderDetail = async (order) => {
  try {
    const response = await request.get(`/taskapi/user/orders/${order.id}`)
    currentOrder.value = response.data
    detailVisible.value = true
  } catch (error) {
    ElMessage.error('获取订单详情失败')
  }
}

// 分页处理
const handleSizeChange = (val) => {
  pagination.per_page = val
  fetchOrders()
}

const handleCurrentChange = (val) => {
  pagination.current_page = val
  fetchOrders()
}

// 格式化函数
const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getStatusType = (status) => {
  const types = {
    'completed': 'success',
    'pending': 'warning',
    'failed': 'danger',
    '已删除': 'danger'
  }
  return types[status] || 'info'
}

const getStatLabel = (key) => {
  const labels = {
    total_messages: '总消息数',
    total_points: '总消费积分',
    total_orders: '总订单数'
  }
  return labels[key]
}

const formatStatValue = (key, value) => {
  if (key === 'total_points') {
    return `${value} 积分`
  }
  return value
}

// 初始化
fetchOrders()
</script>

<style scoped>
.orders-container {
  padding: 24px;
  background: var(--bg-color);
  border-radius: 8px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  color: var(--text-primary);
}

.filter-section {
  display: flex;
  gap: 16px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  text-align: center;
  
  :deep(.el-card__header) {
    padding: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }
  
  .stat-value {
    font-size: 24px;
    color: var(--primary-color);
    font-weight: 600;
  }
}

.orders-table {
  margin-bottom: 24px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.order-detail {
  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    
    h3 {
      margin: 0;
      color: var(--text-primary);
      font-size: 18px;
    }
  }
  
  .detail-item {
    margin-bottom: 16px;
    display: flex;
    
    .label {
      width: 100px;
      color: var(--text-secondary);
      flex-shrink: 0;
    }
  }
  
  .delete-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    
    .el-icon {
      font-size: 14px;
    }
  }
  
  .info-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    h4 {
      margin: 0;
    }
  }
  
  .task-info {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid var(--border-color);
  }
  
  .number-list {
    flex: 1;
    
    p {
      margin: 4px 0;
      padding: 4px 8px;
      background: var(--bg-color-light);
      border-radius: 4px;
      
      &:hover {
        background: var(--bg-color-dark);
      }
    }
  }
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .el-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    
    .el-icon {
      font-size: 14px;
    }
  }
}
</style> 