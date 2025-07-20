/*
 * TypeScript declarations for googleMocks.js
 */

export interface MockGoogleApi {
  events: {
    list: jest.MockedFunction<any>;
    insert: jest.MockedFunction<any>;
    get: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  files: {
    list: jest.MockedFunction<any>;
    get: jest.MockedFunction<any>;
    create: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
    delete: jest.MockedFunction<any>;
  };
  spreadsheets: {
    create: jest.MockedFunction<any>;
    get: jest.MockedFunction<any>;
    values: {
      get: jest.MockedFunction<any>;
      update: jest.MockedFunction<any>;
      batchUpdate: jest.MockedFunction<any>;
    };
    batchUpdate: jest.MockedFunction<any>;
  };
  users: {
    messages: {
      list: jest.MockedFunction<any>;
      get: jest.MockedFunction<any>;
      send: jest.MockedFunction<any>;
    };
    labels: {
      list: jest.MockedFunction<any>;
    };
  };
}

export function stubCalendarApi(): MockGoogleApi;
export function stubDriveApi(): MockGoogleApi;
export function stubSheetsApi(): MockGoogleApi;
export function stubGmailApi(): MockGoogleApi;
