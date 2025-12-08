# syntax=docker/dockerfile:1
FROM node:18-alpine AS builder

# 设置 UTF-8 编码
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# 安装编译 better-sqlite3 所需的依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 先复制依赖文件（利用缓存）
COPY package*.json ./

# 使用缓存挂载加速 npm 安装
RUN --mount=type=cache,target=/root/.npm \
    npm ci

# 复制 Prisma schema 并生成 Client
COPY prisma ./prisma/
RUN npx prisma generate

# 复制源代码
COPY index.html vite.config.js tailwind.config.js postcss.config.js ./
COPY src ./src
COPY public ./public
COPY server ./server

# 构建前端
RUN npm run build

# ========== 生产阶段 ==========
FROM node:18-alpine

# 设置 UTF-8 编码
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# 安装编译 better-sqlite3 所需的依赖
RUN apk add --no-cache python3 make g++

WORKDIR /app

# 复制 package.json
COPY package*.json ./

# 使用缓存挂载加速 npm 安装
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# 复制 Prisma schema 并生成 Client
COPY prisma ./prisma/
RUN npx prisma generate

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public

# 创建必要目录
RUN mkdir -p server/db server/uploads logs

# 清理编译工具以减小镜像体积
RUN apk del python3 make g++ && rm -rf /var/cache/apk/*

# 暴露端口
EXPOSE 3101

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3101
ENV DATABASE_URL="file:/app/server/db/app.db"

# 启动命令
CMD ["sh", "-c", "npx prisma db push && node server/index.js"]
