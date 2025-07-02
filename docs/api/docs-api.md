# Google Docs API Reference

## Overview

The Google Docs API module provides comprehensive document creation and manipulation capabilities, enabling AI agents to create, read, and update Google Docs for note-taking, content generation, and document management workflows.

## Document Read Operations

### Read Document Content

**Function**: `docs.read(doc_id)`

**Description**: Retrieve the complete content and structure of a Google Doc.

**Parameters**:
- `doc_id` (string, required): The unique identifier of the Google Doc

**Returns**:
```json
{
  "documentId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "title": "Meeting Notes - Q4 Planning",
  "body": {
    "content": [
      {
        "paragraph": {
          "elements": [
            {
              "textRun": {
                "content": "Q4 Planning Meeting\n",
                "textStyle": {
                  "bold": true,
                  "fontSize": {
                    "magnitude": 18,
                    "unit": "PT"
                  }
                }
              }
            }
          ]
        }
      }
    ]
  },
  "revisionId": "ALm37BVTnGV7u9O-ty7M3rWlP5fnoQw",
  "suggestionsViewMode": "SUGGESTIONS_INLINE"
}
```

### Get Document Metadata

**Function**: `docs.get_metadata(doc_id)`

**Description**: Retrieve document metadata without full content.

**Parameters**:
- `doc_id` (string, required): The unique identifier of the Google Doc

**Returns**:
```json
{
  "documentId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "title": "Meeting Notes - Q4 Planning",
  "revisionId": "ALm37BVTnGV7u9O-ty7M3rWlP5fnoQw",
  "createdTime": "2023-12-01T10:00:00.000Z",
  "modifiedTime": "2023-12-15T14:30:00.000Z",
  "documentStyle": {
    "pageSize": {
      "width": {
        "magnitude": 612,
        "unit": "PT"
      },
      "height": {
        "magnitude": 792,
        "unit": "PT"
      }
    },
    "marginTop": {
      "magnitude": 72,
      "unit": "PT"
    }
  }
}
```

### Extract Plain Text

**Function**: `docs.get_plain_text(doc_id)`

**Description**: Extract document content as plain text without formatting.

**Parameters**:
- `doc_id` (string, required): The unique identifier of the Google Doc

**Returns**: Document content as plain text string

**Use Cases**:
- Content analysis and summarization
- Text processing and extraction
- Search indexing
- AI content processing

## Document Creation Operations

### Create New Document

**Function**: `docs.create(title, content)`

**Description**: Create a new Google Doc with specified title and initial content.

**Parameters**:
- `title` (string, required): Title for the new document
- `content` (string, optional): Initial content as plain text or structured content

**Simple Text Creation**:
```javascript
const newDoc = await docs.create(
  "Daily Journal - December 15, 2023",
  "Today's accomplishments:\n\n• Completed project proposal\n• Attended team meeting\n• Reviewed quarterly goals"
);
```

**Structured Content Creation**:
```javascript
const structuredContent = {
  requests: [
    {
      insertText: {
        location: { index: 1 },
        text: "Project Status Report\n"
      }
    },
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex: 22 },
        textStyle: {
          bold: true,
          fontSize: { magnitude: 16, unit: "PT" }
        },
        fields: "bold,fontSize"
      }
    }
  ]
};

const newDoc = await docs.create("Status Report", structuredContent);
```

**Returns**: Created document metadata including document ID

### Create from Template

**Function**: `docs.create_from_template(template_id, title, replacements)`

**Description**: Create a new document based on an existing template with variable replacements.

**Parameters**:
- `template_id` (string, required): ID of the template document
- `title` (string, required): Title for the new document
- `replacements` (object, optional): Key-value pairs for template variable replacement

**Template Replacement Example**:
```javascript
const templateReplacements = {
  "{{DATE}}": "December 15, 2023",
  "{{PROJECT_NAME}}": "Q4 Marketing Campaign",
  "{{TEAM_LEAD}}": "Sarah Johnson",
  "{{DEADLINE}}": "January 31, 2024"
};

const newDoc = await docs.create_from_template(
  "1TemplateDocId123",
  "Q4 Marketing Campaign Plan",
  templateReplacements
);
```

## Document Update Operations

### Update Document Content

**Function**: `docs.update(doc_id, content_patch)`

**Description**: Apply updates to an existing document using batch requests.

**Parameters**:
- `doc_id` (string, required): The unique identifier of the document to update
- `content_patch` (object, required): Batch update requests

**Update Operations**:

#### Insert Text
```javascript
const insertUpdate = {
  requests: [
    {
      insertText: {
        location: { index: 1 },
        text: "New section content\n\n"
      }
    }
  ]
};
```

#### Replace Text
```javascript
const replaceUpdate = {
  requests: [
    {
      replaceAllText: {
        containsText: {
          text: "old text",
          matchCase: false
        },
        replaceText: "new text"
      }
    }
  ]
};
```

#### Format Text
```javascript
const formatUpdate = {
  requests: [
    {
      updateTextStyle: {
        range: { startIndex: 1, endIndex: 20 },
        textStyle: {
          bold: true,
          italic: true,
          foregroundColor: {
            color: {
              rgbColor: {
                red: 0.8,
                green: 0.2,
                blue: 0.2
              }
            }
          }
        },
        fields: "bold,italic,foregroundColor"
      }
    }
  ]
};
```

#### Insert Lists
```javascript
const listUpdate = {
  requests: [
    {
      insertText: {
        location: { index: 1 },
        text: "Action Items:\nItem 1\nItem 2\nItem 3\n"
      }
    },
    {
      createParagraphBullets: {
        range: { startIndex: 15, endIndex: 35 },
        bulletPreset: "BULLET_DISC_CIRCLE_SQUARE"
      }
    }
  ]
};
```

