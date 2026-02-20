# Comic Universe Search Engine

A search engine for comic book characters and issues, powered by the Comic Vine API.

## Built with

---

Node.js
Express
React

## Comic Vine API

---

Visit the link to create a free Comic Vine API key

[Comic Vine API](https://comicvine.gamespot.com/api/)

1. Create `api/.env` with your key: `COMIC_VINE_API_KEY=your_key_here`
2. See `api/.env.example` for reference

## Docker commands

---
Docker command to build the project

```docker-compose build```

Docker command to start the project

```docker-compose up```

Docker command to build the api

```docker-compose up -d app```

Docker command to build the frontend

```docker-compose up -d client```

Docker command to shutdown the project

```docker-compose down```
