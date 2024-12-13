// tests/setup.js
require('dotenv').config();

// Set test environment variables if not present
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/csah_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';