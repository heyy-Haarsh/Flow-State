# FlowState Manager Portal - Setup Guide

## Quick Start Guide

### Step 1: Install PostgreSQL

**Windows:**
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. During installation, set a password for the `postgres` user (remember this!)
4. Keep the default port (5432)

**Or use Docker:**
```bash
docker run --name flowstate-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```

### Step 2: Create Database

Open pgAdmin or psql and run:

```sql
CREATE DATABASE flowstate_manager;
```

Or using command line:
```bash
psql -U postgres
CREATE DATABASE flowstate_manager;
\q
```

### Step 3: Run Database Schema

```bash
# Using psql
psql -U postgres -d flowstate_manager < src/config/database.sql

# Or in pgAdmin, open src/config/database.sql and execute it
```

### Step 4: Configure Environment

The `.env` file is already created. Update it if needed:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flowstate_manager
DB_USER=postgres
DB_PASSWORD=YOUR_PASSWORD_HERE
```

### Step 5: Start the Server

```bash
npm run dev
```

You should see:
```
=================================
FlowState Manager Portal API
=================================
Server running on port 3001
Environment: development
Health check: http://localhost:3001/health
=================================
[Database] Connected to PostgreSQL
```

### Step 6: Test the API

**Health Check:**
```bash
curl http://localhost:3001/health
```

**Register a Manager:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"manager@company.com\",
    \"password\": \"password123\",
    \"fullName\": \"John Manager\",
    \"role\": \"manager\"
  }"
```

**Register an Employee:**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"employee@company.com\",
    \"password\": \"password123\",
    \"fullName\": \"Jane Employee\",
    \"role\": \"employee\"
  }"
```

## Troubleshooting

### "Connection refused" error
- Make sure PostgreSQL is running
- Check that port 5432 is not blocked
- Verify DB credentials in `.env`

### "Database does not exist"
- Run: `CREATE DATABASE flowstate_manager;` in psql

### "Authentication failed"
- Update `DB_PASSWORD` in `.env` to match your PostgreSQL password

## Next Steps

Once the backend is running, you can:
1. Build the Manager Portal Frontend (React web app)
2. Integrate the Employee Desktop App with this API
3. Start assigning tasks!

## API Endpoints Summary

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/employees` - List employees (manager)
- `POST /api/tasks` - Assign task (manager)
- `GET /api/tasks` - Get tasks
- `PUT /api/tasks/:id` - Update task

See README.md for complete API documentation.
