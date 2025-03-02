<template>
  <div class="create-task-container">
    <div v-if="loading" class="fullscreen-loading">
      <div class="loading-content">
        <el-icon class="loading-icon"><Loading /></el-icon>
        <p class="loading-text">正在提交任务，请稍候...</p>
      </div>
    </div>

    <div class="page-header">
      <h2>创建任务</h2>
    </div>

    <el-card class="task-form">
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <el-form-item label="消息内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            placeholder="请输入消息内容"
          />
        </el-form-item>

        <el-form-item>
          <el-switch
            v-model="form.ai_revise"
            active-text="使用 AI 优化内容"
            :active-value="true"
            :inactive-value="false"
          />
          <div class="switch-tip">
            开启后将自动使用AI优化文案，提升送达率
          </div>
        </el-form-item>

        <el-form-item label="媒体文件">
          <el-upload
            ref="uploadRef"
            class="media-uploader"
            :auto-upload="false"
            :show-file-list="true"
            :limit="1"
            :on-change="handleFileChange"
            :on-exceed="handleExceed"
            :before-remove="handleRemove"
            :accept="acceptTypes"
            drag
          >
            <template #trigger>
              <div class="upload-trigger" :class="{ 'has-file': form.file }">
                <el-icon class="upload-icon">
                  <component :is="form.file ? getFileTypeIcon(form.file) : Upload" />
                </el-icon>
                <div class="upload-text">
                  <span>{{ form.file ? '点击更换文件' : '点击或拖拽文件到此处上传' }}</span>
                  <p class="upload-tip">
                    支持图片(≤1MB)或视频(≤5MB)
                    <template v-if="form.file">
                      <br>当前文件：{{ form.file.name }}
                    </template>
                  </p>
                </div>
              </div>
            </template>
          </el-upload>

          <div v-if="form.file" class="file-preview">
            <div class="preview-header">
              <span class="file-type">
                <el-icon><component :is="getFileTypeIcon(form.file)" /></el-icon>
                {{ isImage ? '图片预览' : '视频预览' }}
              </span>
              <el-button 
                type="danger" 
                link 
                @click="handleRemove"
              >
                <el-icon><Delete /></el-icon>
                移除文件
              </el-button>
            </div>
            
            <template v-if="isImage">
              <el-image
                :src="previewUrl"
                fit="contain"
                class="image-preview"
                :preview-src-list="[previewUrl]"
                :initial-index="0"
                append-to-body
              >
                <template #placeholder>
                  <div class="image-placeholder">
                    <el-icon><Picture /></el-icon>
                    <span>加载中...</span>
                  </div>
                </template>
                <template #error>
                  <div class="image-error">
                    <el-icon><Warning /></el-icon>
                    <span>加载失败</span>
                  </div>
                </template>
              </el-image>
            </template>
            <template v-else-if="isVideo">
              <video
                :src="previewUrl"
                class="video-preview"
                controls
                controlsList="nodownload"
                preload="metadata"
              />
            </template>
          </div>
        </el-form-item>

        <el-form-item label="电话号码" prop="numbers">
          <el-input
            v-model="numberInput"
            type="textarea"
            :rows="6"
            placeholder="请输入电话号码，支持以下格式：
- 每行一个号码
- 使用逗号(,)分隔
- 使用分号(;)分隔
- 使用空格分隔"
            @input="handleNumberInput"
            @blur="handleNumberBlur"
          />
          <div class="points-info" :class="{ 'is-warning': !hasEnoughPoints }">
            <el-icon><InfoFilled /></el-icon>
            <span>
              预计消耗 {{ totalPoints }} 积分
              <template v-if="hasEnoughPoints">
                (当前余额: {{ userStore.userBalance }} 积分)
              </template>
              <template v-else>
                <el-tag type="danger" size="small">
                  余额不足，当前余额: {{ userStore.userBalance }} 积分
                </el-tag>
              </template>
            </span>
          </div>
        </el-form-item>

        <div class="number-preview" v-if="form.numbers.length">
          <div class="number-list-container">
            <h4>
              <el-icon><Document /></el-icon>
              号码列表 ({{ form.numbers.length }})
            </h4>
            <div class="number-list">
              <p v-for="(number, index) in form.numbers" :key="index">
                {{ number }}
              </p>
            </div>
          </div>
        </div>

        <el-form-item>
          <el-button
            type="primary"
            :loading="loading"
            :disabled="!form.numbers.length"
            @click="handleSubmit"
          >
            提交任务
          </el-button>
          <el-button @click="router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template> 

