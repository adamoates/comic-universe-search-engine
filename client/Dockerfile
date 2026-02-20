FROM node:latest

WORKDIR /comics

COPY package*.json .

RUN npm install

COPY . /comics

EXPOSE 3000

CMD [ "npm", "start"]
