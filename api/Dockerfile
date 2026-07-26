FROM node:latest

WORKDIR /api

COPY package*.json .

RUN npm install

COPY . /api

RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