<script setup>
import { ref, reactive, computed, onUnmounted, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document, Upload, Picture as ImageIcon, VideoCamera, Loading, Delete, Warning, Picture, InfoFilled } from '@element-plus/icons-vue'
import request from '../utils/request'
import 'vue-cropper/dist/index.css'
import { VueCropper } from 'vue-cropper'
import { useUserStore } from '../stores/user'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const numberInput = ref('')

const form = reactive({
  content: '',
  numbers: [],
  file: null,
  ai_revise: false,
  is_linkpreview: false,
  linkpreview: ''
})

const acceptTypes = 'image/jpeg,image/png,image/gif,video/mp4,video/quicktime'
const maxImageSize = 1 * 1024 * 1024  // 1MB
const maxVideoSize = 5 * 1024 * 1024  // 5MB

const rules = {
  content: [
    { required: true, message: '请输入消息内容', trigger: 'blur' },
    { min: 1, max: 1000, message: '消息长度应在1-1000字符之间', trigger: 'blur' }
  ],
  numbers: [
    { 
      required: true, 
      message: '请输入至少一个电话号码', 
      trigger: 'change',
      validator: (rule, value, callback) => {
        if (form.numbers.length === 0) {
          callback(new Error('请输入至少一个电话号码'))
        } else {
          callback()
        }
      }
    }
  ]
}

const handleNumberInput = () => {
  const numbers = numberInput.value
    .split(/[\n,;\s]+/)
    .map(num => num.trim())
    .filter(num => num !== '')
  
  form.numbers = numbers
  calculatePoints(false)  // 不显示警告
}

const numberCount = ref(0)

const handleNumberBlur = (e) => {
  const input = e.target.value
  if (!input) return

  // 1. 按多种分隔符分割成完整的电话号码数组并去重
  const numbers = input
    .split(/[,，;；\s]+/) // 支持中英文逗号分号和空格
    .map(num => num.trim())
    .filter(num => num) // 过滤空值
    .filter((num, index, self) => self.indexOf(num) === index) // 去重完整号码

  // 2. 更新表单数据和输入框的值（统一使用空格分隔）
  form.numbers = numbers
  numberInput.value = numbers.join(' ') // 输出时统一用空格分隔
  numberCount.value = numbers.length

  // 3. 如果有重复号码，提示用户
  const originalNumbers = input.split(/[,，;；\s]+/).filter(num => num.trim())
  if (originalNumbers.length > numbers.length) {
    ElMessage({
      message: `已自动去除 ${originalNumbers.length - numbers.length} 个重复号码`,
      type: 'info'
    })
  }

  // 4. 使用去重后的号码数量计算积分
  calculatePoints(false)
}

// 文件类型判断
const isImage = computed(() => form.file?.type.startsWith('image/'))
const isVideo = computed(() => form.file?.type.startsWith('video/'))

// 文件预览URL
const previewUrl = computed(() => {
  if (!form.file) return ''
  return URL.createObjectURL(form.file)
})

// 获取文件类型图标
const getFileTypeIcon = (file) => {
  if (file.type.startsWith('image/')) return ImageIcon
  if (file.type.startsWith('video/')) return VideoCamera
  return Document
}

// 添加响应式变量
const showCropper = ref(false)
const cropperImage = ref('')
const aspectRatio = 5/3  // 设置宽高比为 5:3

