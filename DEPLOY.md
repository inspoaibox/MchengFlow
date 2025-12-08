# MchengFlow 部署指南

## 系统功能

- 多用户项目管理系统（首个注册用户自动成为管理员）
- 看板式任务管理（四象限/列表视图）
- AI 智能助手（支持 OpenAI / Gemini / 兼容 API）
- 任务附件上传、标签、负责人管理
- 深色模式、任务搜索、统计仪表盘
- PWA 支持、任务提醒通知
- 数据备份与导入

## 环境要求

- Node.js 18+
- npm 或 yarn

## 快速部署

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

```bash
npm run db:generate
npm run db:push
```

### 3. 构建前端

```bash
npm run build
```

### 4. 启动生产服务器

```bash
# Windows
set NODE_ENV=production && npm start

# Linux/Mac
NODE_ENV=production npm start
```

服务将运行在 `http://localhost:3101`

---

## 一键部署命令

```bash
npm run deploy && set NODE_ENV=production && npm start
```

---

## 使用 PM2 部署（推荐）

### 安装 PM2

```bash
npm install -g pm2
```

### 启动服务

```bash
# 构建
npm run deploy

# 使用 PM2 启动
pm2 start ecosystem.config.cjs
```

### PM2 常用命令

```bash
pm2 status          # 查看状态
pm2 logs mchengflow # 查看日志
pm2 restart all     # 重启服务
pm2 stop all        # 停止服务
pm2 delete all      # 删除服务
pm2 save            # 保存进程列表
pm2 startup         # 设置开机自启
```

---

## Docker 部署

### 方式一：使用 Docker Compose（推荐）

项目已包含 `docker-compose.yml`，直接运行：

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重新构建（代码更新后）
docker-compose up -d --build
```

### 方式二：手动构建运行

```bash
# 构建镜像
docker build -t mchengflow .

# 运行容器
docker run -d \
  --name mchengflow \
  -p 3101:3101 \
  -v mchengflow-db:/app/server/db \
  -v mchengflow-uploads:/app/server/uploads \
  -e JWT_SECRET=your-secret-key \
  --restart unless-stopped \
  mchengflow
```

### Docker 常用命令

```bash
docker logs mchengflow          # 查看日志
docker logs -f mchengflow       # 实时查看日志
docker restart mchengflow       # 重启容器
docker stop mchengflow          # 停止容器
docker start mchengflow         # 启动容器
docker rm mchengflow            # 删除容器
```

---

## Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3101;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        
        # 文件上传大小限制
        client_max_body_size 50M;
    }
}
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | 3101 |
| `NODE_ENV` | 环境模式 | development |
| `JWT_SECRET` | JWT密钥 | 内置默认值 |

---

## 目录结构

```
mchengflow/
├── dist/              # 前端构建输出
├── server/
│   ├── db/
│   │   └── app.db     # SQLite 数据库文件
│   ├── uploads/       # 附件上传目录
│   └── index.js       # 服务器入口
├── prisma/
│   └── schema.prisma  # 数据库模型
└── package.json
```

---

## 数据备份

### 备份数据库

```bash
cp server/db/app.db server/db/app.db.backup
```

### 备份附件

```bash
cp -r server/uploads server/uploads.backup
```

---

## 首次使用

1. 访问 `http://localhost:3101`
2. 注册第一个账号（自动成为管理员）
3. 进入后台管理配置 AI 渠道
4. 开始使用

---

## 故障排查

### 端口被占用

```bash
# Windows
netstat -ano | findstr :3101

# Linux/Mac
lsof -i :3101
```

### 数据库错误

```bash
# 重新生成 Prisma Client
npm run db:generate

# 同步数据库结构
npm run db:push
```

### 权限问题

确保以下目录有写入权限：
- `server/db/`
- `server/uploads/`
