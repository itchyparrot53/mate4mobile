FROM node:24-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server.js lib.js activity.js insights.js ./
COPY --chown=node:node public ./public
COPY --chown=node:node scripts/doctor.cjs ./scripts/doctor.cjs
USER node
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8099
EXPOSE 8099
HEALTHCHECK --interval=30s --timeout=8s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:8099/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