// 修改文件选择处理函数
const handleFileChange = async (uploadFile) => {
  const file = uploadFile.raw
  const isImageFile = file.type.startsWith('image/')
  const isVideoFile = file.type.startsWith('video/')
  
  // 检查文件类型和大小
  if (!isImageFile && !isVideoFile) {
    ElMessage.error('只支持图片或视频文件')
    return false
  }
  
  // 图片 1MB，视频 5MB
  const maxSize = isImageFile ? 1024 * 1024 : 5 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error(`${isImageFile ? '图片' : '视频'}大小不能超过${isImageFile ? '1MB' : '5MB'}`)
    if (uploadRef.value) {
      uploadRef.value.clearFiles()
    }
    return false
  }

  if (isImageFile) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        // 直接进行压缩
        const compressedData = await compressImage(e.target.result)
        const res = await fetch(compressedData)
        const blob = await res.blob()
        form.file = new File([blob], file.name, { type: 'image/jpeg' })
        
        // 检查压缩后的大小，限制改为 200KB
        if (form.file.size > 200 * 1024) {
          ElMessage.warning('图片压缩后仍然超过200KB，请选择更小的图片')
          form.file = null
          if (uploadRef.value) {
            uploadRef.value.clearFiles()
          }
          return false
        }
      } catch (error) {
        ElMessage.error('图片处理失败')
        console.error(error)
        form.file = null
        return false
      }
    }
    reader.readAsDataURL(file)
  } else {
    form.file = file  // 视频文件直接使用
  }
  
  return true
}

// 添加裁剪完成处理函数
const handleCropFinish = async (data) => {
  try {
    // 先压缩裁剪后的图片
    const compressedData = await compressImage(data)
    const res = await fetch(compressedData)
    const blob = await res.blob()
    
    // 检查压缩后的大小
    if (blob.size > 100 * 1024) {
      ElMessage.warning('图片压缩后仍然超过100KB，请选择更小的图片')
      form.file = null
      showCropper.value = false
      if (uploadRef.value) {
        uploadRef.value.clearFiles()  // 清除上传列表
      }
      return
    }
    
    form.file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' })
    showCropper.value = false
  } catch (error) {
    ElMessage.error('图片处理失败')
    console.error(error)
  }
}

// 处理超出文件数限制
const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

// 添加 ref 引用上传组件
const uploadRef = ref(null)

// 修改处理文件移除的方法
const handleRemove = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  form.file = null
  // 清除上传列表
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
  return true
}

// 组件卸载时清理
onUnmounted(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})

const userStore = useUserStore()

// 添加校验余额的方法
const checkBalance = async () => {
  try {
    // 获取消息积分配置
    await userStore.fetchMessagePoints()
    // 获取最新的用户信息（包含余额）
    const userProfile = await userStore.fetchUserProfile()
    
    const messageType = '普通消息'
    const pointsPerMessage = userStore.messagePoints[messageType].points
    const totalPoints = form.numbers.length * pointsPerMessage
    
    if (userProfile.balance < totalPoints) {
      ElMessage.error(`余额不足！发送${form.numbers.length}条${messageType}需要${totalPoints}积分，当前余额${userProfile.balance}积分`)
      return false
    }
    
    return true
  } catch (error) {
    ElMessage.error('校验余额失败，请重试')
    return false
  }
}

