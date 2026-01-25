FROM node:20-bookworm

# 필수 도구 설치
RUN apt-get update && apt-get install -y \
    git \
    curl \
    bash \
    # 네이티브 샌드박싱용
    bubblewrap \
    socat \
    && rm -rf /var/lib/apt/lists/*

# Bun 설치 (root)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Claude Code 설치
RUN npm install -g @anthropic-ai/claude-code

# node 사용자 홈 디렉토리 설정
RUN mkdir -p /home/node/.claude && chown -R node:node /home/node

# node 사용자로 전환
USER node
WORKDIR /workspaces/mypku

# Bun 설치 (node 사용자)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/home/node/.bun/bin:${PATH}"
