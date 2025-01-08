import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import Login from '../views/Login.vue'

const router = createRouter({
  history: createWebHistory('/task-web/'),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: {
        title: '登录'
      }
    },
    {
      path: '/',
      component: MainLayout,
      children: [
        {
          path: '',
          redirect: '/dashboard'
        },
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('../views/Dashboard.vue'),
          meta: {
            title: '我的面板',
            requiresAuth: true
          }
        },
        {
          path: 'tasks',
          name: 'Tasks',
          component: () => import('../views/Tasks.vue'),
          meta: {
            title: '我的任务',
            requiresAuth: true
          }
        },
        {
          path: 'create-task',
          name: 'CreateTask',
          component: () => import('../views/CreateTask.vue'),
          meta: {
            title: '创建任务',
            requiresAuth: true
          }
        }
      ]
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 任务管理平台` : '任务管理平台'
  
  // 检查是否需要登录
  if (to.matched.some(record => record.meta.requiresAuth)) {
    const token = sessionStorage.getItem('token')
    if (!token) {
      next({
        path: '/login',
        query: { redirect: to.fullPath }
      })
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router 