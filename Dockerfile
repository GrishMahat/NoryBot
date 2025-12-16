# Use official Bun image
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Install dependencies
# Copy package.json and bun.lock (if available)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the app (if needed, though Bun can run TS directly)
# Since the start script compiles, we can just use that, or compile here.
# The 'start' script in package.json does: "bun build ... && ./dist/nory-bot"
# Let's run the build step separately to cache it.
RUN bun run build

# Production image (optional, but good practice to keep it small if we were doing a multi-stage)
# For now, sticking to a single stage for simplicity as requested.

# Expose port (if needed, though discord bots usually don't bind ports unless for dashboard)
# EXPOSE 3000

# Start the bot
CMD [ "bun", "start:exec" ]