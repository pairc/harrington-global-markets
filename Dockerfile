# Harrington Global Markets — zero-dependency Node server
FROM node:20-alpine
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
COPY data ./data
RUN mkdir -p /app/data/last_good && chown -R node:node /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "server.js"]
