#!/usr/bin/env node

/**
 * Notification Testing Script
 * Tests the notification system step by step
 */

const fetch = require('node-fetch');
require('dotenv').config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function test1_HealthCheck() {
  section('Test 1: Backend Health Check');

  try {
    log(`Testing: GET ${BACKEND_URL}/`, 'blue');
    const response = await fetch(`${BACKEND_URL}/`);
    const data = await response.json();

    if (response.ok && data.status === 'ok') {
      log('✅ Backend is running!', 'green');
      log(`   Message: ${data.message}`, 'green');
      log(`   Time: ${data.timestamp}`, 'green');
      return true;
    } else {
      log('❌ Backend returned unexpected response', 'red');
      console.log(data);
      return false;
    }
  } catch (error) {
    log('❌ Backend is not running or not reachable', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('\n💡 Start the backend server with:', 'yellow');
    log('   cd backend && npm start', 'yellow');
    return false;
  }
}

async function test2_SendNotification() {
  section('Test 2: Send Test Notification');

  const testPriceData = {
    market: 'Test Market',
    breed: 'CB',
    minPrice: 450,
    maxPrice: 550,
    avgPrice: 500,
    pricePerKg: 500,
    quality: 'A',
    lotNumber: 123,
  };

  try {
    log(`Testing: POST ${BACKEND_URL}/send-notification`, 'blue');
    log('Payload:', 'blue');
    console.log(JSON.stringify({ priceData: testPriceData }, null, 2));

    const response = await fetch(`${BACKEND_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ priceData: testPriceData }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      log('✅ Notification endpoint working!', 'green');
      log(`   FCM Sent: ${result.fcmSent || 0}`, 'green');
      log(`   Expo Sent: ${result.expoSent || 0}`, 'green');
      log(`   Total Sent: ${result.totalSent || 0}`, 'green');
      log(`   Failed: ${result.totalFailed || 0}`, result.totalFailed > 0 ? 'yellow' : 'green');

      if (result.invalidTokensRemoved > 0) {
        log(`   Cleaned up: ${result.invalidTokensRemoved} invalid tokens`, 'yellow');
      }

      if (result.totalSent === 0) {
        log('\n⚠️  No notifications sent', 'yellow');
        log('   This is normal if no users have registered push tokens yet', 'yellow');
      }

      return true;
    } else {
      log('❌ Notification sending failed', 'red');
      log(`   Error: ${result.error || 'Unknown error'}`, 'red');
      console.log(result);
      return false;
    }
  } catch (error) {
    log('❌ Failed to send notification', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function test3_InvalidRequest() {
  section('Test 3: Error Handling (Invalid Request)');

  try {
    log(`Testing: POST ${BACKEND_URL}/send-notification (without data)`, 'blue');
    const response = await fetch(`${BACKEND_URL}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Empty request
    });

    const result = await response.json();

    if (!response.ok && result.error) {
      log('✅ Error handling working correctly!', 'green');
      log(`   Expected error: ${result.error}`, 'green');
      return true;
    } else {
      log('⚠️  Server should reject invalid requests', 'yellow');
      console.log(result);
      return false;
    }
  } catch (error) {
    log('❌ Test failed', 'red');
    log(`   Error: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('🧪 Notification System Test Suite', 'cyan');
  log(`Backend URL: ${BACKEND_URL}`, 'blue');
  log(`Time: ${new Date().toISOString()}`, 'blue');

  const results = {
    healthCheck: false,
    sendNotification: false,
    errorHandling: false,
  };

  // Test 1: Health check (required for other tests)
  results.healthCheck = await test1_HealthCheck();
  if (!results.healthCheck) {
    log('\n❌ Backend is not running. Cannot continue tests.', 'red');
    log('\n💡 To start the backend:', 'yellow');
    log('   cd backend', 'yellow');
    log('   npm start', 'yellow');
    process.exit(1);
  }

  // Test 2: Send notification
  results.sendNotification = await test2_SendNotification();

  // Test 3: Error handling
  results.errorHandling = await test3_InvalidRequest();

  // Summary
  section('Test Summary');
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  log(`Results: ${passed}/${total} tests passed`, passed === total ? 'green' : 'yellow');
  log(`✅ Health Check: ${results.healthCheck ? 'PASS' : 'FAIL'}`, results.healthCheck ? 'green' : 'red');
  log(`✅ Send Notification: ${results.sendNotification ? 'PASS' : 'FAIL'}`, results.sendNotification ? 'green' : 'red');
  log(`✅ Error Handling: ${results.errorHandling ? 'PASS' : 'FAIL'}`, results.errorHandling ? 'green' : 'red');

  if (passed === total) {
    log('\n🎉 All tests passed! Notification system is working correctly.', 'green');
    log('\n📱 Next steps:', 'cyan');
    log('   1. Open app and ensure push token is registered', 'blue');
    log('   2. Admin: Update a price in the app', 'blue');
    log('   3. Users should receive notifications!', 'blue');
  } else {
    log('\n⚠️  Some tests failed. Check the logs above for details.', 'yellow');
  }

  console.log('\n');
}

// Run tests
runAllTests().catch(error => {
  log('\n❌ Test suite crashed', 'red');
  log(`   Error: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
