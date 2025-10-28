FROM node:20-slim
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Update OS packages to pick up security fixes, install node deps and attempt to fix npm audit issues
RUN apt-get update \
	&& apt-get upgrade -y \
	&& rm -rf /var/lib/apt/lists/* \
	&& npm ci \
	&& npm audit fix --only=prod || true

# Copy application source
COPY src ./src

EXPOSE 4000
CMD ["npm","run","dev"]
