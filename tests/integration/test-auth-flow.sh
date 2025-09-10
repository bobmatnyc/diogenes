#!/bin/bash

# Test Authentication Flow Script
echo "🔐 Diogenes Authentication Test Suite"
echo "====================================="
echo ""
echo "✅ Server is running at: http://localhost:3001"
echo ""
echo "📋 Test Checklist:"
echo ""
echo "1. LANDING PAGE TEST"
echo "   - Open: http://localhost:3001"
echo "   - Expected: Redirect to /chat, then to sign-in"
echo ""
echo "2. SIGN-UP FLOW TEST" 
echo "   - Open: http://localhost:3001/sign-up"
echo "   - Create a new account with:"
echo "     • Email address"
echo "     • Strong password"
echo "   - Expected: Redirect to /chat after successful sign-up"
echo ""
echo "3. SIGN-IN FLOW TEST"
echo "   - Open: http://localhost:3001/sign-in"
echo "   - Sign in with existing account"
echo "   - Expected: Redirect to /chat after successful sign-in"
echo ""
echo "4. CHAT PAGE PROTECTION TEST"
echo "   - Access /chat directly when NOT signed in"
echo "   - Expected: Redirect to sign-in page"
echo "   - Access /chat when signed in"
echo "   - Expected: Show chat interface"
echo ""
echo "5. USER BUTTON TEST"
echo "   - In /chat page, look for user avatar/button (top-right)"
echo "   - Click the UserButton"
echo "   - Expected: Show user menu with:"
echo "     • User profile info"
echo "     • Sign out option"
echo "     • Manage account option"
echo ""
echo "6. SESSION PERSISTENCE TEST"
echo "   - While signed in, refresh the page (Cmd+R or F5)"
echo "   - Expected: Remain signed in"
echo "   - Close browser tab and reopen http://localhost:3001/chat"
echo "   - Expected: Still signed in (session persists)"
echo ""
echo "7. SIGN OUT TEST"
echo "   - Click UserButton → Sign out"
echo "   - Expected: Redirect to sign-in page"
echo "   - Try accessing /chat again"
echo "   - Expected: Redirect to sign-in"
echo ""
echo "🌐 Opening browser for testing..."
echo ""

# Open the browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    open http://localhost:3001
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    xdg-open http://localhost:3001 2>/dev/null || echo "Please open http://localhost:3001 manually"
else
    echo "Please open http://localhost:3001 in your browser"
fi

echo "📝 Current Authentication Status:"
echo ""
curl -s -I http://localhost:3001/chat 2>/dev/null | grep -E "x-clerk-auth|HTTP" | head -3
echo ""
echo "Press Ctrl+C to exit when testing is complete."