FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4173

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# RSVPs live here — mount a persistent volume at /app/server/data
EXPOSE 4173

CMD ["node", "server/server.js"]
