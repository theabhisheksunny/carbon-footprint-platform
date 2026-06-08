# Setup Guide

## Prerequisites
- Node.js 18+ installed
- npm or yarn

## Installation Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Server
```bash
npm start
```

Server will run at `http://localhost:3000`

### 3. Test the API
```bash
# Health check
curl http://localhost:3000/health

# View homepage
open http://localhost:3000
```

### 4. Run Demo Script
```bash
chmod +x demo.sh
./demo.sh
```

## Project Structure
```
├── src/
│   ├── database/       # In-memory DB & emission factors
│   ├── routes/         # API endpoints
│   └── server.js       # Express server
├── public/             # Static HTML
├── examples/           # Sample JSON files
├── demo.sh            # Interactive demo
└── API_DOCUMENTATION.md
```

## Quick Test

### Create User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d @examples/sample-user.json
```

### Browse Actions
```bash
curl http://localhost:3000/api/actions
```

## Troubleshooting

**Port already in use:**
```bash
PORT=3001 npm start
```

**Dependencies missing:**
```bash
rm -rf node_modules package-lock.json
npm install
```
