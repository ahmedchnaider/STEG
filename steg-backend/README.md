# Backend Server

This is the backend server for the application.

## Project Structure

```
backend/
  ├── config/          # Configuration files
  ├── controllers/     # Controllers for handling business logic
  ├── middleware/      # Custom middleware functions
  ├── models/          # Data models
  ├── routes/          # API routes
  ├── utils/           # Utility helper functions
  ├── server.js        # Main server entry point
  └── package.json     # Project dependencies
```

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the development server:
   ```
   npm run dev
   ```

3. Start the production server:
   ```
   npm start
   ```

## API Routes

- `GET /` - Main route indicating the server is running
- `GET /api/status` - Status check endpoint

## Configuration

Server configuration can be found in the `config/config.js` file. 