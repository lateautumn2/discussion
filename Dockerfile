# Nuxt 3 builder
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9 --activate

ARG VERSION

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# 安装构建依赖
RUN pnpm install --frozen-lockfile
ENV NODE_ENV=production

# 复制整个项目
COPY . .

# 生成Prisma客户端
RUN pnpm exec prisma generate

RUN echo $VERSION > /app/version


# 构建Nuxt应用
RUN pnpm run build

# Nuxt 3 production
FROM node:22-alpine
RUN apk add --no-cache openssl
RUN npm install --global prisma@5.22.0

WORKDIR /app

ARG VERSION

ENV NODE_ENV=production
ENV NUXT_JWT_SECRET_KEY="uIWcy5NE9M2wmh9"
ENV NUXT_PUBLIC_TOKEN_KEY="iPOJWvmRggSw9FU"
ENV NUXT_PUBLIC_AVATAR_CDN="https://gravatar.cooluc.com/avatar/"
ENV SIMPLE_DISCUSS_VERSION=$VERSION
ENV NUXT_UPLOAD_DIR=/app/upload

COPY --from=builder /app/.output /app/.output
COPY --from=builder /app/prisma /app/prisma
COPY --from=builder /app/version /app/version
COPY --from=builder /app/start.sh /app/start.sh
EXPOSE 3000

RUN chmod +x /app/start.sh
CMD /app/start.sh
