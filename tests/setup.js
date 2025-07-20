/* eslint-disable */
/* eslint-env jest, node */
require('dotenv').config({ path: '.env.test' });

// Common test environment variables
process.env.GOOGLE_CLIENT_ID = 'mock-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'mock-client-secret';

// Global mock for OAuth manager - only mock the singleton instance, not the class
jest.mock('../src/auth/oauthManager', () => {
  const actual = jest.requireActual('../src/auth/oauthManager');
  return {
    ...actual,
    oauthManager: {
      instance: {
        getOAuth2Client: jest.fn().mockResolvedValue({ credentials: { access_token: 'mock-token' } }),
        isAuthenticated: jest.fn().mockResolvedValue(true),
        getAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
      },
    },
  };
});