// 修改提交方法
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    // 先进行表单验证
    await formRef.value.validate()
    
    // 添加余额校验
    const hasEnoughBalance = await checkBalance()
    if (!hasEnoughBalance) {
      return
    }
    
    // 立即显示加载遮罩
    loading.value = true
    
    const formData = new FormData()
    formData.append('content', form.content)
    formData.append('ai_revise', form.ai_revise)
    formData.append('is_linkpreview', form.is_linkpreview)
    formData.append('message_type', '普通消息')
    if (form.is_linkpreview) {
      formData.append('linkpreview', form.linkpreview)
    }
    form.numbers.forEach(number => {
      formData.append('numbers[]', number.trim())
    })
    if (form.file) {
      formData.append('file', form.file)
    }

    const response = await request.post('/api/tasks', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000
    })
    
    ElMessage.success('任务创建成功')
    router.push('/tasks')
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      ElMessage.error('文件上传超时，请重试')
    } else if (error.response?.status === 413) {
      ElMessage.error('文件大小超出服务器限制')
    } else {
      ElMessage.error(error.response?.data?.message || '创建任务失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

const primaryRgb = '64, 158, 255' // 主题色的 RGB 值
document.documentElement.style.setProperty('--primary-rgb', primaryRgb)

// 监听 is_linkpreview 的变化，关闭时清空内容
watch(() => form.is_linkpreview, (newVal) => {
  if (!newVal) {
    form.linkpreview = ''
  }
})

const cropperRef = ref(null)

const cropImage = () => {
  const cropper = cropperRef.value
  if (!cropper) return
  
  cropper.getCropData((data) => {
    handleCropFinish(data)
  })
}

// 修改压缩函数，目标大小改为 200KB
const compressImage = async (dataUrl, maxSize = 200 * 1024) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      console.log('原始图片尺寸:', `${img.width}x${img.height}`)
      
      let quality = 0.9
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      // 计算等比例缩放后的尺寸
      let outputWidth = img.width
      let outputHeight = img.height
      
      // 如果宽度大于 1000px，等比例缩小
      if (outputWidth > 1000) {
        outputHeight = Math.round((1000 * outputHeight) / outputWidth)
        outputWidth = 1000
      }
      
      canvas.width = outputWidth
      canvas.height = outputHeight
      
      console.log('压缩后尺寸:', `${canvas.width}x${canvas.height}`)
      
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // 递归压缩质量直到文件大小符合要求
      const compress = () => {
        const base64 = canvas.toDataURL('image/jpeg', quality)
        const blob = base64ToBlob(base64)
        
        console.log('当前压缩质量:', quality, '压缩后大小:', `${(blob.size / 1024).toFixed(2)}KB`)
        
        if (blob.size > maxSize && quality > 0.2) {
          quality -= 0.1
          compress()
        } else if (blob.size > maxSize) {
          reject(new Error('无法压缩到目标大小'))
        } else {
          resolve(base64)
        }
      }
      
      compress()
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

// 辅助函数：base64 转 Blob
const base64ToBlob = (base64) => {
  const parts = base64.split(';base64,')
  const contentType = parts[0].split(':')[1]
  const raw = window.atob(parts[1])
  const rawLength = raw.length
  const uInt8Array = new Uint8Array(rawLength)
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i)
  }
  
  return new Blob([uInt8Array], { type: contentType })
}

// 在 script setup 中添加组件注册
const components = {
  VueCropper
}

// 修改裁剪对话框的取消处理
const handleCropCancel = () => {
  showCropper.value = false
  // 清除文件列表
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

// 添加初始化函数
const initData = async () => {
  try {
    await userStore.fetchUserProfile()
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

onMounted(() => {
  initData()
})

// 添加积分相关的响应式变量
const totalPoints = ref(0)
const hasEnoughPoints = ref(true)

// 修改计算积分的函数，分为两个版本：实时计算和失焦检查
const calculatePoints = async (showWarning = false) => {
  try {
    if (!userStore.messagePoints) {
      await userStore.fetchMessagePoints()
    }
    if (!userStore.userInfo.balance) {
      await userStore.fetchUserProfile()
    }
    
    const messageType = '普通消息'
    const pointsPerMessage = userStore.getMessageTypePoints(messageType)
    totalPoints.value = numberCount.value * pointsPerMessage // 使用 numberCount
    
    hasEnoughPoints.value = userStore.userBalance >= totalPoints.value
    
    if (showWarning && !hasEnoughPoints.value) {
      ElMessage.warning(`余额不足！发送${numberCount.value}条${messageType}需要${totalPoints.value}积分，当前余额${userStore.userBalance}积分`)
    }
  } catch (error) {
    console.error('计算积分失败:', error)
  }
}
</script> 

<style scoped>
.create-task-container {
  min-height: 100%;
  background: linear-gradient(135deg, var(--bg-color) 0%, var(--bg-color-light) 100%);
  border-radius: 16px;
  padding: 32px;
  transition: all 0.3s ease;
}

.page-header {
  margin-bottom: 32px;
  position: relative;
  padding-left: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 28px;
  color: var(--text-primary);
  font-weight: 600;
  position: relative;
  display: inline-block;
}

.page-header h2::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: var(--primary-color);
  border-radius: 2px;
}

.task-form {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  gap: 32px;
  padding: 40px;
  background: linear-gradient(145deg, var(--bg-color-light) 0%, var(--bg-color) 100%);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.05),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  
  &:hover {
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }
}

:deep(.el-form-item) {
  margin-bottom: 28px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .el-form-item__label {
    font-size: 15px;
    margin-bottom: 12px;
    color: var(--text-primary);
    font-weight: 500;
    
    &::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 16px;
      background: var(--primary-color);
      border-radius: 2px;
      margin-right: 8px;
      vertical-align: middle;
      opacity: 0.8;
    }
  }
}

