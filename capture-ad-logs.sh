#!/data/data/com.termux/files/usr/bin/bash

# Script to capture AdMob logs from ReshmeInfo app
# Usage: ./capture-ad-logs.sh

echo "🔍 Capturing AdMob logs for ReshmeInfo app..."
echo "📱 Make sure the app is running on your device"
echo "⏱️  Will capture logs for 30 seconds..."
echo ""
echo "Looking for:"
echo "  - AdMob initialization"
echo "  - Banner ad loading"
echo "  - Interstitial ad loading"
echo "  - Ad errors"
echo ""
echo "-------------------------------------------"
echo ""

# Clear previous logs
adb logcat -c 2>/dev/null

# Capture logs with AdMob-related filters
timeout 30 adb logcat | grep -E "com.master.reshmeinfo|AdMob|Banner|Interstitial|AdBanner|🎯|✅|❌|react-native-google-mobile-ads" | tee ad-logs-$(date +%Y%m%d-%H%M%S).txt

echo ""
echo "-------------------------------------------"
echo "✅ Logs captured!"
echo "Check the ad-logs-*.txt file for details"
