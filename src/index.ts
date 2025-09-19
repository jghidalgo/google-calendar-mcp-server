#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

class GoogleCalendarMCPServer {
  private server: Server;
  private oauth2Client!: OAuth2Client;

  constructor() {
    this.server = new Server(
      {
        name: 'google-calendar-mcp-server',
        version: '1.0.0',
      }
    );

    this.setupAuth();
    this.setupToolHandlers();
  }

  private setupAuth() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';

    if (!clientId || !clientSecret) {
      throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required');
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    // Set refresh token if available
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    if (refreshToken) {
      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'list_events',
            description: 'List upcoming events from Google Calendar',
            inputSchema: {
              type: 'object',
              properties: {
                calendarId: {
                  type: 'string',
                  description: 'Calendar ID (default: primary)',
                  default: 'primary'
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of events to return',
                  default: 10
                },
                timeMin: {
                  type: 'string',
                  description: 'Lower bound for event start time (ISO 8601)'
                },
                timeMax: {
                  type: 'string',
                  description: 'Upper bound for event start time (ISO 8601)'
                }
              }
            }
          },
          {
            name: 'create_event',
            description: 'Create a new event in Google Calendar',
            inputSchema: {
              type: 'object',
              properties: {
                calendarId: {
                  type: 'string',
                  description: 'Calendar ID (default: primary)',
                  default: 'primary'
                },
                summary: {
                  type: 'string',
                  description: 'Event title'
                },
                description: {
                  type: 'string',
                  description: 'Event description'
                },
                startDateTime: {
                  type: 'string',
                  description: 'Start date and time (ISO 8601)'
                },
                endDateTime: {
                  type: 'string',
                  description: 'End date and time (ISO 8601)'
                },
                attendees: {
                  type: 'array',
                  items: {
                    type: 'string'
                  },
                  description: 'List of attendee email addresses'
                }
              },
              required: ['summary', 'startDateTime', 'endDateTime']
            }
          },
          {
            name: 'get_auth_url',
            description: 'Get OAuth2 authorization URL for Google Calendar access',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_auth_url':
            return await this.getAuthUrl();
          case 'list_events':
            return await this.listEvents(args);
          case 'create_event':
            return await this.createEvent(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : String(error)}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private async getAuthUrl() {
    const scopes = ['https://www.googleapis.com/auth/calendar'];
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Please visit this URL to authorize the application:\n${authUrl}\n\nAfter authorization, set the GOOGLE_REFRESH_TOKEN environment variable with the refresh token.`
        }
      ]
    };
  }

  private async listEvents(args: any) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    
    const response = await calendar.events.list({
      calendarId: args.calendarId || 'primary',
      timeMin: args.timeMin || new Date().toISOString(),
      timeMax: args.timeMax,
      maxResults: args.maxResults || 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(events.map(event => ({
            id: event.id,
            summary: event.summary,
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            description: event.description,
            attendees: event.attendees?.map(a => a.email)
          })), null, 2)
        }
      ]
    };
  }

  private async createEvent(args: any) {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

    const event = {
      summary: args.summary,
      description: args.description,
      start: {
        dateTime: args.startDateTime,
        timeZone: 'UTC',
      },
      end: {
        dateTime: args.endDateTime,
        timeZone: 'UTC',
      },
      attendees: args.attendees?.map((email: string) => ({ email })),
    };

    const response = await calendar.events.insert({
      calendarId: args.calendarId || 'primary',
      requestBody: event,
    });

    return {
      content: [
        {
          type: 'text',
          text: `Event created successfully!\nEvent ID: ${response.data.id}\nEvent Link: ${response.data.htmlLink}`
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Calendar MCP server running on stdio');
  }
}

const server = new GoogleCalendarMCPServer();
server.run().catch(console.error);