:deep(.el-form-item__label) {
  font-weight: 500;
  padding-bottom: 8px;
}

:deep(.el-input__wrapper) {
  padding: 4px 12px;
}

:deep(.el-textarea__inner) {
  min-height: 120px !important;
  font-family: monospace;
  line-height: 1.6;
}

.number-preview {
  margin: 24px 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.number-list-container {
  background: var(--bg-color);
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  h4 {
    font-size: 16px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    gap: 8px;
    
    .el-icon {
      color: var(--primary-color);
    }
  }
}

.number-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
  max-height: 300px;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-color-light);
  border-radius: 12px;
  
  p {
    padding: 8px 16px;
    background: var(--bg-color);
    border-radius: 8px;
    font-family: 'Fira Code', monospace;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    
    &::before {
      content: '📞';
      font-size: 14px;
    }
    
    &:hover {
      transform: translateX(8px);
      background: var(--primary-light);
      color: var(--primary-color);
    }
  }
}

.number-list p {
  color: var(--text-regular);
  margin: 4px 0;
  font-family: monospace;
}

:deep(.el-card) {
  background-color: transparent;
  border: none;
  box-shadow: none;
}

:deep(.el-button) {
  padding: 12px 32px;
  font-weight: 500;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  
  &.el-button--primary {
    background: linear-gradient(135deg, var(--primary-color) 0%, #2c5282 100%);
    border: none;
    color: #ffffff;
    font-size: 15px;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(var(--primary-rgb), 0.25);
      background: linear-gradient(135deg, #4c9fff 0%, #3461a5 100%);
    }
    
    &:active {
      transform: translateY(0);
      box-shadow: 0 4px 8px rgba(var(--primary-rgb), 0.2);
    }
    
    &.is-disabled {
      background: #CFD4DC !important;
      border: none;
      color: #ffffff !important;
      opacity: 1;
      cursor: not-allowed;
      text-shadow: none;
      
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
      
      &:hover {
        transform: none;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
      }
    }
  }
  
  &.el-button--default {
    background: var(--bg-color-light);
    border: 1px solid var(--border-color);
    color: var(--text-regular);
    
    &:hover {
      color: var(--primary-color);
      border-color: var(--primary-color);
      background: var(--bg-color);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    
    &:active {
      transform: translateY(0);
    }
  }
}

/* 按钮组样式 */
.el-form-item:last-child {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 1px solid var(--border-color);
  
  :deep(.el-form-item__content) {
    display: flex;
    justify-content: center;
    gap: 20px;
    
    .el-button {
      min-width: 140px;
      height: 44px;
      
      &--primary {
        background: linear-gradient(135deg, var(--primary-color) 0%, #2c5282 100%);
        
        &:not(.is-disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(var(--primary-rgb), 0.25);
          background: linear-gradient(135deg, #4c9fff 0%, #3461a5 100%);
        }
      }
      
      &--default {
        background: var(--bg-color);
        border: 1px solid var(--border-color);
        
        &:hover {
          color: var(--primary-color);
          border-color: var(--primary-color);
          background: var(--bg-color-light);
        }
      }
    }
  }
}

/* 滚动条样式 */
.number-list::-webkit-scrollbar {
  width: 6px;
}

.number-list::-webkit-scrollbar-thumb {
  background-color: #ddd;
  border-radius: 3px;
}

.number-list::-webkit-scrollbar-track {
  background-color: #f5f5f5;
  border-radius: 3px;
}

@media (max-width: 768px) {
  .number-preview {
    grid-template-columns: 1fr;
  }
  
  .task-form {
    margin: 0 12px;
  }
}

:deep(.el-form-item__label) {
  color: var(--text-primary);
}

:deep(.el-textarea__inner) {
  background-color: var(--bg-color-light);
  border-color: var(--border-color);
  color: var(--text-regular);
  
  &:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 1px var(--primary-light);
  }
}

:deep(.el-button) {
  &.is-disabled {
    background-color: var(--bg-color-dark);
    border-color: var(--border-color);
    color: var(--text-secondary);
  }
}

:deep(.el-form-item__label) {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 8px;
}

:deep(.el-textarea__inner) {
  font-family: 'Fira Code', monospace;
  line-height: 1.6;
  padding: 16px;
  resize: vertical;
  
  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.7;
  }
  
  &:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-light);
  }
}

