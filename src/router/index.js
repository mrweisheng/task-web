import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'
import Login from '../views/Login.vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'

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
          path: 'create-normal-message',
          name: 'CreateNormalMessage',
          component: () => import('../views/CreateNormalMessage.vue'),
          meta: {
            title: '创建普通消息',
            requiresAuth: true
          }
        },
        {
          path: 'create-link-message',
          name: 'CreateLinkMessage',
          component: () => import('../views/CreateLinkMessage.vue'),
          meta: {
            title: '创建超链消息',
            requiresAuth: true
          }
        },
        {
          path: 'orders',
          name: 'Orders',
          component: () => import('../views/Orders.vue'),
          meta: {
            title: '我的订单',
            requiresAuth: true
          }
        }
      ]
    }
  ]
})

export default router 