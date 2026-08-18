# API Controllers README

This directory contains the Express route handlers (controllers) for the API. Each file corresponds to a specific resource or functional area of the application.

## Controller Overview

*   **`auth.controller.ts`**: Handles user authentication, including local username/password login, Google OAuth, and fetching the current user's profile (`/me`).
*   **`dashboard.controller.ts`**: Provides aggregated statistics for the main dashboard view.
*   **`leads.controller.ts`**: Manages all CRUD (Create, Read, Update, Delete) operations for leads, including listing, filtering, assignment, and activity logging.
*   **`masters.controller.ts`**: A generic controller for managing simple master data tables like `Source`, `Project`, `LeadStatus`, etc.
*   **`meta.controller.ts`**: Acts as a server-side proxy for sending events to the Meta (Facebook) Conversions API.
*   **`photos.controller.ts`**: Handles uploading and deleting signature photos for users.
*   **`report.controller.ts`**: Generates reports, such as user performance and a master lead export.
*   **`users.controller.ts`**: Manages user CRUD operations.
*   **`whatsapp.controller.ts`**: Handles incoming webhooks from a WhatsApp chatbot to create or update leads.

---

## Focus: `meta.controller.ts`

This controller acts as a secure server-side proxy to forward lead generation events from client-side applications (like a public website form) to the Meta (Facebook) Conversions API.

### Purpose

The primary goal is to allow client applications to trigger Meta conversion events without exposing sensitive credentials like the Meta Pixel Access Token. The client sends a simple payload to this controller's endpoint, and the server securely constructs and sends the event to Meta's API.

### Endpoint: `POST /api/v1/meta/lead`

This endpoint receives lead event data and forwards it to the Meta Conversions API.

#### Request Body

The client should send a JSON object with the following properties:

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `eventId` | `string` | Yes | A unique ID for this specific event instance. This helps with deduplication on Meta's side. A UUID is recommended. |
| `source` | `string` | Yes | The source of the action. Recommended values are `website`, `app`, or `physical_store`. |
| `pageUrl` | `string` | Yes | The full URL of the page where the event occurred (e.g., `https://www.mywebsite.com/thank-you`). |
| `email` | `string` | No | The email address of the user who generated the lead. |
| `phone` | `string` | No | The phone number of the user who generated the lead. |

#### How it Works

1.  **Receives Data**: The controller accepts the JSON payload from the client.
2.  **Extracts Metadata**: It automatically captures the user's IP address (`x-forwarded-for` or remote address) and `user-agent` from the request headers. This information is crucial for improving event match quality in Meta.
3.  **Calls Service**: It passes the data to the `sendMetaLead` service (`meta.service.ts`).
4.  **Secure Hashing**: The `sendMetaLead` service hashes the `email` and `phone` fields using SHA-256 before sending them to Meta, which is a required security practice.
5.  **Forwards to Meta**: The service constructs the final payload and (when enabled) sends it to the `https://graph.facebook.com/.../events` endpoint.

#### Example Usage (`curl`)

```bash
curl -X POST http://localhost:5000/api/v1/meta/lead \
-H "Content-Type: application/json" \
-d '{
  "eventId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "source": "website",
  "pageUrl": "https://your-website.com/contact-us",
  "email": "test.user@example.com",
  "phone": "1234567890"
}'
```

#### Responses

-   **`200 OK`**: On successfully processing the event (Note: this does not guarantee Meta accepted the event, only that the server-side proxy worked).
-   **`400 Bad Request`**: If required fields (`eventId`, `source`, `pageUrl`) are missing from the request body.
-   **`500 Internal Server Error`**: If there's an issue on the server, such as a problem communicating with the Meta API or missing environment variables (`META_PIXEL_ID`, `META_ACCESS_TOKEN`). The specific error is logged on the server for debugging, but a generic message is sent to the client.