:deep(.el-button) {
  &.is-disabled {
    opacity: 0.6;
  }
  
  &:not(.is-disabled):hover {
    transform: translateY(-1px);
  }
}

.media-uploader {
  width: 100%;
}

.upload-trigger {
  padding: 48px 24px;
  border: 2px dashed var(--border-color);
  background: linear-gradient(145deg, var(--bg-color) 0%, var(--bg-color-light) 100%);
  border-radius: 20px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(45deg, transparent 48%, rgba(var(--primary-rgb), 0.1) 50%, transparent 52%);
    background-size: 200% 200%;
    animation: shine 3s linear infinite;
  }
  
  &.has-file {
    border-style: solid;
    border-color: var(--primary-color);
    background: linear-gradient(145deg, var(--primary-light) 0%, var(--bg-color-light) 100%);
    
    .upload-icon {
      color: var(--primary-color);
      transform: scale(1.1);
    }
  }
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
  transition: all 0.3s ease;
}

.upload-text {
  .upload-tip {
    margin-top: 8px;
    padding: 4px 12px;
    background: rgba(var(--primary-rgb), 0.1);
    border-radius: 12px;
    display: inline-block;
  }
}

@keyframes shine {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.file-preview {
  margin-top: 24px;
  padding: 24px;
  background: linear-gradient(145deg, var(--bg-color-light) 0%, var(--bg-color) 100%);
  border-radius: 16px;
  border: 1px solid var(--border-color);
}

.image-preview {
  width: 100%;
  aspect-ratio: 5/3;  /* 强制 5:3 比例 */
  object-fit: contain;
  border-radius: 8px;
  background-color: var(--bg-color-light);
  border: 1px solid var(--border-color);
}

.image-placeholder,
.image-error {
  width: 100%;
  aspect-ratio: 5/3;  /* 保持与图片预览相同的比例 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-color-dark);
  color: var(--text-secondary);
  border-radius: 8px;
  
  .el-icon {
    font-size: 48px;
    margin-bottom: 8px;
  }
}

.image-error {
  color: var(--danger-color);
}

/* 视频播放器样式 */
video::-webkit-media-controls-panel {
  background-color: rgba(0, 0, 0, 0.7);
}

video::-webkit-media-controls-play-button {
  background-color: var(--primary-color);
  border-radius: 50%;
}

video::-webkit-media-controls-timeline {
  background-color: var(--primary-light);
  border-radius: 2px;
}

.dark {
  .upload-trigger.has-file {
    background-color: var(--bg-color-light);
  }
  
  .image-placeholder,
  .image-error {
    background-color: var(--bg-color-light);
  }
}

.switch-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
  padding-left: 4px;
}

.crop-tip {
  color: var(--el-text-color-secondary);
  font-size: 14px;
  text-align: center;
  margin: 0;
}

:deep(.el-dialog__body) {
  padding: 0;
}

.cropper-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.cropper-container {
  height: 400px;
  width: 100%;
}

:deep(.vue-cropper) {
  height: 100%;
  width: 100%;
}
.fullscreen-loading {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-content {
  background: white;
  padding: 32px;
  border-radius: 8px;
  text-align: center;
}

.loading-icon {
  font-size: 32px;
  margin-bottom: 16px;
  color: var(--primary-color);
  animation: spin 1s linear infinite;
}

.loading-text {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.points-info {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--el-color-info-light-9);
  border-radius: 4px;
  font-size: 14px;
  color: var(--el-text-color-secondary);
  
  &.is-warning {
    background: var(--el-color-danger-light-9);
  }
  
  .el-icon {
    font-size: 16px;
    color: var(--el-color-info);
  }
  
  &.is-warning .el-icon {
    color: var(--el-color-danger);
  }
}

.el-tag {
  margin-left: 8px;
}
</style>
