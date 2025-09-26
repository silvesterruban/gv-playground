#!/bin/sh

echo "🚀 Starting GradVillage Backend with database initialization..."

# Wait a moment for the database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    exit 1
fi

echo "📊 DATABASE_URL is configured"

# Try to initialize the database
echo "🔧 Initializing database..."
node scripts/init-database.js

if [ $? -eq 0 ]; then
    echo "✅ Database initialization completed successfully"
else
    echo "⚠️  Database initialization failed, but continuing..."
fi

# Start the main application
echo "🚀 Starting main application..."
exec node dist/index.js










