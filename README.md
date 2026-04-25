# Distributed Chat System

This project runs four services:
- API server on port 1234
- Socket server on port 4000
- Presence service on port 5000
- React client (Vite)

## Prerequisites
- Node.js and npm
- MongoDB running locally on 127.0.0.1:27017

## Install dependencies
From the project root:

npm install

## Run everything with one command
From the project root:

npm run dev:all

This starts:
- server
- socket-server
- presence-service
- client/client

## Useful URLs
- Frontend: http://localhost:5173
- System health: http://localhost:1234/api/system/health
- Socket health: http://localhost:4000/health
- Presence health: http://localhost:5000/health

## Optional: run each service separately
From the project root:

npm run dev:server
npm run dev:socket
npm run dev:presence
npm run dev:client
