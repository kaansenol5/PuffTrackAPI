# PuffTrack API Documentation

## Base URL
`http://localhost:3000` (assuming default port)

## Authentication
Most endpoints require authentication using a JWT token. Include the token in the `Authorization` header as follows:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### 1. Register User
- **URL**: `/register`
- **Method**: `POST`
- **Auth required**: No
- **Description**: Register a new user
- **Request body**:
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "user": {
        "id": "integer",
        "name": "string",
        "email": "string"
      },
      "token": "string"
    }
    ```
- **Error Response**:
  - **Code**: 400
  - **Content**: `{ "error": "Error message" }`

### 2. Login
- **URL**: `/login`
- **Method**: `POST`
- **Auth required**: No
- **Description**: Authenticate a user and receive a JWT token
- **Request body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "user": {
        "id": "integer",
        "name": "string",
        "email": "string"
      },
      "token": "string"
    }
    ```
- **Error Response**:
  - **Code**: 401
  - **Content**: `{ "error": "Invalid credentials" }`

### 3. Create Puff
- **URL**: `/puff`
- **Method**: `POST`
- **Auth required**: Yes
- **Description**: Record a new puff for the authenticated user
- **Request body**:
  ```json
  {
    "timestamp": "ISO8601 date string"
  }
  ```
- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "id": "integer",
      "timestamp": "ISO8601 date string",
      "userId": "integer"
    }
    ```
- **Error Response**:
  - **Code**: 400
  - **Content**: `{ "error": "Error message" }`

### 4. Get Puffs
- **URL**: `/puffs`
- **Method**: `GET`
- **Auth required**: Yes
- **Description**: Retrieve all puffs for the authenticated user
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "id": "integer",
        "timestamp": "ISO8601 date string",
        "userId": "integer"
      }
    ]
    ```
- **Error Response**:
  - **Code**: 500
  - **Content**: `{ "error": "Error retrieving puffs" }`

### 5. Add Friend
- **URL**: `/friends/add`
- **Method**: `POST`
- **Auth required**: Yes
- **Description**: Send a friend request to another user
- **Request body**:
  ```json
  {
    "friendId": "integer"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: `{ "message": "Friend request sent" }`
- **Error Responses**:
  - **Code**: 404
  - **Content**: `{ "error": "User not found" }`
  - **Code**: 400
  - **Content**: `{ "error": "Friend request already sent" }`

### 6. Remove Friend
- **URL**: `/friends/remove`
- **Method**: `POST`
- **Auth required**: Yes
- **Description**: Remove a friend or cancel a friend request
- **Request body**:
  ```json
  {
    "friendId": "integer"
  }
  ```
- **Success Response**:
  - **Code**: 200
  - **Content**: `{ "message": "Friend removed" }`
- **Error Response**:
  - **Code**: 404
  - **Content**: `{ "error": "Friend relationship not found" }`

### 7. Get Friends
- **URL**: `/friends`
- **Method**: `GET`
- **Auth required**: Yes
- **Description**: Retrieve the list of friends for the authenticated user
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "id": "integer",
        "name": "string",
        "email": "string",
        "status": "string" // "pending" or "accepted"
      }
    ]
    ```
- **Error Response**:
  - **Code**: 500
  - **Content**: `{ "error": "Error retrieving friends" }`

### 8. Get User Data
- **URL**: `/me`
- **Method**: `GET`
- **Auth required**: Yes
- **Description**: Retrieve all relevant data for the authenticated user
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "id": "integer",
      "name": "string",
      "email": "string",
      "friends": [
        {
          "id": "integer",
          "name": "string",
          "email": "string",
          "status": "string", // "pending" or "accepted"
          "isMutual": "boolean"
        }
      ],
      "puffs": [
        {
          "id": "integer",
          "timestamp": "ISO8601 date string"
        }
      ]
    }
    ```
- **Error Response**:
  - **Code**: 404
  - **Content**: `{ "error": "User not found" }`

### 9. Debug (Development Only)
- **URL**: `/debug`
- **Method**: `GET`
- **Auth required**: No
- **Description**: Retrieve all users and their puffs (for development purposes only)
- **Success Response**:
  - **Code**: 200
  - **Content**: Array of all users with their associated puffs
- **Error Response**:
  - **Code**: 500
  - **Content**: `{ "error": "Error retrieving debug data" }`

## Error Handling
- All endpoints may return a 500 Internal Server Error if an unexpected error occurs.
- Authenticated routes will return a 401 Unauthorized error if the JWT token is missing, invalid, or expired.

## Data Models

### User
- id: integer (auto-generated)
- name: string
- email: string (unique)
- password: string (hashed)

### Puff
- id: integer (auto-generated)
- timestamp: date
- userId: integer (foreign key to User)

### Friend
- id: integer (auto-generated)
- userId: integer (foreign key to User)
- friendId: integer (foreign key to User)
- status: enum ("pending", "accepted")

## Notes
- The API uses JWT for authentication. Tokens are issued upon successful registration and login.
- Friend requests are initially created with a "pending" status and must be accepted to change to "accepted" status.
- The `/debug` endpoint should be disabled or protected in a production environment.
