# Genderize API Integration

A fast, lightweight Express REST API that classifies names by gender using the external Genderize API. It features input validation, confident checks, and robust error handling.

## Requirements
- Node.js
- npm

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. The server runs on `http://localhost:3000` by default.

## API Endpoints

### `GET /api/classify`
Classifies a name.

**Success Response (200 OK):**
Example Request: `/api/classify?name=peter`
```json
{
 "status": "success",
 "data": {
  "name": "peter",
  "gender": "male",
  "probability": 1,
  "sample_size": 1346866,
  "is_confident": true,
  "processed_at": "2026-04-13T23:00:33.399Z"
 }
}
```

**Missing Name Error (400 Bad Request):**
Example Request: `/api/classify`
```json
{
  "status": "error",
  "message": "Name parameter is required"
}
```

**Non-string Error (422 Unprocessable Entity):**
Example Request: `/api/classify?name[]=peter`
```json
{
  "status": "error",
  "message": "Name must be a string"
}
```

**Unknown Name (404 Not Found):**
Example Request: `/api/classify?name=zyxwvut`
```json
{
  "status": "error",
  "message": "No prediction available for the provided name"
}
```
