// Setup file for integration tests
// This runs before the test suite

import { config } from 'dotenv'

// Load environment variables
config()

// Check if we have a running server or need to start one
const setupTestEnvironment = async () => {
    // The test will use the composables which call $fetch
    // $fetch needs a running server, so we assume the user started `npm run dev` first
    console.log('Integration test setup: Ensure `npm run dev` is running before tests')
}

setupTestEnvironment()
