#!/bin/bash

echo "🚀 Starting Diogenes Chat API Testing"
echo "======================================"

API_URL="http://localhost:3000/api/chat"
PASSED=0
FAILED=0

# Function to test API with different messages
test_message() {
    local test_name="$1"
    local message="$2"
    local expect_error="$3"
    
    echo ""
    echo "🧪 Testing: $test_name"
    echo "📝 Message: \"$message\""
    
    # Create JSON payload
    local json_payload="{\"messages\": [{\"role\": \"user\", \"content\": \"$message\"}]}"
    
    # Send request and capture response
    local response=$(curl -s -w "\nSTATUS_CODE:%{http_code}" -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$json_payload" \
        --max-time 15)
    
    local status_code=$(echo "$response" | grep "STATUS_CODE:" | cut -d: -f2)
    local body=$(echo "$response" | sed '/STATUS_CODE:/d')
    
    if [ "$expect_error" = "true" ]; then
        if [ "$status_code" != "200" ]; then
            echo "✅ Expected error occurred (Status: $status_code)"
            ((PASSED++))
            return 0
        else
            echo "❌ Expected error but got success response"
            ((FAILED++))
            return 1
        fi
    fi
    
    if [ "$status_code" = "200" ]; then
        echo "✅ API Response Status: $status_code"
        
        # Check if response contains streaming chunks
        if echo "$body" | grep -q '0:"'; then
            echo "✅ Streaming format detected"
        else
            echo "❌ No streaming format found"
            ((FAILED++))
            return 1
        fi
        
        # Extract text content from streaming response
        local content=$(echo "$body" | grep -o '0:"[^"]*"' | sed 's/0:"//' | sed 's/"//' | tr -d '\n')
        local content_length=${#content}
        
        echo "📤 Response preview: ${content:0:150}..."
        echo "📏 Response length: $content_length characters"
        
        # Check for Diogenes personality traits
        local traits=""
        echo "$content" | grep -qi "but\|however\|yet\|challenge\|question" && traits+="contrarian "
        echo "$content" | grep -qi "truth\|wisdom\|virtue\|nature\|human" && traits+="philosophical "
        echo "$content" | grep -qi "?\|why\|what if\|consider\|think" && traits+="questioning "
        echo "$content" | grep -qi "really\|truly\|suppose\|assume" && traits+="skeptical "
        
        if [ -n "$traits" ]; then
            echo "🎭 Personality traits found: $traits"
        else
            echo "🎭 No clear personality traits detected"
        fi
        
        if [ "$content_length" -gt 20 ]; then
            echo "✅ Test PASSED"
            ((PASSED++))
        else
            echo "❌ Response too short"
            ((FAILED++))
        fi
    else
        echo "❌ API Error (Status: $status_code): $body"
        ((FAILED++))
    fi
}

# Run test cases
test_message "Philosophical Question" "What is the meaning of life?"
test_message "Simple Greeting" "Hello, how are you?"
test_message "Technology Discussion" "AI will solve all human problems."
test_message "Special Characters" "What about symbols like @#\$%^&*() and émojis 🤔?"
test_message "Empty Message" "" "true"

# Test conversation continuity
echo ""
echo "🗣️  Testing Conversation Continuity"
echo "===================================="

# Test with conversation history
json_with_history='{
  "messages": [
    {"role": "user", "content": "I think technology is always beneficial."},
    {"role": "assistant", "content": "Ah, such unwavering faith in human ingenuity! Tell me, friend, have you considered that every tool can be both blessing and curse?"},
    {"role": "user", "content": "What was I just saying about technology?"}
  ]
}'

echo ""
echo "🧪 Testing: Context Memory"
echo "📝 Testing if assistant remembers conversation context"

response=$(curl -s -w "\nSTATUS_CODE:%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "$json_with_history" \
    --max-time 15)

status_code=$(echo "$response" | grep "STATUS_CODE:" | cut -d: -f2)
body=$(echo "$response" | sed '/STATUS_CODE:/d')

if [ "$status_code" = "200" ]; then
    content=$(echo "$body" | grep -o '0:"[^"]*"' | sed 's/0:"//' | sed 's/"//' | tr -d '\n')
    echo "📤 Response: ${content:0:200}..."
    
    # Check if response references technology or previous conversation
    if echo "$content" | grep -qi "technology\|beneficial\|tool\|ingenuity"; then
        echo "✅ Context awareness confirmed"
        ((PASSED++))
    else
        echo "❌ No context awareness detected"
        ((FAILED++))
    fi
else
    echo "❌ Context test failed (Status: $status_code)"
    ((FAILED++))
fi

# Final results
echo ""
echo "======================================"
echo "📊 FINAL TEST RESULTS"
echo "======================================"
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
    echo "🎯 Overall Result: ✅ ALL TESTS PASSED"
    exit 0
else
    echo "🎯 Overall Result: ❌ SOME TESTS FAILED"
    exit 1
fi