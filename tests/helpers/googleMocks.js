/* eslint-disable */
/**
 * Enhanced Google API Mock Helpers
 * 
 * Provides simplified factory functions for mocking Google APIs
 * with common patterns and reduced complexity.
 */

// Factory for creating mock API responses
function createMockResponse(data) {
  return { data };
}

// Factory for creating mock API errors
function createMockError(code = 400, message = 'API Error') {
  return { code, message };
}

// Comprehensive Google API mock factory
function createGoogleApiMocks() {
  return {
    calendar: {
      events: {
        list: jest.fn(),
        insert: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    },
    gmail: {
      users: {
        messages: {
          list: jest.fn(),
          get: jest.fn(),
          send: jest.fn(),
          attachments: {
            get: jest.fn()
          }
        }
      }
    },
    drive: {
      files: {
        list: jest.fn(),
        get: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      }
    },
    sheets: {
      spreadsheets: {
        create: jest.fn(),
        get: jest.fn(),
        values: {
          get: jest.fn(),
          update: jest.fn(),
          batchUpdate: jest.fn()
        },
        batchUpdate: jest.fn()
      }
    }
  };
}

// Simplified stub functions
module.exports.stubCalendarApi = function() {
  const mocks = createGoogleApiMocks();
  jest.mock('googleapis', () => ({
    google: {
      calendar: jest.fn(() => mocks.calendar),
      auth: { OAuth2: jest.fn() }
    }
  }));
  return mocks.calendar;
};

module.exports.stubGmailApi = function() {
  const mocks = createGoogleApiMocks();
  jest.mock('googleapis', () => ({
    google: {
      gmail: jest.fn(() => mocks.gmail),
      auth: { OAuth2: jest.fn() }
    }
  }));
  return mocks.gmail;
};

module.exports.stubDriveApi = function() {
  const mocks = createGoogleApiMocks();
  jest.mock('googleapis', () => ({
    google: {
      drive: jest.fn(() => mocks.drive),
      auth: { OAuth2: jest.fn() }
    }
  }));
  return mocks.drive;
};

module.exports.stubSheetsApi = function() {
  const mocks = createGoogleApiMocks();
  jest.mock('googleapis', () => ({
    google: {
      sheets: jest.fn(() => mocks.sheets),
      auth: { OAuth2: jest.fn() }
    }
  }));
  return mocks.sheets;
};

// Utility functions
module.exports.createMockResponse = createMockResponse;
module.exports.createMockError = createMockError;
module.exports.createGoogleApiMocks = createGoogleApiMocks;
