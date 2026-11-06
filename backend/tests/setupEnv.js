// Runs before every test file: test-only settings (never used in development or production)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-not-used-anywhere-else-0123456789abcdef';
process.env.JWT_EXPIRES_IN = '1h';
process.env.MONGODB_URI_TEST = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/talenttrack_test';
