# Security fix (F-13): supported Node version, exact dependency versions, no dev tools,
# and the app runs as the unprivileged "node" user instead of root.
FROM node:25-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node backend/ ./backend/
USER node
EXPOSE 5000
CMD ["node", "backend/server.js"]
