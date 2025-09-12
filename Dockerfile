# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml to the working directory
COPY package.json pnpm-lock.yaml ./

# Install any needed packages
RUN pnpm install

# Bundle app source
COPY . .

# Build the TypeScript code
RUN pnpm build

# Your app binds to port 3000, so you'll use the EXPOSE instruction
# EXPOSE 3000

CMD [ "pnpm", "start" ]
