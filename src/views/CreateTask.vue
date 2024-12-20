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
import { ref, reactive, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Document, Upload, Picture as ImageIcon, VideoCamera, Loading, Delete, Warning, Picture } from '@element-plus/icons-vue'
import request from '../utils/request'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const numberInput = ref('')

const form = reactive({
  content: '',
  numbers: [],
  file: null,
  ai_revise: false
})

const acceptTypes = 'image/jpeg,image/png,image/gif,video/mp4,video/quicktime'
const maxImageSize = 1 * 1024 * 1024  // 1MB
const maxVideoSize = 5 * 1024 * 1024  // 5MB

const rules = {
  content: [
    { required: true, message: '请输入消息内容', trigger: 'blur' },
    { min: 1, max: 500, message: '消息长度应在1-500字符之间', trigger: 'blur' }
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
}

const handleNumberBlur = () => {
  if (form.numbers.length > 0) {
    numberInput.value = form.numbers.join('\n')
  }
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

// 处理文件选择
const handleFileChange = (uploadFile) => {
  const file = uploadFile.raw
  const isImageFile = file.type.startsWith('image/')
  const isVideoFile = file.type.startsWith('video/')
  
  // 检查文件类型
  if (!isImageFile && !isVideoFile) {
    ElMessage.error('只支持图片或视频文件')
    return false
  }
  
  // 检查文件大小
  const maxSize = isImageFile ? maxImageSize : maxVideoSize
  if (file.size > maxSize) {
    ElMessage.error(`${isImageFile ? '图片' : '视频'}大小不能超过${isImageFile ? '1MB' : '5MB'}`)
    return false
  }
  
  form.file = file
  return true
}

// 处理超出文件数限制
const handleExceed = () => {
  ElMessage.warning('只能上传一个文件')
}

// 处理文件移除
const handleRemove = () => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  form.file = null
  return true
}

// 组件卸载时清理
onUnmounted(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true

    // 添加最小延迟，确保动画效果
    const minDelay = new Promise(resolve => setTimeout(resolve, 800))

    const formData = new FormData()
    formData.append('content', form.content)
    formData.append('ai_revise', form.ai_revise)
    form.numbers.forEach(number => {
      formData.append('numbers[]', number.trim())
    })
    if (form.file) {
      formData.append('file', form.file)
    }
    
    try {
      // 使用更长的超时时间处理上传请求
      const [response] = await Promise.all([
        request.post('/api/tasks', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          timeout: 60000,  // 针对上传请求设置 60 秒超时
          onUploadProgress: (progressEvent) => {
            // 可以在这里添加上传进度处理
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            console.log('上传进度:', percentCompleted)
            // TODO: 可以添加进度条显示
          }
        }),
        minDelay
      ])
      
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
    }
  } catch (error) {
    ElMessage.error('表单验证失败，请检查输入')
  } finally {
    loading.value = false
  }
}

const primaryRgb = '64, 158, 255' // 主题色的 RGB 值
document.documentElement.style.setProperty('--primary-rgb', primaryRgb)
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

.image-preview,
.video-preview {
  width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 4px;
  background-color: var(--bg-color-light);
}

.dark {
  .file-preview {
    background-color: var(--bg-color-light);
    border: 1px solid var(--border-color);
  }
  
  .image-preview,
  .video-preview {
    background-color: var(--bg-color-dark);
  }
  
  :deep(.el-upload-dragger) {
    background-color: var(--bg-color-dark);
    border-color: var(--border-color);
    
    &:hover {
      background-color: var(--bg-color-light);
      border-color: var(--primary-color);
    }
  }
  
  .upload-icon {
    color: var(--text-secondary);
  }
  
  .upload-text {
    color: var(--text-regular);
    
    .upload-tip {
      color: var(--text-secondary);
    }
  }
}

.fullscreen-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

.loading-content {
  text-align: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  padding: 32px 48px;
  border-radius: 16px;
  backdrop-filter: blur(4px);
}

.loading-icon {
  font-size: 56px;
  color: var(--primary-color);
  filter: drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.5));
  animation: rotate 1.5s linear infinite;
}

.loading-text {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 500;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* 暗色模式适配 */
.dark {
  .fullscreen-loading {
    background-color: rgba(0, 0, 0, 0.85);
  }

  .loading-content {
    color: var(--text-primary);
  }
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 8px;
}

.file-type {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-regular);
  font-weight: 500;
  
  .el-icon {
    font-size: 18px;
  }
}

.image-placeholder,
.image-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  background-color: var(--bg-color-dark);
  color: var(--text-secondary);
  
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
</style>