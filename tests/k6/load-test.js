import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 20 },  // Ramp up to 20 users
        { duration: '1m', target: 50 },   // Ramp up to 50 users
        { duration: '2m', target: 100 },  // Ramp up to 100 users
        { duration: '2m', target: 100 },  // Stay at 100 users
        { duration: '30s', target: 0 },   // Ramp down to 0
    ],
    thresholds: {
        'http_req_duration': ['p(95)<500'], // 95% of requests should be below 500ms
        'http_req_failed': ['rate<0.01'],   // Error rate should be below 1%
        'errors': ['rate<0.01'],
    },
};

// Configuration
const BASE_URL = 'https://cuzuzitadwmrlocqhhtu.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1enV6aXRhZHdtcmxvY3FoaHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MjY3ODIsImV4cCI6MjA3MzUwMjc4Mn0.1nh2CH7-LCa3bQHVfTdRxaAJbkpiKOEOH6L0vp91V8o';

const headers = {
    'apikey': API_KEY,
    'Content-Type': 'application/json',
};

export default function () {
    // Test 1: Fetch active listings (most common query)
    let res = http.get(`${BASE_URL}/rest/v1/trade_listings?status=eq.active&limit=20&select=id,title,sticker_number,user_id`, {
        headers: headers,
    });
    
    let success = check(res, {
        'listings status 200': (r) => r.status === 200,
        'listings response time < 500ms': (r) => r.timings.duration < 500,
        'listings has data': (r) => {
            try {
                const data = JSON.parse(r.body);
                return Array.isArray(data) && data.length > 0;
            } catch (e) {
                return false;
            }
        },
    });
    
    errorRate.add(!success);
    sleep(1);

    // Test 2: Fetch profiles (user data)
    res = http.get(`${BASE_URL}/rest/v1/profiles?limit=10&select=id,nickname,rating_avg,rating_count`, {
        headers: headers,
    });
    
    success = check(res, {
        'profiles status 200': (r) => r.status === 200,
        'profiles response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(!success);
    sleep(1);

    // Test 3: Fetch collection templates
    res = http.get(`${BASE_URL}/rest/v1/collection_templates?is_public=eq.true&limit=10&select=id,title,rating_avg`, {
        headers: headers,
    });
    
    success = check(res, {
        'templates status 200': (r) => r.status === 200,
        'templates response time < 500ms': (r) => r.timings.duration < 500,
    });
    
    errorRate.add(!success);
    sleep(1);

    // Test 4: Complex query with JOIN (via RPC or view)
    res = http.get(`${BASE_URL}/rest/v1/trade_listings?status=eq.active&limit=10&select=id,title,profiles(nickname)`, {
        headers: headers,
    });
    
    success = check(res, {
        'join query status 200': (r) => r.status === 200,
        'join query response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    
    errorRate.add(!success);
    sleep(2);
}
