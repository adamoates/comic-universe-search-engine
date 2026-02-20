# Comic Universe Search Engine

A search engine for comic book characters and issues, powered by the Comic Vine API.

## Built with

- Node.js
- Express 5
- React 19
- Vite 6

## Features

- Search for characters (e.g. Spider-Man, Batman)
- Search for comic issues (e.g. Avengers, X-Men)
- View detailed character info, descriptions, and first appearances
- View comic issue details with cover art
- Paginated results

## Getting started

### 1. Get a Comic Vine API key

Visit [Comic Vine API](https://comicvine.gamespot.com/api/) and sign up for a free key.

### 2. Configure the API key

```bash
cp api/.env.example api/.env
```

Edit `api/.env` and add your key:

```
COMIC_VINE_API_KEY=your_key_here
```

### 3. Install and run

**Backend:**

```bash
cd api
npm install
node app.js
```

**Frontend:**

```bash
cd client
npm install
npm start
```

- API runs on http://localhost:4000
- Frontend runs on http://localhost:3000

## Docker

Build the project:

```bash
docker-compose build
```

Start the project:

```bash
docker-compose up
```

Start individual services:

```bash
docker-compose up -d app
docker-compose up -d client
```

Shutdown:

```bash
docker-compose down
```

## Attribution

Data provided by [Comic Vine](https://comicvine.gamespot.com/). Used for non-commercial purposes only.
