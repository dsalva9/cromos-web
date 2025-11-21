import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Stress test configuration - push system to limits
export const options = {
    stages: [
        { duration: '1m', target: 50 },   // Warm up
        { duration: '2m', target: 150 },  // Ramp beyond normal capacity
        { duration: '3m', target: 200 },  // Stress level
        { duration: '2m', target: 250 },  // Breaking point
        { duration: '1m', target: 0 },    // Recovery
    ],
    thresholds: {
        'http_req_duration': ['p(95)<1000'], // More lenient for stress test
        'http_req_failed': ['rate<0.05'],    // Allow up to 5% errors under stress
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
    // Simulate heavy load with multiple concurrent requests
    const requests = [
        ['GET', `${BASE_URL}/rest/v1/trade_listings?status=eq.active&limit=50`],
        ['GET', `${BASE_URL}/rest/v1/profiles?limit=20`],
        ['GET', `${BASE_URL}/rest/v1/collection_templates?is_public=eq.true&limit=20`],
        ['GET', `${BASE_URL}/rest/v1/trade_proposals?limit=10`],
    ];

    // Execute all requests in parallel
    const responses = http.batch(
        requests.map(([method, url]) => ({
            method: method,
            url: url,
            params: { headers: headers },
        }))
    );

    // Check all responses
    responses.forEach((res, index) => {
        const success = check(res, {
            [`request ${index} status 200`]: (r) => r.status === 200,
            [`request ${index} response time < 2000ms`]: (r) => r.timings.duration < 2000,
        });
        errorRate.add(!success);
    });

    sleep(0.5); // Minimal sleep to maximize load
}
