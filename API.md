# API Documentation

## Authentication

All API requests require authentication unless otherwise specified. Include the JWT token in the Authorization header:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Base URL

```
https://api.taskflow.com/api/v1
```

## Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": {},
  "message": "Operation successful",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

## Error Responses

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limiting

- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **File Upload**: 20 uploads per hour

Rate limit information is included in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
```

## Pagination

Most list endpoints support pagination:

```
GET /api/v1/tasks?page=2&limit=50
```

**Parameters:**
- `page` (default: 1): Page number
- `limit` (default: 20, max: 100): Items per page

## Filtering

List endpoints support various filters:

```
GET /api/v1/tasks?status=in_progress&priority=high&assignee=user_id
```

## Sorting

```
GET /api/v1/tasks?sortBy=createdAt&sortOrder=desc
```

## Search

Full-text search is available on specific endpoints:

```
GET /api/v1/tasks?search=implement+feature
```

---

## Authentication Endpoints

### Register User

Create a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "role": "user"
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Login

Authenticate a user.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "preferences": {
        "theme": "system",
        "language": "en"
      }
    },
    "token": "jwt_token",
    "refreshToken": "refresh_token"
  }
}
```

### Refresh Token

Get a new access token using a refresh token.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "refresh_token"
}
```

### Get Profile

Get the authenticated user's profile.

**Endpoint:** `GET /auth/profile`

**Headers:** `Authorization: Bearer token`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "avatar": "avatar_url",
      "role": "user",
      "preferences": {}
    }
  }
}
```

### Update Profile

Update the authenticated user's profile.

**Endpoint:** `PUT /auth/profile`

**Headers:** `Authorization: Bearer token`

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "avatar": "new_avatar_url",
  "preferences": {
    "theme": "dark",
    "language": "es"
  }
}
```

### Change Password

Change the authenticated user's password.

**Endpoint:** `PUT /auth/change-password`

**Headers:** `Authorization: Bearer token`

**Request Body:**
```json
{
  "currentPassword": "old_password",
  "newPassword": "new_password"
}
```

### Forgot Password

Request a password reset.

**Endpoint:** `POST /auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

### Reset Password

Reset password using a reset token.

**Endpoint:** `POST /auth/reset-password`

**Request Body:**
```json
{
  "token": "reset_token",
  "password": "new_password"
}
```

---

## User Endpoints

### Get All Users

Get a paginated list of all users.

**Endpoint:** `GET /users`

**Headers:** `Authorization: Bearer token`

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `search` (optional): Search query
- `role` (optional): Filter by role

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "username": "johndoe",
        "role": "user",
        "avatar": "avatar_url"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### Get User by ID

Get a specific user's information.

**Endpoint:** `GET /users/:id`

**Headers:** `Authorization: Bearer token`

### Search Users

Search for users by name, username, or email.

**Endpoint:** `GET /users/search?query=john`

**Headers:** `Authorization: Bearer token`

### Get User Statistics

Get statistics for a specific user.

**Endpoint:** `GET /users/:id/stats`

**Headers:** `Authorization: Bearer token`

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "projects": 5,
      "assignedTasks": 23,
      "completedTasks": 15,
      "completionRate": 65
    }
  }
}
```

---

## Project Endpoints

### Create Project

Create a new project.

**Endpoint:** `POST /projects`

**Headers:** `Authorization: Bearer token`

**Request Body:**
```json
{
  "name": "My Project",
  "description": "Project description",
  "key": "MYPROJ",
  "visibility": "private",
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "budget": 50000
}
```

### Get All Projects

Get all projects the user has access to.

**Endpoint:** `GET /projects`

**Headers:** `Authorization: Bearer token`

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status (planning, active, on_hold, completed, cancelled)
- `visibility`: Filter by visibility (public, private, team)
- `search`: Search query

### Get Project by ID

Get detailed information about a project.

**Endpoint:** `GET /projects/:id`

**Headers:** `Authorization: Bearer token`

### Update Project

Update project information.

**Endpoint:** `PUT /projects/:id`

**Headers:** `Authorization: Bearer token`

**Request Body:**
```json
{
  "name": "Updated Project Name",
  "status": "active",
  "description": "Updated description"
}
```

### Delete Project

Delete a project (owner only).

**Endpoint:** `DELETE /projects/:id`

**Headers:** `Authorization: Bearer token`

### Add Project Member

Add a member to a project.

**Endpoint:** `POST /projects/:id/members`

**Headers:** `Authorization: Bearer token`

**Request Body:**
```json
{
  "userId": "user_id",
  "role": "member"
}
```

**Roles:**
- `owner`: Full control
- `admin`: Manage members and settings
- `member`: Create and manage tasks
- `viewer`: Read-only access

### Remove Project Member

Remove a member from a project.

**Endpoint:** `DELETE /projects/:id/members/:userId`

**Headers:** `Authorization: Bearer token`

### Get Project Statistics

Get project statistics and metrics.

**Endpoint:** `GET /projects/:id/stats`

**Headers:** `Authorization: Bearer token`

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalTasks": 50,
      "byStatus": {
        "todo": 10,
        "in_progress": 15,
        "done": 25
      },
      "byPriority": {
        "low": 10,
        "medium": 25,
        "high": 12,
        "critical": 3
      },
      "overdueTasks": 3,
      "memberCount": 8
    }
  }
}
```

