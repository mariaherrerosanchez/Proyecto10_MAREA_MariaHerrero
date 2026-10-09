FROM ghcr.io/astral-sh/uv:0.6.14 AS uv

FROM python:3.11.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app/backend

COPY --from=uv /uv /uvx /bin/

RUN groupadd --gid 10001 marea \
    && useradd --uid 10001 --gid marea --create-home --shell /usr/sbin/nologin marea

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY --chown=marea:marea app ./app
RUN chown -R marea:marea /app/backend

USER marea

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
  CMD ["python", "-c", "import urllib.request; response = urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2); assert response.status == 200"]

CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
