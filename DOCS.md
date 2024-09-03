# PuffTrack API Documentation

## Base URL
All API requests should be made to: `http://localhost:3000`

## Authentication
Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### User Management

#### Register a New User
- **URL**: `/register`
- **Method**: `POST`
- **Auth required**: No
- **Data constraints**:
```json
{
  "name": "[valid name]",
  "email": "[valid email address]",
  "password": "[password in plain text]"
}
```
- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "token": "[JWT token]"
    }
    ```
- **Error Response**:
  - **Code**: 400
  - **Content**: `{ "error": "[error message]" }`

#### User Login
- **URL**: `/login`
- **Method**: `POST`
- **Auth required**: No
- **Data constraints**:
```json
{
  "email": "[valid email address]",
  "password": "[password in plain text]"
}
```
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    {
      "user": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "token": "[JWT token]"
    }
    ```
- **Error Response**:
  - **Code**: 401
  - **Content**: `{ "error": "Invalid login credentials" }`

### Puff Management

#### Record a Puff
- **URL**: `/puff`
- **Method**: `POST`
- **Auth required**: Yes
- **Data constraints**: None (empty body)
- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "id": 1,
      "timestamp": "2024-09-03T16:06:37.242Z",
      "UserId": 1
    }
    ```
- **Error Response**:
  - **Code**: 401
  - **Content**: `{ "error": "Please authenticate." }`

#### Get User's Puffs
- **URL**: `/puffs`
- **Method**: `GET`
- **Auth required**: Yes
- **URL Params**:
  - Optional: `userId=[integer]`
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "id": 1,
        "timestamp": "2024-09-03T16:06:37.242Z",
        "UserId": 1
      },
      // ... more puffs
    ]
    ```
- **Error Response**:
  - **Code**: 401
  - **Content**: `{ "error": "Please authenticate." }`
  - **Code**: 403
  - **Content**: `{ "error": "Not authorized to view this user's puffs" }`

### Friend Management

#### Add a Friend
- **URL**: `/friends/add`
- **Method**: `POST`
- **Auth required**: Yes
- **Data constraints**:
```json
{
  "friendId": "[valid user id]"
}
```
- **Success Response**:
  - **Code**: 201
  - **Content**:
    ```json
    {
      "message": "Friend request sent",
      "status": "pending"
    }
    ```
    or
    ```json
    {
      "message": "Friendship accepted",
      "status": "accepted"
    }
    ```
- **Error Response**:
  - **Code**: 400
  - **Content**: `{ "error": "Cannot add yourself as a friend" }`
  - **Code**: 404
  - **Content**: `{ "error": "Friend not found" }`

#### Remove a Friend
- **URL**: `/friends/remove`
- **Method**: `POST`
- **Auth required**: Yes
- **Data constraints**:
```json
{
  "friendId": "[valid user id]"
}
```
- **Success Response**:
  - **Code**: 200
  - **Content**: `{ "message": "Friend removed successfully" }`
- **Error Response**:
  - **Code**: 404
  - **Content**: `{ "error": "Friend not found" }`

#### Get Friends List
- **URL**: `/friends`
- **Method**: `GET`
- **Auth required**: Yes
- **Success Response**:
  - **Code**: 200
  - **Content**:
    ```json
    [
      {
        "id": 2,
        "name": "Jane Doe",
        "email": "jane@example.com",
        "status": "accepted",
        "isMutual": true
      },
      // ... more friends
    ]
    ```
- **Error Response**:
  - **Code**: 401
  - **Content**: `{ "error": "Please authenticate." }`

### Debug (Development Only)

#### Get All Data
- **URL**: `/debug`
- **Method**: `GET`
- **Auth required**: No
- **Success Response**:
  - **Code**: 200
  - **Content**: JSON object containing all users, friends, and puffs data
- **Note**: This endpoint should be disabled or secured in production environments.

## Error Handling

All endpoints may return the following error responses:

- **Code**: 500
- **Content**: `{ "error": "Internal server error" }`

- **Code**: 401
- **Content**: `{ "error": "Please authenticate." }`

## Notes

- All timestamps are in ISO 8601 format.
- The JWT token provided upon login should be included in the Authorization header for authenticated requests.
- Friend requests are automatically accepted if both users have added each other.
- Users can only view puffs of their accepted friends.
- The debug endpoint should not be accessible in production environments.
