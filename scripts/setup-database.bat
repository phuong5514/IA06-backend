@echo off
REM Smart Restaurant Database Setup Script
REM This script sets up the database with initial data

echo.
echo 🚀 Smart Restaurant Database Setup
echo ==================================
echo.

REM Check if .env exists
if not exist .env (
    echo ⚠️  .env file not found!
    if exist .env.example (
        echo 📝 Creating .env from .env.example...
        copy .env.example .env
        echo ✅ .env file created. Please edit it with your database credentials.
        pause
        exit /b 1
    ) else (
        echo ❌ .env.example not found. Please create .env manually.
        pause
        exit /b 1
    )
)

echo ✅ Environment file found
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo 📦 Installing dependencies...
    call npm install
    echo.
)

REM Prompt user for setup type
echo Select setup type:
echo 1) Full setup (push schema + seed all data) - Recommended for first setup
echo 2) Push schema only (create/update tables)
echo 3) Seed data only (requires existing schema)
echo 4) Reset database (drop all data + reseed)
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto full_setup
if "%choice%"=="2" goto push_schema
if "%choice%"=="3" goto seed_data
if "%choice%"=="4" goto reset_db
goto invalid_choice

:full_setup
echo.
echo 📊 Pushing database schema...
call npm run db:push
echo.
echo 🌱 Seeding database with initial data...
call npm run db:seed
echo.
echo ✅ Full setup completed!
goto success

:push_schema
echo.
echo 📊 Pushing database schema...
call npm run db:push
echo.
echo ✅ Schema push completed!
goto success

:seed_data
echo.
echo 🌱 Seeding database...
call npm run db:seed
echo.
echo ✅ Database seeded!
goto success

:reset_db
echo.
echo ⚠️  WARNING: This will delete all existing data!
set /p confirm="Are you sure? (yes/no): "
if not "%confirm%"=="yes" (
    echo ❌ Reset cancelled
    pause
    exit /b 0
)
echo.
echo 🔄 Resetting database...
call npm run db:reset
echo.
echo ✅ Database reset completed!
goto success

:invalid_choice
echo ❌ Invalid choice
pause
exit /b 1

:success
echo.
echo 🎉 Setup completed successfully!
echo.
echo 🔐 Default login credentials:
echo    Admin:    admin@restaurant.com / Password123!
echo    Waiter:   waiter1@restaurant.com / Password123!
echo    Kitchen:  kitchen1@restaurant.com / Password123!
echo    Customer: customer1@example.com / Password123!
echo.
echo 📚 For more information, see DATABASE_SETUP.md
echo.
pause
