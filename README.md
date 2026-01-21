# TaskFlow API

Enterprise-grade task management API with team collaboration features built with TypeScript, Express, and MongoDB.

## Features

- **User Management**
  - User registration and authentication
  - JWT-based authentication with refresh tokens
  - Role-based access control (Admin, Manager, User, Guest)
  - User preferences and profile management
  - Password reset functionality

- **Project Management**
  - Create and manage projects
  - Project visibility controls (Public, Private, Team)
  - Team member management with roles
  - Project statistics and analytics
  - Custom project settings

- **Task Management**
  - Create, update, and delete tasks
  - Task status workflow (Todo, In Progress, In Review, Blocked, Done, Archived)
  - Priority levels (Low, Medium, High, Critical)
  - Task assignment and watchers
  - Subtasks and parent-child relationships
  - File attachments
  - Tags and custom fields
  - Due dates and time tracking

- **Collaboration**
  - Comments and mentions
  - Real-time notifications
  - Activity tracking
  - Email notifications
  - Team collaboration

- **Analytics & Reporting**
  - Project statistics
  - User productivity metrics
  - Task completion rates
  - Burndown charts
  - Velocity tracking

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB
- **Authentication**: JWT
- **Testing**: Jest, Supertest
- **Code Quality**: ESLint, Prettier
- **Documentation**: OpenAPI/Swagger

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- MongoDB 6.0 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/taskflow-api.git
cd taskflow-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Update the `.env` file with your configuration:
```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/taskflow
JWT_SECRET=your-secret-key
```

5. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

## API Documentation

### Authentication Endpoints

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Project Endpoints

#### Create Project
```http
POST /api/v1/projects
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "My Project",
  "description": "Project description",
  "key": "MYPROJ"
}
```

#### Get All Projects
```http
GET /api/v1/projects
Authorization: Bearer {token}
```

### Task Endpoints

#### Create Task
```http
POST /api/v1/tasks
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Implement feature",
  "description": "Feature description",
  "project": "project_id",
  "priority": "high",
  "dueDate": "2024-12-31"
}
```

#### Get All Tasks
```http
GET /api/v1/tasks?page=1&limit=20&status=todo
Authorization: Bearer {token}
```

## Testing

Run all tests:
```bash
npm test
```

Run unit tests only:
```bash
npm run test:unit
```

Run integration tests only:
```bash
npm run test:integration
```

Run tests with coverage:
```bash
npm run test -- --coverage
```

## Code Quality

### Linting
```bash
npm run lint
npm run lint:fix
```

### Formatting
```bash
npm run format
npm run format:check
```

### Type Checking
```bash
npm run typecheck
```

## Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Route controllers
├── middleware/       # Express middleware
├── models/          # Mongoose models
├── routes/          # Route definitions
├── services/        # Business logic
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Application entry point

tests/
├── integration/     # Integration tests
├── unit/           # Unit tests
└── setup.ts        # Test setup and configuration
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NODE_ENV | Environment mode | development |
| PORT | Server port | 3000 |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/taskflow |
| JWT_SECRET | JWT signing secret | - |
| JWT_EXPIRES_IN | JWT expiration time | 7d |
| SMTP_HOST | SMTP server host | - |
| SMTP_PORT | SMTP server port | 587 |
| SMTP_USER | SMTP username | - |
| SMTP_PASSWORD | SMTP password | - |

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Follow TypeScript best practices
- Write meaningful commit messages
- Add tests for new features
- Maintain test coverage above 70%
- Update documentation as needed

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@taskflow.com or open an issue in the repository.

## Roadmap

- [ ] WebSocket support for real-time updates
- [ ] GraphQL API
- [ ] Advanced search and filtering
- [ ] Export functionality (PDF, CSV)
- [ ] Integration with external services (Slack, GitHub, etc.)
- [ ] Mobile app support
- [ ] Advanced analytics dashboard
- [ ] AI-powered task recommendations