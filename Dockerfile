FROM node:lts-alpine as production
WORKDIR /app
COPY package*.json ./
COPY .env ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV production
ENV production 1
EXPOSE 3000
EXPOSE 3001
CMD ["node", "main.js"]
