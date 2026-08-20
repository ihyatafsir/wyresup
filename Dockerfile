FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5195
ENV PORT=5195 NODE_ENV=production
CMD ["node", "server.js"]
