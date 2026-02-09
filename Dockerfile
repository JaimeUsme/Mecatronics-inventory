FROM mcr.microsoft.com/playwright:v1.40.0-jammy AS base

WORKDIR /app

# Install dependencies (including Playwright) first for better layer caching
COPY package*.json ./
RUN npm ci
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium

# Copy source and build
COPY . .
RUN npm run build

# Use the same Playwright image for runtime to keep browsers available
FROM mcr.microsoft.com/playwright:v1.40.0-jammy AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Copy only the build output and production deps
COPY --from=base /app/package*.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/dist ./dist
COPY --from=base /ms-playwright /ms-playwright

EXPOSE 8080
CMD ["node", "dist/main"]

