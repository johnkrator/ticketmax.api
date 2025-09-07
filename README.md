# TicketMax API 🎫

A comprehensive event ticketing platform built with NestJS, featuring advanced security, AI-powered customer support, dual payment gateway integration, and real-time capabilities.

![NestJS](https://img.shields.io/badge/nestjs-%23E0234E.svg?style=for-the-badge&logo=nestjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-%234ea94b.svg?style=for-the-badge&logo=mongodb&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=JSON%20web%20tokens)

## 🚀 Features

### 🎯 Core Functionality
- **Event Management** - Create, update, and manage events with categories, pricing, and scheduling
- **Advanced Booking System** - Complete ticket booking with guest support and user management
- **Dual Payment Gateway** - Integrated Paystack and Flutterwave payment processing
- **Organizer Onboarding** - Multi-step verification process with document upload
- **Admin Dashboard** - Comprehensive administrative controls and analytics
- **OAuth Integration** - Single Sign-On with Google, GitHub, Facebook, and Apple

### 🤖 AI-Powered Customer Support
- **Custom AI Agent** - Built-in intelligent assistant (no API costs required)
- **Intent Classification** - Automatic categorization of user queries
- **Coding Assistance** - Help with JavaScript/TypeScript, React, NestJS, and more
- **Contextual Responses** - Personalized replies based on conversation history
- **Multi-Language Support** - Programming help across various frameworks
- **Fallback to Claude API** - Optional external AI with graceful degradation

### 🔒 Security & Performance
- **Rate Limiting** - Multi-tier throttling protection against abuse
- **Brute Force Protection** - Advanced authentication security with IP blocking
- **Intelligent Caching** - Redis-powered caching with invalidation strategies
- **Security Headers** - Comprehensive HTTP security configuration
- **Input Validation** - Strict validation using class-validator and DTOs
- **Session Management** - Secure JWT with refresh token support

### 📱 Communication & Real-time
- **Email Notifications** - Automated email system with templates
- **SMS Integration** - Twilio-powered notifications
- **WebSocket Support** - Real-time chat and notifications
- **Event Broadcasting** - Live updates for bookings and events

### 💾 Data Management
- **MongoDB Integration** - Scalable NoSQL database with Mongoose ODM
- **Cloud Storage** - Cloudinary integration for media management
- **Background Jobs** - Automated cleanup and maintenance tasks
- **Cron Scheduling** - Automated booking cleanup and notifications

## 📋 Table of Contents

- [🚀 Quick Start](#quick-start)
- [🛠 Installation](#installation)
- [⚙️ Configuration](#configuration)
- [🤖 AI Chat System](#ai-chat-system)
- [💳 Payment Integration](#payment-integration)
- [📡 API Documentation](#api-documentation)
- [🏗️ Architecture](#architecture)
- [🔒 Security Features](#security-features)
- [⚡ Performance Optimization](#performance-optimization)
- [🧪 Testing](#testing)
- [🚀 Deployment](#deployment)
- [📚 Documentation](#documentation)

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+ recommended)
- **MongoDB** (v5.0+)
- **Redis** (optional, for advanced caching)
- **npm** or **yarn**

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ticketmax.api
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit your environment variables
nano .env
```

**Essential Environment Variables:**
```env
# Database
MONGODB_URI=mongodb://localhost:27017/ticketmax

# JWT
JWT_SECRET=your-secret-key

# Payment Gateways
PAYSTACK_SECRET_KEY=sk_test_your_paystack_key
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your-flutterwave-key

# AI Configuration (Optional)
CLAUDE_API_KEY=your-claude-api-key-here

# Frontend
FRONTEND_URL=http://localhost:3000

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 4. Start Services
```bash
# Start MongoDB (if running locally)
mongod

# Start Redis (optional)
redis-server

# Start the application in development mode
npm run start:dev
```

### 5. Access the API
- **API Base URL**: `http://localhost:3500`
- **Swagger Documentation**: `http://localhost:3500/api`
- **Health Check**: `http://localhost:3500/health`
- **AI Chat WebSocket**: `ws://localhost:3500/chat`

## 🛠 Installation

### Development Setup
```bash
# Install dependencies
npm install

# Install development tools globally
npm install -g @nestjs/cli

# Start in development mode with hot reload
npm run start:dev

# Run linting
npm run lint

# Run tests
npm run test
```

### Database Setup
```bash
# MongoDB with Docker
docker run -d \
  --name ticketmax-mongo \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  mongo:latest

# Redis with Docker (recommended for production)
docker run -d \
  --name ticketmax-redis \
  -p 6379:6379 \
  redis:alpine
```

### Docker Compose Setup
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## ⚙️ Configuration

### Environment Variables

#### Core Configuration
```env
# Application
PORT=3500
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/ticketmax

# Security
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key-32-chars

# Frontend
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3500
```

#### Payment Gateways
```env
# Paystack
PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
PAYSTACK_WEBHOOK_SECRET=your_webhook_secret_here

# Flutterwave
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-your-public-key
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-your-secret-key
FLUTTERWAVE_ENCRYPTION_KEY=FLWSECK_TEST-your-encryption-key
FLUTTERWAVE_WEBHOOK_SECRET=your_webhook_secret
```

#### OAuth Providers
```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3500/auth/google/callback

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Apple OAuth
APPLE_CLIENT_ID=your-apple-service-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key here\n-----END PRIVATE KEY-----"
```

#### AI Configuration
```env
# Claude API (Optional - Custom AI works without this)
CLAUDE_API_KEY=your_claude_api_key_here

# Application Settings
SCHEDULER_ENABLED=true
BOOKING_TIMEOUT_MINUTES=10
```

## 🤖 AI Chat System

The TicketMax API includes a sophisticated AI-powered customer support system with dual-agent architecture:

### Custom AI Agent (Primary)
- **Zero Cost**: Operates without external API dependencies
- **Intent Recognition**: Advanced NLP for query classification
- **Coding Assistance**: Support for JavaScript, TypeScript, React, NestJS, MongoDB
- **Context Awareness**: Maintains conversation history and user preferences
- **Knowledge Base**: Pre-loaded with TicketMax-specific information

### Claude API Integration (Fallback)
- **Professional Backup**: Falls back to Claude when needed
- **Seamless Transition**: Transparent switching between agents
- **API Key Required**: Optional for enhanced capabilities

### AI Features
```typescript
// Intent Classification
{
  "intent": "booking_inquiry",
  "confidence": 0.89,
  "entities": ["event", "tickets"],
  "category": "booking"
}

// Coding Help Example
User: "How do I create an async function in JavaScript?"
AI: "Here's a JavaScript example for async function with error handling:

```javascript
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user data:', error);
    throw error;
  }
}
```

**Explanation:** This async function fetches user data with proper error handling and HTTP status checking."
```

### WebSocket Chat Integration
```javascript
// Connect to chat
const socket = io('ws://localhost:3500/chat');

// Send message
socket.emit('sendMessage', {
  sessionId: 'user-session-id',
  content: 'I need help with booking tickets',
  sender: 'user'
});

// Receive AI response
socket.on('aiResponse', (data) => {
  console.log('AI Response:', data.content);
  console.log('Suggestions:', data.suggestions);
});
```

## 💳 Payment Integration

### Dual Gateway Support
The API supports both Paystack and Flutterwave payment gateways with automatic failover:

#### Payment Flow
1. **Initiate Payment**: Client requests payment initialization
2. **Gateway Selection**: System selects optimal gateway
3. **Payment Processing**: Secure transaction handling
4. **Webhook Verification**: Real-time payment status updates
5. **Booking Confirmation**: Automatic ticket generation

#### API Endpoints
```bash
# Initialize Payment
POST /payment/initialize
{
  "amount": 5000,
  "email": "user@example.com",
  "bookingId": "booking-id",
  "gateway": "paystack" // or "flutterwave"
}

# Verify Payment
GET /payment/verify/:reference

# Webhook Handler
POST /payment/webhook/paystack
POST /payment/webhook/flutterwave
```

## 📡 API Documentation

### Core Endpoints

#### Authentication
```bash
# Register User
POST /auth/register
{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /auth/login
{
  "email": "user@example.com",
  "password": "securePassword123"
}

# OAuth Login
GET /auth/google
GET /auth/github
GET /auth/facebook
GET /auth/apple
```

#### Events
```bash
# Get All Events
GET /events?page=1&limit=10&category=concert

# Get Event Details
GET /events/:id

# Create Event (Organizer only)
POST /events
{
  "title": "Summer Concert",
  "description": "Amazing summer concert",
  "date": "2024-07-15T19:00:00.000Z",
  "venue": "Central Park",
  "category": "concert",
  "ticketTypes": [
    {
      "name": "General Admission",
      "price": 5000,
      "quantity": 100
    }
  ]
}
```

#### Bookings
```bash
# Create Booking
POST /bookings
{
  "eventId": "event-id",
  "ticketTypeId": "ticket-type-id",
  "quantity": 2,
  "userDetails": {
    "email": "guest@example.com",
    "firstName": "Jane",
    "lastName": "Smith"
  }
}

# Get User Bookings
GET /bookings/my-bookings

# Get Booking Details
GET /bookings/:id
```

#### AI Chat
```bash
# Create Chat Session
POST /ai-chat/sessions
{
  "userId": "user-id"
}

# Send Message
POST /ai-chat/sessions/:sessionId/messages
{
  "content": "I need help booking tickets",
  "sender": "user"
}

# Get Chat History
GET /ai-chat/sessions/:sessionId/messages?page=1&limit=50
```

### Swagger Documentation
Access comprehensive API documentation at `/api` when the server is running.

## 🏗️ Architecture

### Project Structure
```
src/
├── configurations/           # App configuration
│   ├── cache-config/        # Redis caching setup
│   ├── database-config/     # MongoDB configuration
│   └── jwt_configuration/   # JWT security config
├── modules/                 # Feature modules
│   ├── auth/               # Authentication & OAuth
│   ├── user/               # User management
│   ├── event/              # Event management
│   ├── booking/            # Booking system
│   ├── payment/            # Payment processing
│   ├── dashboard/          # Admin dashboard
│   ├── organizer/          # Organizer management
│   ├── ai-chat/            # AI chat system
│   │   ├── AiAgent/        # Custom AI implementation
│   │   │   ├── core/       # AI engine
│   │   │   ├── knowledge/  # Knowledge base
│   │   │   ├── nlp/        # NLP processing
│   │   │   ├── utils/      # AI utilities
│   │   │   └── interfaces/ # Type definitions
│   │   └── claude.service.ts # Claude API integration
│   └── notification/       # Email/SMS notifications
├── shared/                 # Shared utilities
├── guards/                 # Route guards
├── interceptors/          # Request interceptors
└── main.ts               # Application entry point
```

### Design Patterns
- **Module Pattern**: Feature-based module organization
- **Repository Pattern**: Data access abstraction
- **Strategy Pattern**: Payment gateway selection
- **Observer Pattern**: Event-driven notifications
- **Singleton Pattern**: Service instances
- **Factory Pattern**: Dynamic service creation

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure stateless authentication
- **Refresh Tokens**: Extended session management
- **Role-Based Access Control**: Fine-grained permissions
- **OAuth Integration**: Social login support
- **Session Management**: Secure session handling

### Protection Mechanisms
- **Rate Limiting**: Request throttling per IP/user
- **Brute Force Protection**: Login attempt monitoring
- **CORS Configuration**: Cross-origin request handling
- **Input Validation**: DTO-based request validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content sanitization

### Monitoring & Logging
- **Request Logging**: Comprehensive request tracking
- **Error Logging**: Detailed error reporting
- **Security Events**: Authentication attempt logging
- **Performance Metrics**: Response time monitoring

For detailed security implementation, see [docs/CACHING_AND_SECURITY.md](docs/CACHING_AND_SECURITY.md)

## ⚡ Performance Optimization

### Caching Strategy
- **Redis Integration**: Distributed caching
- **Intelligent Invalidation**: Smart cache management
- **Multi-tier Caching**: Application and database level
- **Session Caching**: User session optimization

### Database Optimization
- **MongoDB Indexing**: Optimized query performance
- **Connection Pooling**: Efficient connection management
- **Aggregation Pipelines**: Complex query optimization
- **Document Validation**: Schema enforcement

### Background Processing
- **Cron Jobs**: Scheduled task execution
- **Event Cleanup**: Automated maintenance
- **Email Queuing**: Asynchronous email processing
- **Booking Management**: Automated booking lifecycle

For detailed performance configuration, see [docs/BACKGROUND_SERVICES_DOCUMENTATION.md](docs/BACKGROUND_SERVICES_DOCUMENTATION.md)

## 🧪 Testing

### Test Setup
```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch
```

### Testing Strategy
- **Unit Tests**: Individual component testing
- **Integration Tests**: Module interaction testing
- **E2E Tests**: Complete workflow testing
- **API Testing**: Endpoint functionality testing

### Test Configuration
See [TESTING_GUIDE.md](TESTING_GUIDE.md) for comprehensive testing instructions.

## 🚀 Deployment

### Production Build
```bash
# Build the application
npm run build

# Start production server
npm run start:prod
```

### Docker Deployment
```bash
# Build Docker image
docker build -t ticketmax-api .

# Run container
docker run -p 3500:3500 --env-file .env ticketmax-api

# Using Docker Compose
docker-compose -f docker-compose.production.yml up -d
```

### Environment Setup
- **Production Environment**: Secure configuration
- **SSL/TLS**: HTTPS enforcement
- **Load Balancing**: Horizontal scaling
- **Monitoring**: Application health checks

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Database connections secured
- [ ] SSL certificates installed
- [ ] Payment gateway webhooks configured
- [ ] Email service configured
- [ ] Redis cache operational
- [ ] Monitoring systems active

## 📚 Documentation

### Available Documentation
- [📊 **Dashboard Service**](docs/DASHBOARD_SERVICE_DOCUMENTATION.md) - Admin dashboard features
- [💳 **Payment Gateway Integration**](docs/PAYMENT_GATEWAY_INTEGRATION.md) - Payment processing setup
- [🔒 **Caching & Security**](docs/CACHING_AND_SECURITY.md) - Security implementation details
- [☁️ **Cloud Storage Setup**](docs/CLOUD_STORAGE_SETUP.md) - File upload configuration
- [⏰ **Cron Jobs**](docs/CRON_JOBS_DOCUMENTATION.md) - Scheduled task management
- [🔄 **Background Services**](docs/BACKGROUND_SERVICES_DOCUMENTATION.md) - Background processing
- [📋 **Entity Relationships**](docs/entity-relationships.md) - Database schema documentation

### API Examples
The `/docs` folder contains comprehensive examples and implementation guides for all major features.

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run the test suite (`npm run test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Code Standards
- **TypeScript**: Strict type checking enabled
- **ESLint**: Code quality enforcement
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message standards

### Testing Requirements
- All new features must include unit tests
- Integration tests for API endpoints
- Minimum 80% test coverage required

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Community**: Join our community discussions

### Troubleshooting
- **Database Connection**: Ensure MongoDB is running and accessible
- **Environment Variables**: Verify all required variables are set
- **Port Conflicts**: Check if port 3500 is available
- **Dependencies**: Ensure all npm packages are properly installed

---

## 🌟 Key Features Highlight

### 🤖 Revolutionary AI Support
- **Zero-cost AI agent** with advanced NLP capabilities
- **Coding assistance** for multiple programming languages
- **Context-aware conversations** with memory
- **Fallback to professional AI** services when needed

### 💳 Robust Payment System
- **Dual gateway support** (Paystack + Flutterwave)
- **Automatic failover** for payment reliability
- **Comprehensive webhook handling** for real-time updates
- **Transaction security** and fraud protection

### 🔐 Enterprise Security
- **Multi-layer authentication** with OAuth support
- **Advanced rate limiting** and brute force protection
- **Comprehensive audit logging** for compliance
- **Security headers** and input validation

### ⚡ High Performance
- **Redis caching** with intelligent invalidation
- **Database optimization** with proper indexing
- **Background job processing** for scalability
- **Real-time WebSocket** communication

Built with ❤️ using NestJS, TypeScript, and MongoDB.