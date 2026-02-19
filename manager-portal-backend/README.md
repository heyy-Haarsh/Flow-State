# FlowState Manager Portal - Backend API

Backend API server for the FlowState Manager Portal. Allows managers to assign tasks to employees and track their productivity.

## Tech Stack

- **Node.js** + **Express** - REST API server
- **PostgreSQL** - Relational database
- **JWT** - Authentication
- **bcrypt** - Password hashing

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up PostgreSQL Database

Install PostgreSQL and create a database:

```sql
CREATE DATABASE flowstate_manager;
```

### 3. Run Database Migrations

Execute the SQL schema:

```bash
psql -U postgres -d flowstate_manager < src/config/database.sql
```

Or manually run the SQL in `src/config/database.sql` in your PostgreSQL client.

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flowstate_manager
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_secret_key
```

### 5. Start the Server

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The API will be available at `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user (manager/employee)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user info

### Employee Management (Manager only)

- `GET /api/employees` - Get all employees in manager's team
- `GET /api/employees/search?query=name` - Search for employees to add
- `POST /api/employees` - Add employee to team
- `DELETE /api/employees/:employeeId` - Remove employee from team
- `GET /api/employees/:employeeId/metrics` - Get employee productivity metrics

### Task Management

- `POST /api/tasks` - Create/assign task (manager only)
- `GET /api/tasks` - Get tasks (filtered by role)
- `GET /api/tasks/stats` - Get task statistics
- `GET /api/tasks/:taskId` - Get single task
- `PUT /api/tasks/:taskId` - Update task
- `DELETE /api/tasks/:taskId` - Delete task (manager only)

## Database Schema

See `src/config/database.sql` for the complete schema.

### Main Tables

- **users** - Managers and employees
- **teams** - Manager-employee relationships
- **tasks** - Task assignments
- **employee_metrics** - Daily productivity metrics synced from employee apps

## Development

### Add NPM Scripts

Update `package.json`:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  }
}
```

Install nodemon for development:

```bash
npm install --save-dev nodemon
```

## Security

- Passwords are hashed using bcrypt with salt rounds of 10
- JWT tokens expire after 7 days
- All sensitive routes require authentication
- Manager-only routes have additional role checks
- SQL injection prevented using parameterized queries

## Testing

Test the API health check:

```bash
curl http://localhost:3001/health
```

Register a manager:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "manager@example.com",
    "password": "password123",
    "fullName": "Test Manager",
    "role": "manager"
  }'
```

## License

MIT
