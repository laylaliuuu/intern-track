#!/bin/bash

# Daily Internship Update Script
# Run this script daily to keep your internship data fresh

echo "🔄 Starting daily internship update..."

# Set your server URL
SERVER_URL="http://localhost:3000"

# Run ingestion
echo "📥 Fetching new internships..."
RESPONSE=$(curl -s -X POST "$SERVER_URL/api/ingestion" \
  -H "Content-Type: application/json" \
  -d '{"maxResults": 200, "dryRun": false}')

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Daily update completed successfully!"
    
    # Extract summary
    FETCHED=$(echo "$RESPONSE" | grep -o '"fetched":[0-9]*' | cut -d':' -f2)
    INSERTED=$(echo "$RESPONSE" | grep -o '"inserted":[0-9]*' | cut -d':' -f2)
    
    echo "📊 Summary:"
    echo "   - Fetched: $FETCHED internships"
    echo "   - Inserted: $INSERTED new internships"
else
    echo "❌ Daily update failed!"
    echo "Response: $RESPONSE"
    exit 1
fi

echo "🎉 Daily update complete!"


