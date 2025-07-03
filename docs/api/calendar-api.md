# Google Calendar API Reference

## Table of Contents

- [Overview](#overview)
- [Event Read Operations](#event-read-operations)
  - [List Calendar Events](#list-calendar-events)
  - [Get Event Details](#get-event-details)
  - [Search Calendar Events](#search-calendar-events)
- [Event Write Operations](#event-write-operations)
  - [Create Calendar Event](#create-calendar-event)
  - [Update Calendar Event](#update-calendar-event)
  - [Delete Calendar Event](#delete-calendar-event)
- [Calendar Management](#calendar-management)
  - [List User Calendars](#list-user-calendars)
  - [Get Calendar Metadata](#get-calendar-metadata)
- [Recurring Events](#recurring-events)
  - [Handle Recurring Events](#handle-recurring-events)
  - [Update Recurring Event Instance](#update-recurring-event-instance)
- [Free/Busy Information](#freebusy-information)
  - [Check Availability](#check-availability)
- [Error Handling](#error-handling)
  - [Common Error Codes](#common-error-codes)
  - [Error Response Format](#error-response-format)
- [Usage Examples](#usage-examples)
  - [Daily Schedule Generation](#daily-schedule-generation)
  - [Meeting Scheduling](#meeting-scheduling)
  - [Event Rescheduling](#event-rescheduling)
- [Rate Limits and Quotas](#rate-limits-and-quotas)
- [Best Practices](#best-practices)
- [Time Zone Considerations](#time-zone-considerations)

## Overview

The Calendar API module provides comprehensive calendar and event management capabilities, enabling AI agents to read, create, update, and organize calendar events across a user's Google Calendar accounts.

## Event Read Operations

### List Calendar Events

**Function**: `calendar.list_events(calendar_id, time_range)`

**Description**: Retrieve events from a specific calendar within a given time range.

**Parameters**:
- `calendar_id` (string, required): The unique identifier of the calendar (use "primary" for main calendar)
- `time_range` (object, required): Time range specification

**Time Range Object**:
```json
{
  "timeMin": "2023-12-01T00:00:00Z",
  "timeMax": "2023-12-31T23:59:59Z",
  "maxResults": 50,
  "orderBy": "startTime"
}
```

**Returns**:
```json
{
  "events": [
    {
      "id": "abc123def456",
      "summary": "Team Meeting",
      "description": "Weekly team sync meeting",
      "start": {
        "dateTime": "2023-12-15T10:00:00-08:00",
        "timeZone": "America/Los_Angeles"
      },
      "end": {
        "dateTime": "2023-12-15T11:00:00-08:00",
        "timeZone": "America/Los_Angeles"
      },
      "location": "Conference Room A",
      "attendees": [
        {
          "email": "colleague@company.com",
          "responseStatus": "accepted"
        }
      ],
      "creator": {
        "email": "user@example.com"
      },
      "organizer": {
        "email": "user@example.com"
      }
    }
  ],
  "nextPageToken": null,
  "timeZone": "America/Los_Angeles"
}
```

### Get Event Details

**Function**: `calendar.get_event(event_id)`

**Description**: Retrieve complete details for a specific calendar event.

**Parameters**:
- `event_id` (string, required): The unique identifier of the event

**Returns**: Complete event object with all details including:
- Basic information (title, description, time, location)
- Attendee list and response status
- Recurrence rules and exceptions
- Reminders and notifications
- Extended properties and metadata

### Search Calendar Events

**Function**: `calendar.search_events(query)`

**Description**: Search for events across calendars using text-based queries.

**Parameters**:
- `query` (string, required): Search query text

**Query Examples**:
- `"team meeting"` - Events with "team meeting" in title or description
- `"doctor"` - Medical appointments
- `"birthday"` - Birthday events
- `"conference room"` - Events in specific locations

**Advanced Search Options**:
```json
{
  "q": "team meeting",
  "timeMin": "2023-12-01T00:00:00Z",
  "timeMax": "2023-12-31T23:59:59Z",
  "singleEvents": true,
  "orderBy": "startTime"
}
```

**Returns**: Array of matching events with relevance scoring

## Event Write Operations

### Create Calendar Event

**Function**: `calendar.create_event(calendar_id, event_data)`

**Description**: Create a new event on the specified calendar.

**Parameters**:
- `calendar_id` (string, required): Target calendar ID
- `event_data` (object, required): Event details

**Event Data Structure**:
```json
{
  "summary": "Project Kickoff Meeting",
  "description": "Initial meeting to discuss project scope and timeline",
  "start": {
    "dateTime": "2023-12-20T14:00:00-08:00",
    "timeZone": "America/Los_Angeles"
  },
  "end": {
    "dateTime": "2023-12-20T15:30:00-08:00",
    "timeZone": "America/Los_Angeles"
  },
  "location": "Conference Room B, Building 1",
  "attendees": [
    {"email": "team.lead@company.com"},
    {"email": "developer@company.com"},
    {"email": "designer@company.com"}
  ],
  "reminders": {
    "useDefault": false,
    "overrides": [
      {"method": "email", "minutes": 1440},
      {"method": "popup", "minutes": 15}
    ]
  },
  "recurrence": [
    "RRULE:FREQ=WEEKLY;BYDAY=WE;COUNT=4"
  ]
}
```

**Returns**: Created event object with assigned ID

### Update Calendar Event

**Function**: `calendar.update_event(event_id, updated_data)`

**Description**: Update an existing calendar event with new information.

**Parameters**:
- `event_id` (string, required): The unique identifier of the event to update
- `updated_data` (object, required): Fields to update (partial event object)

**Update Examples**:
```json
{
  "summary": "Updated Meeting Title",
  "start": {
    "dateTime": "2023-12-20T15:00:00-08:00"
  },
  "end": {
    "dateTime": "2023-12-20T16:00:00-08:00"
  }
}
```

**Returns**: Updated event object

### Delete Calendar Event

**Function**: `calendar.delete_event(event_id)`

**Description**: Remove an event from the calendar.

**Parameters**:
- `event_id` (string, required): The unique identifier of the event to delete

**Returns**: Success confirmation

**Options**:
- `sendNotifications` (boolean): Whether to send cancellation emails to attendees
- `sendUpdates` (string): "all", "externalOnly", or "none"

## Calendar Management

### List User Calendars

**Function**: `calendar.list_calendars()`

**Description**: Retrieve all calendars accessible to the user.

**Returns**:
```json
{
  "calendars": [
    {
      "id": "primary",
      "summary": "user@example.com",
      "description": "Primary calendar",
      "timeZone": "America/Los_Angeles",
      "accessRole": "owner",
      "primary": true
    },
    {
      "id": "company_calendar@group.calendar.google.com",
      "summary": "Company Events",
      "description": "Shared company calendar",
      "timeZone": "America/Los_Angeles",
      "accessRole": "reader"
    }
  ]
}
```

### Get Calendar Metadata

**Function**: `calendar.get_calendar_info(calendar_id)`

**Description**: Retrieve detailed information about a specific calendar.

**Parameters**:
- `calendar_id` (string, required): The unique identifier of the calendar

**Returns**: Calendar metadata including permissions, settings, and sharing information

## Recurring Events

### Handle Recurring Events

**Recurrence Rule Examples**:
- `RRULE:FREQ=DAILY;COUNT=5` - Daily for 5 days
- `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR` - Every Monday, Wednesday, Friday
- `RRULE:FREQ=MONTHLY;BYMONTHDAY=15` - 15th of every month
- `RRULE:FREQ=YEARLY;BYMONTH=12;BYMONTHDAY=25` - December 25th annually

### Update Recurring Event Instance

**Function**: `calendar.update_recurring_instance(event_id, instance_id, updated_data)`

**Description**: Update a specific instance of a recurring event.

**Parameters**:
- `event_id` (string, required): The recurring event ID
- `instance_id` (string, required): The specific instance ID
- `updated_data` (object, required): Changes for this instance only

## Free/Busy Information

### Check Availability

**Function**: `calendar.get_freebusy(calendars, time_range)`

**Description**: Check availability across multiple calendars for scheduling.

**Parameters**:
- `calendars` (array, required): List of calendar IDs to check
- `time_range` (object, required): Time period to analyze

**Returns**:
```json
{
  "calendars": {
    "primary": {
      "busy": [
        {
          "start": "2023-12-15T10:00:00Z",
          "end": "2023-12-15T11:00:00Z"
        }
      ]
    }
  }
}
```

## Error Handling

### Common Error Codes
- `404`: Event or calendar not found
- `403`: Insufficient permissions
- `401`: Authentication required
- `409`: Conflict (e.g., overlapping events)
- `400`: Invalid event data
- `429`: Rate limit exceeded

### Error Response Format
```json
{
  "error": {
    "code": 404,
    "message": "Not Found",
    "details": "Event abc123def456 not found or not accessible"
  }
}
```

## Usage Examples

### Daily Schedule Generation
```javascript
// Get today's events
const today = new Date().toISOString().split('T')[0];
const events = await calendar.list_events("primary", {
  timeMin: `${today}T00:00:00Z`,
  timeMax: `${today}T23:59:59Z`,
  orderBy: "startTime"
});

// Generate schedule summary
const schedule = events.events.map(event => ({
  time: event.start.dateTime,
  title: event.summary,
  location: event.location
}));
```

### Meeting Scheduling
```javascript
// Check availability for next week
const nextWeek = new Date();
nextWeek.setDate(nextWeek.getDate() + 7);

const availability = await calendar.get_freebusy(
  ["primary", "team@company.com"],
  {
    timeMin: nextWeek.toISOString(),
    timeMax: new Date(nextWeek.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  }
);

// Find free slots and create meeting
const meetingData = {
  summary: "Project Review",
  start: { dateTime: "2023-12-22T14:00:00-08:00" },
  end: { dateTime: "2023-12-22T15:00:00-08:00" },
  attendees: [
    { email: "team.lead@company.com" },
    { email: "stakeholder@company.com" }
  ]
};

const newEvent = await calendar.create_event("primary", meetingData);
```

### Event Rescheduling
```javascript
// Search for specific meeting
const meetings = await calendar.search_events("weekly standup");

// Update meeting time
if (meetings.events.length > 0) {
  const eventId = meetings.events[0].id;
  await calendar.update_event(eventId, {
    start: { dateTime: "2023-12-15T11:00:00-08:00" },
    end: { dateTime: "2023-12-15T11:30:00-08:00" }
  });
}
```

## Rate Limits and Quotas

- **Queries per day**: 1,000,000
- **Queries per 100 seconds per user**: 100
- **Calendar list requests**: 100 per 100 seconds
- **Event creation limit**: 10,000 events per calendar per day

## Best Practices

1. **Use specific time ranges**: Limit queries to necessary time periods
2. **Cache calendar metadata**: Store calendar information locally
3. **Handle time zones properly**: Always specify time zones for events
4. **Batch operations**: Group multiple requests when possible
5. **Respect attendee privacy**: Be mindful of notification settings
6. **Validate event data**: Check required fields before creation
7. **Handle recurring events carefully**: Understand implications of updates

## Time Zone Considerations

- Always specify time zones in event data
- Use IANA time zone identifiers (e.g., "America/Los_Angeles")
- Handle daylight saving time transitions
- Consider user's default time zone for display
- Store UTC times for consistent processing
