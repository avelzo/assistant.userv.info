import '@testing-library/jest-dom';

process.env.BETTER_AUTH_SECRET ||= 'test-secret-test-secret-test-secret-12';
process.env.BETTER_AUTH_URL ||= 'http://localhost:3000';
process.env.NEXT_PUBLIC_BASE_URL ||= 'http://localhost:3000';