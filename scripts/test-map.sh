#!/bin/bash
# Map Functionality Testing Script
# Tests all critical map features for the Persian Uprising News app

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASSED=0
FAILED=0

echo "========================================="
echo "Persian Uprising News - Map Testing"
echo "========================================="
echo "Testing: $BASE_URL"
echo ""

# Test function
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"
  local jq_filter="$5"

  echo -n "Testing: $name... "

  if [ "$method" = "GET" ]; then
    response=$(curl -s "$BASE_URL$endpoint")
  else
    response=$(curl -s -X "$method" "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  # Check if response is valid JSON
  if echo "$response" | jq empty 2>/dev/null; then
    # Apply filter if provided
    if [ -n "$jq_filter" ]; then
      result=$(echo "$response" | jq -r "$jq_filter")
      if [ "$result" != "null" ] && [ -n "$result" ]; then
        echo -e "${GREEN}✓ PASS${NC} ($result)"
        ((PASSED++))
        return 0
      else
        echo -e "${RED}✗ FAIL${NC} (filter returned null/empty)"
        ((FAILED++))
        return 1
      fi
    else
      echo -e "${GREEN}✓ PASS${NC}"
      ((PASSED++))
      return 0
    fi
  else
    echo -e "${RED}✗ FAIL${NC} (invalid JSON response)"
    echo "  Response: $(echo "$response" | head -c 200)"
    ((FAILED++))
    return 1
  fi
}

echo "=== MAP DATA TESTS ==="
test_endpoint "Get all incidents" "GET" "/api/incidents" "" ".total"
test_endpoint "Filter by protest type" "GET" "/api/incidents?type=protest" "" ".incidents | length"
test_endpoint "Filter by death type" "GET" "/api/incidents?type=death" "" ".incidents | length"
test_endpoint "Filter by map bounds (Iran)" "GET" "/api/incidents?northLat=40&southLat=24&eastLon=64&westLon=43" "" ".total"

echo ""
echo "=== INCIDENT DATA QUALITY ==="

# Check for required fields
incident_check=$(curl -s "$BASE_URL/api/incidents" | jq -r '
  .incidents[0] |
  {
    hasLocation: (.location.lat != null and .location.lon != null),
    hasType: (.type != null),
    hasTitle: (.title != null and .title != ""),
    hasDescription: (.description != null),
    hasTimestamp: (.timestamp != null)
  } |
  if .hasLocation and .hasType and .hasTitle and .hasDescription and .hasTimestamp then
    "All required fields present"
  else
    "Missing fields"
  end
')

if [ "$incident_check" = "All required fields present" ]; then
  echo -e "Incident data quality: ${GREEN}✓ PASS${NC}"
  ((PASSED++))
else
  echo -e "Incident data quality: ${RED}✗ FAIL${NC} ($incident_check)"
  ((FAILED++))
fi

echo ""
echo "=== MAP COVERAGE ==="

# Check geographic distribution
geo_check=$(curl -s "$BASE_URL/api/incidents" | jq -r '
  .incidents |
  group_by(.location.address) |
  length
')

echo "Unique locations: $geo_check"
if [ "$geo_check" -gt 5 ]; then
  echo -e "Geographic coverage: ${GREEN}✓ PASS${NC} (incidents in $geo_check locations)"
  ((PASSED++))
else
  echo -e "Geographic coverage: ${YELLOW}⚠ WARNING${NC} (only $geo_check locations)"
fi

echo ""
echo "=== AUTO-EXTRACTION QUALITY ==="

# Check auto-extracted incidents
auto_extracted=$(curl -s "$BASE_URL/api/incidents" | jq -r '
  [.incidents[] | select(.confidence != null)] | length
')

official_count=$(curl -s "$BASE_URL/api/incidents" | jq -r '
  [.incidents[] | select(.reportedBy == "official")] | length
')

verified_count=$(curl -s "$BASE_URL/api/incidents" | jq -r '
  [.incidents[] | select(.verified == true)] | length
')

echo "Auto-extracted incidents: $auto_extracted"
echo "Official reports: $official_count"
echo "Verified incidents: $verified_count"

if [ "$auto_extracted" -gt 0 ]; then
  echo -e "Auto-extraction working: ${GREEN}✓ PASS${NC}"
  ((PASSED++))
else
  echo -e "Auto-extraction working: ${RED}✗ FAIL${NC}"
  ((FAILED++))
fi

echo ""
echo "=== INCIDENT TYPES DISTRIBUTION ==="

curl -s "$BASE_URL/api/incidents" | jq -r '
  [.incidents[].type] |
  group_by(.) |
  map({type: .[0], count: length}) |
  .[] |
  "  \(.type): \(.count)"
'

echo ""
echo "=== RELATED ARTICLES ==="

articles_linked=$(curl -s "$BASE_URL/api/incidents" | jq -r '
  [.incidents[] | select(.relatedArticles != null and (.relatedArticles | length) > 0)] | length
')

echo "Incidents with related articles: $articles_linked"
if [ "$articles_linked" -gt 10 ]; then
  echo -e "Article linking: ${GREEN}✓ PASS${NC}"
  ((PASSED++))
else
  echo -e "Article linking: ${YELLOW}⚠ WARNING${NC} (only $articles_linked linked)"
fi

echo ""
echo "========================================="
echo "Test Results:"
echo "  ${GREEN}Passed: $PASSED${NC}"
echo "  ${RED}Failed: $FAILED${NC}"
echo "========================================="

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All critical map tests passed! ✓${NC}"
  echo ""
  echo "Manual Testing Checklist:"
  echo "  1. Open: $BASE_URL/map"
  echo "  2. Verify: Markers are visible on map"
  echo "  3. Click: Individual marker opens popup"
  echo "  4. Click: Clustered markers expands cluster"
  echo "  5. Test: Filter buttons work (Protest, Arrest, etc.)"
  echo "  6. Test: Timeline slider filters by date"
  echo "  7. Test: Heatmap toggle shows density"
  echo "  8. Test: Layer control switches map styles"
  echo "  9. Verify: Modal opens with full incident details"
  echo "  10. Test: Zoom in/out works smoothly"
  exit 0
else
  echo -e "${RED}Some tests failed. ✗${NC}"
  exit 1
fi
