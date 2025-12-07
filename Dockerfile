FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制 Prisma schema
COPY prisma ./prisma/

# 生成 Prisma Client
RUN npx prisma generate

# 复制源代码
COPY . .

# 构建前端
RUN npm run build

# 创建必要目录
RUN mkdir -p server/db server/uploads logs

# 暴露端口
EXPOSE 3101

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3101

# 启动命令
CMD ["sh", "-c", "npx prisma db push && node server/index.js"]
