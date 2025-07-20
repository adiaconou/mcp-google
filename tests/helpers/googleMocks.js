/* eslint-disable */
/**
 * Helper to stub Google APIs without TypeScript strict typing
 */
module.exports.stubCalendarApi = function() {
  const mockCalendarApi = {
    events: {
      list: jest.fn(),
      insert: jest.fn(),
    },
  };
  jest.mock('googleapis', () => ({
    google: {
      calendar: jest.fn(() => mockCalendarApi),
      auth: {
        OAuth2: jest.fn(),
      },
    },
  }));
  return mockCalendarApi;
};