### Append Content

**Function**: `docs.append(doc_id, content)`

**Description**: Add content to the end of an existing document.

**Parameters**:
- `doc_id` (string, required): The unique identifier of the document
- `content` (string, required): Content to append

**Example**:
```javascript
await docs.append(
  "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "\n\nMeeting Summary:\n• Key decisions made\n• Action items assigned\n• Next steps planned"
);
```

### Insert at Position

**Function**: `docs.insert_at(doc_id, index, content)`

**Description**: Insert content at a specific position in the document.

**Parameters**:
- `doc_id` (string, required): The unique identifier of the document
- `index` (number, required): Character position to insert at
- `content` (string, required): Content to insert

## Document Structure Operations

### Insert Table

**Function**: `docs.insert_table(doc_id, index, rows, columns)`

**Description**: Insert a table at the specified position.

**Parameters**:
- `doc_id` (string, required): The unique identifier of the document
- `index` (number, required): Position to insert the table
- `rows` (number, required): Number of rows
- `columns` (number, required): Number of columns

**Example**:
```javascript
await docs.insert_table("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", 100, 3, 4);
```

### Insert Image

**Function**: `docs.insert_image(doc_id, index, image_url)`

**Description**: Insert an image at the specified position.

**Parameters**:
- `doc_id` (string, required): The unique identifier of the document
- `index` (number, required): Position to insert the image
- `image_url` (string, required): URL of the image to insert

## Collaboration Features

### Add Comments

**Function**: `docs.add_comment(doc_id, range, comment_text)`

**Description**: Add a comment to a specific text range.

**Parameters**:
- `doc_id` (string, required): The unique identifier of the document
- `range` (object, required): Text range for the comment
- `comment_text` (string, required): Comment content

### Suggest Edits

**Function**: `docs.suggest_edit(doc_id, range, suggested_text)`

**Description**: Create a suggestion for text changes.

**Parameters**:
- `doc_id` (string, required): The unique identifier of the document
- `range` (object, required): Text range to suggest changes for
- `suggested_text` (string, required): Suggested replacement text

## Error Handling

### Common Error Codes
- `404`: Document not found
- `403`: Insufficient permissions
- `401`: Authentication required
- `400`: Invalid request format
- `429`: Rate limit exceeded

### Error Response Format
```json
{
  "error": {
    "code": 400,
    "message": "Invalid requests[0].insertText: Location index is out of bounds",
    "details": "The specified index 1000 exceeds document length"
  }
}
```

## Usage Examples

### Meeting Notes Generation
```javascript
// Create meeting notes document
const meetingDoc = await docs.create(
  `Team Meeting - ${new Date().toLocaleDateString()}`,
  "Team Meeting Notes\n\nDate: " + new Date().toLocaleDateString()
);

// Add agenda items
await docs.append(meetingDoc.documentId, 
  "\n\nAgenda:\n• Project updates\n• Budget review\n• Next quarter planning"
);

// Add action items section
await docs.append(meetingDoc.documentId,
  "\n\nAction Items:\n• [Name] - Task description - Due date\n• [Name] - Task description - Due date"
);
```

### Daily Journal Entry
```javascript
// Create daily journal entry
const journalEntry = await docs.create(
  `Journal Entry - ${new Date().toLocaleDateString()}`,
  `Daily Reflection - ${new Date().toLocaleDateString()}\n\n`
);

// Add structured sections
const journalContent = {
  requests: [
    {
      insertText: {
        location: { index: -1 },
        text: "Accomplishments:\n\n\nChallenges:\n\n\nLearnings:\n\n\nTomorrow's Goals:\n\n"
      }
    }
  ]
};

await docs.update(journalEntry.documentId, journalContent);
```

### Report Generation
```javascript
// Create report from data
const reportData = {
  title: "Monthly Performance Report",
  metrics: [
    { name: "Revenue", value: "$125,000", change: "+12%" },
    { name: "Users", value: "15,420", change: "+8%" }
  ]
};

const report = await docs.create(reportData.title, "");

// Build report content
let reportContent = `${reportData.title}\n\nExecutive Summary\n\n`;
reportContent += "Key Metrics:\n";

reportData.metrics.forEach(metric => {
  reportContent += `• ${metric.name}: ${metric.value} (${metric.change})\n`;
});

await docs.update(report.documentId, {
  requests: [
    {
      insertText: {
        location: { index: 1 },
        text: reportContent
      }
    }
  ]
});
```

## Rate Limits and Quotas

- **Read requests per day**: 300,000,000
- **Write requests per day**: 300,000,000
- **Requests per 100 seconds per user**: 100
- **Batch request limit**: 500 requests per batch

## Best Practices

1. **Use batch requests**: Group multiple operations for efficiency
2. **Handle document structure**: Understand index positions for insertions
3. **Validate permissions**: Check document access before operations
4. **Cache document metadata**: Store frequently accessed information
5. **Handle concurrent edits**: Use revision IDs to detect conflicts
6. **Optimize content updates**: Use specific ranges rather than full document replacement
7. **Structure content logically**: Use headings, lists, and formatting for readability

## Content Formatting Guidelines

- **Headings**: Use consistent heading styles for document structure
- **Lists**: Utilize bullet points and numbered lists for organization
- **Tables**: Structure tabular data appropriately
- **Images**: Include relevant images with proper sizing
- **Links**: Add hyperlinks for external references
- **Comments**: Use comments for collaborative feedback
