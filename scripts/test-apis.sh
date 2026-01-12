#!/bin/bash
# Comprehensive API Testing Script for Persian Uprising News App
# Tests all critical endpoints to ensure humanitarian mission continuity

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASSED=0
FAILED=0

echo "========================================="
echo "Persian Uprising News - API Test Suite"
echo "========================================="
echo "Testing: $BASE_URL"
echo ""

# Test function
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local expect_success="${5:-true}"

  echo -n "Testing: $name... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  http_code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$ d')

  if [[ "$expect_success" == "true" ]]; then
    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
      echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
      ((PASSED++))
      return 0
    else
      echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
      echo "  Response: $(echo "$body" | head -c 200)"
      ((FAILED++))
      return 1
    fi
  else
    if [[ "$http_code" -ge 200 && "$http_code" -lt 300 ]]; then
      echo -e "${RED}✗ FAIL${NC} (Expected error, got HTTP $http_code)"
      ((FAILED++))
      return 1
    else
      echo -e "${GREEN}✓ PASS${NC} (Expected error: HTTP $http_code)"
      ((PASSED++))
      return 0
    fi
  fi
}

echo "=== NEWS API TESTS ==="
test_endpoint "News API - GET all articles" "GET" "/api/news"
test_endpoint "News API - GET with pagination" "GET" "/api/news?page=0&limit=5"
test_endpoint "News API - POST refresh" "POST" "/api/news"
echo ""

echo "=== TRANSLATION API TESTS ==="
test_endpoint "Translation API - GET info" "GET" "/api/translate"
test_endpoint "Translation API - Translate Farsi to English" "POST" "/api/translate" \
  '{"text":"تظاهرات در تهران","sourceLang":"fa","targetLang":"en"}'
test_endpoint "Translation API - Translate English to Farsi" "POST" "/api/translate" \
  '{"text":"Protest in Tehran","sourceLang":"en","targetLang":"fa"}'
test_endpoint "Translation API - Auto-detect language" "POST" "/api/translate" \
  '{"text":"دستگیری فعالان","targetLang":"en","autoDetect":true}'
test_endpoint "Translation API - Empty text (should handle)" "POST" "/api/translate" \
  '{"text":"","targetLang":"en"}' "false"
echo ""

echo "=== INCIDENTS API TESTS ==="
test_endpoint "Incidents API - GET all incidents" "GET" "/api/incidents"
test_endpoint "Incidents API - GET with type filter" "GET" "/api/incidents?type=protest"
test_endpoint "Incidents API - GET with bounds filter" "GET" \
  "/api/incidents?northLat=36&southLat=35&eastLon=52&westLon=50"
test_endpoint "Incidents API - POST new incident" "POST" "/api/incidents" \
  '{"type":"protest","title":"Test Incident","description":"Test description for automated testing","location":{"lat":35.6892,"lon":51.389,"address":"Tehran"},"timestamp":'$(date +%s000)'}'
echo ""

echo "=== SUBSCRIPTION API TESTS ==="
test_endpoint "Subscriptions API - GET all subscriptions" "GET" "/api/subscriptions"
test_endpoint "Subscriptions API - POST new subscription" "POST" "/api/subscribe" \
  '{"endpoint":"https://test.example.com/push","keys":{"p256dh":"test-p256dh-key","auth":"test-auth-key"}}'
echo ""

echo "=== CHANNELS API TESTS ==="
test_endpoint "Channel Suggestions API - GET info" "GET" "/api/channels/suggest"
test_endpoint "Channel Suggestions API - POST new suggestion" "POST" "/api/channels/suggest" \
  '{"type":"telegram","handle":"@TestChannel","reason":"Test channel for automated testing","suggestedBy":"automated-test"}'
echo ""

echo ""
echo "========================================="
echo "Test Results:"
echo "  ${GREEN}Passed: $PASSED${NC}"
echo "  ${RED}Failed: $FAILED${NC}"
echo "========================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! ✓${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. ✗${NC}"
  exit 1
fi
