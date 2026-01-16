FROM python:3.11-slim
WORKDIR /app

# 从官方镜像安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 复制依赖文件并安装
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

# 复制源码
COPY . .

EXPOSE 8081
# 启动服务
CMD ["uv", "run", "python", "main.py"]