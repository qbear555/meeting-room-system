# Multi-stage build for Meeting Room Booking System
FROM node:22-alpine AS builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3849
ENV DB_TYPE=sqlite
ENV DB_PATH=/app/data/meeting_room.db

WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./

# Copy built frontend assets to server
COPY --from=builder /app/frontend/dist /app/frontend/dist

VOLUME ["/app/data"]
EXPOSE 3849

CMD ["node", "index.js"]
