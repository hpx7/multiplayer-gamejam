FROM node:16

WORKDIR /app

ARG APP_SECRET
ENV APP_SECRET=${APP_SECRET}

COPY . .
RUN npm install -g typescript
RUN cd server; npm install
RUN cd shared; npm install
RUN cd server; tsc

CMD ["node", "server/server.js"]
