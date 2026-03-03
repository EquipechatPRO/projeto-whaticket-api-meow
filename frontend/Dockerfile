FROM node:21.6.2 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --force

COPY . .
RUN npm run build

FROM node:21.6.2-alpine

WORKDIR /app

COPY --from=builder /app/build ./build
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/package*.json ./

RUN npm install --production --force

EXPOSE 3000

CMD ["node", "server.js"]
