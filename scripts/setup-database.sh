#!/bin/bash

# Smart Restaurant Database Setup Script
# This script sets up the database with initial data

set -e  # Exit on error

echo "🚀 Smart Restaurant Database Setup"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Creating .env from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ .env file created. Please edit it with your database credentials."
        exit 1
    else
        echo "❌ .env.example not found. Please create .env manually."
        exit 1
    fi
fi

# Source the .env file
export $(cat .env | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set in .env file"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Prompt user for setup type
echo "Select setup type:"
echo "1) Full setup (push schema + seed all data) - Recommended for first setup"
echo "2) Push schema only (create/update tables)"
echo "3) Seed data only (requires existing schema)"
echo "4) Reset database (drop all data + reseed)"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo ""
        echo "📊 Pushing database schema..."
        npm run db:push
        echo ""
        echo "🌱 Seeding database with initial data..."
        npm run db:seed
        echo ""
        echo "✅ Full setup completed!"
        ;;
    2)
        echo ""
        echo "📊 Pushing database schema..."
        npm run db:push
        echo ""
        echo "✅ Schema push completed!"
        ;;
    3)
        echo ""
        echo "🌱 Seeding database..."
        npm run db:seed
        echo ""
        echo "✅ Database seeded!"
        ;;
    4)
        echo ""
        echo "⚠️  WARNING: This will delete all existing data!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo ""
            echo "🔄 Resetting database..."
            npm run db:reset
            echo ""
            echo "✅ Database reset completed!"
        else
            echo "❌ Reset cancelled"
            exit 0
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "🔐 Default login credentials:"
echo "   Admin:    admin@restaurant.com / Password123!"
echo "   Waiter:   waiter1@restaurant.com / Password123!"
echo "   Kitchen:  kitchen1@restaurant.com / Password123!"
echo "   Customer: customer1@example.com / Password123!"
echo ""
echo "📚 For more information, see DATABASE_SETUP.md"
