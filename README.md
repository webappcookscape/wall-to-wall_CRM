# Wall2Wall CRM

A comprehensive, full-stack CRM application designed for managing leads, users, and business operations. This monorepo contains both the backend API and the frontend web application.

## Project Structure

The project is organized into two main applications:

-   `apps/api`: The backend server built with Node.js, Express, and Prisma. It handles all business logic, database interactions, and external API integrations.
-   `apps/web`: The frontend client application built with React, Vite, and TypeScript. It provides the user interface for interacting with the CRM.

---

## Features

-   **Lead Management**: Full CRUD operations for leads, advanced filtering, bulk assignment, and detailed activity logging.
-   **User Authentication**: Secure login system with local credentials (username/password) and Google OAuth.
-   **Role-Based Access Control**: Permissions system to control what users can see and do.
-   **Dashboard**: At-a-glance statistics for leads, statuses, and user performance.
-   **Master Data Management**: Centralized control over core data entities like Projects, Sources, Statuses, etc.
-   **Reporting**: Generate user performance reports and a master export of all lead data.
-   **Third-Party Integrations**:
    -   **Meta Conversions API**: Securely sends lead events from both the website and the CRM backend to Facebook for tracking.
    -   **WhatsApp Chatbot**: Captures new leads directly from a WhatsApp business account.

---

## Tech Stack

-   **Backend**:
    -   Runtime: Node.js
    -   Framework: Express.js
    -   ORM: Prisma
    -   Language: TypeScript
    -   Authentication: JWT, Google Auth Library
-   **Frontend**:
    -   Framework: React
    -   Build Tool: Vite
    -   Language: TypeScript
    -   HTTP Client: Axios
-   **Database**: Any SQL database compatible with Prisma (e.g., PostgreSQL, MySQL).

---

## Getting Started

### Prerequisites

-   Node.js (v18 or later)
-   A package manager (npm, yarn, or pnpm)
-   A running SQL database instance

### 1. Backend Setup (`apps/api`)

1.  **Navigate to the API directory:**
    ```bash
    cd apps/api
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the `apps/api` directory. You can copy `.env.example` if it exists. Fill in the required values:
    ```env
    # Database connection string
    DATABASE_URL="postgresql://user:password@localhost:5432/crm_db"

    # JWT Authentication
    JWT_SECRET="your_super_secret_jwt_key"

    # Google OAuth
    GOOGLE_CLIENT_ID="your_google_client_id.apps.googleusercontent.com"

    # Meta (Facebook) Conversions API
    META_PIXEL_ID="your_meta_pixel_id"
    META_ACCESS_TOKEN="your_meta_access_token"
    # Optional: For testing events in Meta Events Manager
    # META_TEST_EVENT_CODE="TEST12345"
    ```

4.  **Run database migrations:**
    This will create the database schema based on `prisma/schema.prisma`.
    ```bash
    npx prisma migrate dev
    ```

5.  **Seed the database (optional but recommended):**
    This will populate the database with initial master data and sample users/leads.
    ```bash
    # For essential master data
    npx prisma db seed
    ```

6.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The API will be running on `http://localhost:5000` by default.

### 2. Frontend Setup (`apps/web`)

1.  **Navigate to the web directory:**
    ```bash
    cd apps/web
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env.local` file in the `apps/web` directory and specify the API URL.
    ```env
    VITE_API_URL=http://localhost:5000/api/v1
    ```

4.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The React application will be available at `http://localhost:5173` (or another port if 5173 is in use).

---

## API Documentation

For more detailed information on the available API endpoints, refer to the controller-specific README located at `apps/api/src/controllers/README.md`.