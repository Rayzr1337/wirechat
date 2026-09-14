# wirechat

A real-time chat application supporting group rooms and private (1-to-1) messaging, built with a horizontally-scalable WebSocket backend.

## Tech stack

| Layer          | Technology                          |
|----------------|--------------------------------------|
| Backend        | Node.js, Express, ws                |
| Database       | PostgreSQL (Prisma)             |
| Cache / Pub-Sub| Redis                                |
| Auth           | JWT                                  |
| Frontend       | Vite, React, TailwindCSS            |
| Reverse Proxy  | Nginx                                |
| Orchestration  | Docker Compose                       |
| Email          | Brevo (prod), Mailhog (dev)          |

## Architecture

```
React Client (Vite build)
        │
        ▼
      Nginx
        │
        ▼
Node.js (Express + ws)
        │
   ┌────┼────┐
   ▼    ▼    ▼
Postgres Redis  Email Service
```

## Project structure

```
.
├── client/          # Vite + React + Tailwind UI
├── server/          # Node + Express + ws backend
├── nginx/           # Reverse proxy configuration
├── docker-compose.yml
└── README.md
```