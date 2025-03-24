# task-web

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

## Nginx部署说明

### 配置注意事项

1. 项目的基础路径设置：
   - 在`vite.config.js`中设置了`base: '/task-web/'`
   - 在路由配置中设置了`history: createWebHistory('/task-web/')`

2. Nginx配置要点：
   - 确保`/task-web/`路径的location块优先级高于根路径规则
   - 使用`try_files $uri $uri/ /task-web/index.html`确保SPA正确路由
   - 常见问题：如果访问`/task-web/`被重定向到错误路径，检查location块顺序和优先级

3. 配置示例：
```nginx
# task-web 部分 - 需放在根路径规则前面提高优先级
location /task-web/ {
    alias /var/www/task-web/dist/;
    index index.html;
    try_files $uri $uri/ /task-web/index.html;
}
```

4. 重载Nginx配置：
```
sudo nginx -t  # 测试配置
sudo systemctl reload nginx  # 重新加载配置
```
