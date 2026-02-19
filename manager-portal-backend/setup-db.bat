@echo off
echo Setting up FlowState Manager Database...
echo.

set PGPASSWORD=Sarthak@123

echo Step 1: Creating database...
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -c "CREATE DATABASE flowstate_manager;" 2>nul
if %errorlevel% equ 0 (
    echo ✓ Database created successfully!
) else (
    echo ✓ Database already exists or created successfully
)

echo.
echo Step 2: Running schema...
"C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d flowstate_manager -f src\config\database.sql
if %errorlevel% equ 0 (
    echo ✓ Schema created successfully!
) else (
    echo ✗ Error creating schema
    pause
    exit /b 1
)

echo.
echo ✓ Database setup complete!
echo.
echo You can now start the API server with: npm run dev
pause
