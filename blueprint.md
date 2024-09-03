# PuffTrack Backend Blueprint

## 1. Technology Stack

- **Server**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Real-time Communication**: Socket.IO
- **Authentication**: JSON Web Tokens (JWT) for API, Sign in with Apple for iOS
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest for unit and integration tests
- **Deployment**: Docker for containerization, AWS ECS or Heroku for hosting

## 2. Architecture Overview

- RESTful API for non-real-time operations
- WebSocket server for real-time puff tracking and notifications
- Microservices architecture for scalability:
  - Authentication Service
  - User Service
  - Puff Tracking Service
  - Analytics Service
  - Notification Service

## 3. Data Models

1. User
   - ID
   - Apple User ID
   - Email (if provided)
   - Name (if provided)
   - Created At
   - Last Login

2. PuffRecord
   - ID
   - User ID
   - Timestamp
   - Device ID

3. UserStats
   - User ID
   - Daily Puff Count
   - Weekly Puff Count
   - Monthly Puff Count
   - Streak Days

4. FriendConnection
   - User ID 1
   - User ID 2
   - Connection Date

## 4. API Endpoints

1. Authentication
   - POST /auth/apple - Verify Sign in with Apple token
   - POST /auth/refresh - Refresh JWT

2. User Management
   - GET /users/me - Get current user profile
   - PUT /users/me - Update user profile
   - GET /users/stats - Get user stats

3. Puff Tracking
   - POST /puffs - Record a new puff
   - GET /puffs - Get puff history

4. Friend Management
   - POST /friends/request - Send friend request
   - PUT /friends/accept - Accept friend request
   - GET /friends - Get friend list
   - GET /friends/leaderboard - Get friend leaderboard

## 5. WebSocket Events

- 'puff' - Emit when user takes a puff
- 'friendPuff' - Broadcast to friends when a puff is taken
- 'statsUpdate' - Emit updated stats to user

## 6. Background Jobs

- Daily stats calculation
- Streak updates
- Data aggregation for analytics

## 7. Security Measures

- HTTPS for all communications
- JWT for API authentication
- Rate limiting to prevent abuse
- Input validation and sanitization
- DeviceCheck API integration for iOS device verification

## 8. Scalability Considerations

- Horizontal scaling of microservices
- Caching layer (Redis) for frequently accessed data
- Database indexing for query optimization
- Load balancing for distributed traffic

## 9. Analytics and Monitoring

- Implement logging (e.g., Winston, Morgan)
- Set up monitoring and alerting (e.g., Prometheus, Grafana)
- Integrate error tracking (e.g., Sentry)

## 10. Development Workflow

- Version control with Git
- CI/CD pipeline (e.g., GitHub Actions, Jenkins)
- Code linting and formatting (ESLint, Prettier)
- Code reviews and pull request process

## 11. Third-party Integrations

- Sign in with Apple
- DeviceCheck API
- (Potential) Push notification services

## 12. Compliance and Legal Considerations

- GDPR compliance for EU users
- CCPA compliance for California users
- Clear privacy policy and terms of service

## 13. Costs and Payments

- AWS or Heroku hosting costs
- MongoDB Atlas for database hosting
- Apple Developer Program annual fee ($99/year)
- Potential costs for additional services (error tracking, monitoring, etc.)

## 14. Future Considerations

- Implement caching strategy
- Set up a CDN for static assets if expanding to web
- Consider implementing GraphQL for more flexible data querying
- Explore machine learning for personalized insights
