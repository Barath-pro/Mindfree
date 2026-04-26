# Mindfree

Mindfree is a full-stack mental health chat platform with role-based access, real-time 1-to-1 messaging, AI-assisted moderation, and voice message transcription/moderation.

## Tech stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose
- Realtime: Socket.io
- AI services: Google Gemini moderation + audio transcription

## Project structure

```text
Mindfree/
|-- backend/
|   |-- .env.example
|   |-- package.json
|   `-- src/
|       |-- app.js
|       |-- server.js
|       |-- config/
|       |-- controllers/
|       |-- middleware/
|       |-- models/
|       |-- routes/
|       |-- services/
|       |-- socket/
|       |-- uploads/
|       `-- utils/
|-- frontend/
|   |-- .env.example
|   |-- index.html
|   |-- package.json
|   |-- vite.config.js
|   `-- src/
|       |-- api/
|       |-- components/
|       |-- context/
|       |-- hooks/
|       |-- pages/
|       `-- styles/
|-- .gitignore
|-- package.json
`-- README.md
```

## Features

- JWT-based registration and login for `patient` and `psychologist` roles
- Unique UUID chat IDs and message IDs
- Real-time 1-to-1 chat with Socket.io
- AI moderation on every message before delivery
- Risk-score decisioning:
  - `< 0.5`: allow
  - `0.5 - 0.8`: allow with warning
  - `> 0.8`: block
- Voice note upload, Gemini transcription, and moderation on transcribed text
- Warning counts, temporary message blocking, and user flag history tracking
- Moderation log persistence and user activity logging

## Setup

### 1. Install dependencies

From the repo root:

```bash
npm install
npm run install:all
```

### 2. Configure environment variables

Copy the example files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

On Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Fill in:

- `backend/.env`
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `GOOGLE_API_KEY`
  - `GOOGLE_CLIENT_ID` if you want Google account sign-in
- `frontend/.env`
  - `VITE_API_URL`
  - `VITE_SOCKET_URL`
  - `VITE_GOOGLE_CLIENT_ID` if you want Google account sign-in

### 3. Run the app in development

```bash
npm run dev
```

This starts:

- Backend on `http://localhost:5000`
- Frontend on `http://localhost:5173`

### 4. Production build

```bash
npm run build
```

Serve the React build from your preferred web server or platform, and run the backend with:

```bash
npm run start
```

## Deployment

### Recommended setup

- Deploy `frontend/` to Vercel
- Deploy `backend/` to a Node host that supports long-running processes and Socket.IO, such as Railway, Render, or Fly.io

This project uses Socket.IO for realtime chat. Vercel is a strong fit for the Vite frontend, but it is not a good fit for the current backend architecture because the chat server expects a persistent realtime connection.

### Frontend on Vercel

In Vercel project settings:

- Root directory: `frontend`
- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

Set these environment variables in the Vercel project:

- `VITE_API_URL=https://your-backend-domain/api`
- `VITE_SOCKET_URL=https://your-backend-domain`
- `VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com`

Client-side routes such as `/login`, `/register`, and `/chat` are handled by `frontend/vercel.json`.

### Backend on a Node host

Deploy the `backend/` folder to Railway, Render, Fly.io, or another host with WebSocket support.

Set these backend environment variables:

- `PORT=5000`
- `CLIENT_URL=https://your-frontend-domain.vercel.app`
- `MONGODB_URI=your-production-mongodb-uri`
- `JWT_SECRET=your-long-random-secret`
- `GOOGLE_API_KEY=your-google-api-key`
- `GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com`

For production, use a managed MongoDB instance such as MongoDB Atlas instead of the local development value `mongodb://127.0.0.1:27017/mindfree`.

## API overview

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Chats

- `GET /api/chats/contacts`
- `GET /api/chats`
- `POST /api/chats`
- `GET /api/chats/:chatId/messages`
- `POST /api/chats/:chatId/messages`
- `POST /api/chats/:chatId/voice`
- `GET /api/chats/safety/me`

### Moderation

- `GET /api/moderation/me`

### Socket events

Client emits:

- `join-chat`
- `send-message`

Server emits:

- `message:new`
- `message:warning`

## Security notes

- Passwords are hashed with bcrypt
- JWT auth protects HTTP routes and socket connections
- Input validation is enforced with `express-validator`
- Google API and database credentials are loaded from environment variables
- Helmet, CORS, JSON size limits, and upload limits are enabled

## Google Gemini integration notes

- Moderation defaults to `gemini-2.5-flash-lite`
- Audio transcription defaults to `gemini-2.5-flash-lite`

If you need to change models later, update the backend environment variables instead of editing application code.
