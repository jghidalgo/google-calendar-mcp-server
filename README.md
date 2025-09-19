# Google Calendar MCP Server

An MCP (Model Context Protocol) server that provides Google Calendar integration capabilities.

## Features

-   List upcoming calendar events
-   Create new calendar events
-   OAuth2 authentication with Google Calendar API

## Setup

### 1. Install Dependencies

```bash
cd google-calendar-mcp
npm install
```

### 2. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Create OAuth2 credentials:
    - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
    - Choose "Desktop application" as the application type
    - Note down the Client ID and Client Secret

### 3. Environment Variables

Create a `.env` file in the project root:

```env
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=urn:ietf:wg:oauth:2.0:oob
GOOGLE_REFRESH_TOKEN=your_refresh_token_here
```

### 4. Get Refresh Token

1. Build and run the server:

    ```bash
    npm run build
    npm start
    ```

2. Use the `get_auth_url` tool to get the authorization URL
3. Visit the URL, authorize the application, and get the authorization code
4. Exchange the code for a refresh token and add it to your `.env` file

### 5. Build the Project

```bash
npm run build
```

## Available Tools

### `get_auth_url`

Get the OAuth2 authorization URL for Google Calendar access.

### `list_events`

List upcoming events from Google Calendar.

Parameters:

-   `calendarId` (optional): Calendar ID (default: "primary")
-   `maxResults` (optional): Maximum number of events to return (default: 10)
-   `timeMin` (optional): Lower bound for event start time (ISO 8601)
-   `timeMax` (optional): Upper bound for event start time (ISO 8601)

### `create_event`

Create a new event in Google Calendar.

Parameters:

-   `calendarId` (optional): Calendar ID (default: "primary")
-   `summary` (required): Event title
-   `description` (optional): Event description
-   `startDateTime` (required): Start date and time (ISO 8601)
-   `endDateTime` (required): End date and time (ISO 8601)
-   `attendees` (optional): Array of attendee email addresses

## Usage with Kiro

Add this server to your MCP configuration in `.kiro/settings/mcp.json`:

```json
{
    "mcpServers": {
        "google-calendar": {
            "command": "node",
            "args": ["path/to/google-calendar-mcp/dist/index.js"],
            "env": {
                "GOOGLE_CLIENT_ID": "your_client_id",
                "GOOGLE_CLIENT_SECRET": "your_client_secret",
                "GOOGLE_REFRESH_TOKEN": "your_refresh_token"
            },
            "disabled": false,
            "autoApprove": ["get_auth_url", "list_events"]
        }
    }
}
```
