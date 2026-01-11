#!/bin/bash

# Test script for push notifications

echo "Testing push notification system..."
echo ""

# Check subscription count
echo "1. Checking current subscriptions..."
curl -s http://localhost:3001/api/subscribe | jq '.'
echo ""

# Send a test notification
echo "2. Sending test notification..."
curl -X POST http://localhost:3001/api/push \
  -H "Content-Type: application/json" \
  -d '{
    "title": "🔔 Test Notification",
    "message": "This is a test push notification from the Persian Uprising News app!",
    "url": "/"
  }' | jq '.'
echo ""

echo "✅ Test complete!"
