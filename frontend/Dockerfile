FROM node:20
WORKDIR /app
COPY package.json ./
# update Alpine packages to address OS-level vulnerabilities before installing Node deps
RUN apk update && apk upgrade --no-cache
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm","run","dev","--","--host","0.0.0.0"]
