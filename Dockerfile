# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
ARG NEXT_PUBLIC_BASE_PATH=""
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app

ARG NEXT_PUBLIC_BASE_PATH=""

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
ENV VIRTUAL_ENV=/opt/webp-lab-venv
ENV PATH="${VIRTUAL_ENV}/bin:${PATH}"

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libgomp1 \
    libheif-examples \
    python3 \
    python3-venv \
    tini \
  && python3 -m venv "${VIRTUAL_ENV}" \
  && "${VIRTUAL_ENV}/bin/pip" install --no-cache-dir --upgrade pip \
  && "${VIRTUAL_ENV}/bin/pip" install --no-cache-dir "rembg[cpu]" \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD node -e "const base=(process.env.NEXT_PUBLIC_BASE_PATH||'').replace(/\\/$/,''); fetch(`http://127.0.0.1:${process.env.PORT||3000}${base}/api/health`).then((res)=>process.exit(res.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