---

## Task Endpoints

### Create Task

Create a new task.

**Endpoint:** `POST /tasks`

**Headers:** `Authorization: Bearer token`

**Request Body:**
```json
{
  "title": "Implement user authentication",
  "description": "Add JWT-based authentication",
  "project": "project_id",
  "status": "todo",
  "priority": "high",
  "assignee": "user_id",
  "tags": ["backend", "security"],
  "dueDate": "2024-12-31",
  "estimatedHours": 8
}
```

### Get All Tasks

Get all tasks with optional filtering.

**Endpoint:** `GET /tasks`

**Headers:** `Authorization: Bearer token`

**Query Parameters:**
- `page`, `limit`: Pagination
- `status`: Filter by status
- `priority`: Filter by priority
- `assignee`: Filter by assignee
- `project`: Filter by project
- `tags`: Filter by tags (comma-separated)
- `search`: Full-text search

### Get Task by ID

Get detailed information about a task.

**Endpoint:** `GET /tasks/:id`

**Headers:** `Authorization: Bearer token`

### Update Task

Update task information.

**Endpoint:** `PUT /tasks/:id`

**Headers:** `Authorization: Bearer token`

**Request Body:**
```json
{
  "title": "Updated title",
  "status": "in_progress",
  "priority": "critical",
  "actualHours": 6
}
```

### Delete Task

Delete a task.

**Endpoint:** `DELETE /tasks/:id`

**Headers:** `Authorization: Bearer token`

### Assign Task

Assign a task to a user.

**Endpoint:** `POST /tasks/:id/assign`

**Headers:** `Authorization: Bearer token`

**Request Body:**
```json
{
  "assigneeId": "user_id"
}
```

### Add Task Watcher

Add a watcher to a task.

**Endpoint:** `POST /tasks/:id/watchers`

**Headers:** `Authorization: Bearer token`

**Request Body:**
```json
{
  "userId": "user_id"
}
```

### Remove Task Watcher

Remove a watcher from a task.

**Endpoint:** `DELETE /tasks/:id/watchers/:userId`

**Headers:** `Authorization: Bearer token`

### Add Task Attachment

Upload a file attachment to a task.

**Endpoint:** `POST /tasks/:id/attachments`

**Headers:** 
- `Authorization: Bearer token`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file`: The file to upload

**Supported file types:**
- Documents: PDF, DOC, DOCX, XLS, XLSX, TXT, CSV
- Images: JPEG, JPG, PNG, GIF
- Archives: ZIP

**Max file size:** 10MB

### Delete Task Attachment

Delete a file attachment from a task.

**Endpoint:** `DELETE /tasks/:id/attachments/:attachmentId`

**Headers:** `Authorization: Bearer token`

---

## Webhooks

Configure webhooks to receive real-time notifications of events.

### Supported Events

- `task.created`: New task created
- `task.updated`: Task updated
- `task.deleted`: Task deleted
- `comment.created`: New comment added
- `project.updated`: Project updated

### Webhook Payload Example

```json
{
  "event": "task.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "task": {
      "id": "task_id",
      "title": "New Task",
      "project": "project_id"
    },
    "actor": {
      "id": "user_id",
      "name": "John Doe"
    }
  },
  "signature": "hmac_signature"
}
```

### Verifying Webhook Signatures

Verify webhook authenticity using HMAC-SHA256:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```
