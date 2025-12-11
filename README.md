# Analytics Report Builder

AI-powered analytics report builder that generates visualizations from natural language using Claude 3.5 Sonnet.

## Features

- 🤖 AI-powered report generation using Claude 3.5 Sonnet
- 📊 Predefined visualization components (KPI cards, line charts, bar charts, tables)
- 📁 Folder organization for reports
- 💬 ChatGPT-style interface
- 🗄️ Supabase backend for data storage and analyticss

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **UI Components**: Shadcn UI
- **Database**: Supabase
- **AI**: Claude 3.5 Sonnet (Anthropic API)
- **Charts**: Recharts

## Setup Instructions

### 1. Clone and Install

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new Supabase project at https://supabase.com
2. In your Supabase SQL Editor, run the schema from `supabase/schema.sql`
3. This will create:
   - `folders` and `reports` tables for app data
   - `users` and `events` tables with sample analytics data

### 3. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_DB_URL=your_supabase_connection_string
ANTHROPIC_API_KEY=your_anthropic_api_key
```

Get your credentials:
- **Supabase keys**: Project Settings → API
- **Supabase connection string**: Project Settings → Database → Connection string → URI (use the `?sslmode=require` variant)
- **Anthropic API key**: https://console.anthropic.com

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database (Drizzle + Supabase)

- Set `SUPABASE_DB_URL` (or `DATABASE_URL`) to your Supabase connection string.
- Push schema to Supabase: `npm run db:push` (uses `drizzle.config.ts` automatically)
- Seed sample data: `npm run db:seed`

## Usage
### Creating Reports

1. Type a natural language request in the chat interface
2. Claude generates a report configuration
3. The app queries your Supabase data and renders visualizations
4. Reports are automatically saved to the sidebar

### Example Prompts

- "Show me daily active users for the last 7 days"
- "Create a report with user retention metrics"
- "Display top events from the past month"
- "Show me a breakdown of user activity by day"

### Available Components

- **KPI Card**: Single metric display
- **Line Chart**: Time-series visualization
- **Bar Chart**: Categorical comparisons
- **Table**: Tabular data with sorting
- **Metrics Grid**: Multiple KPIs in a grid layout

### Organizing Reports

- Create folders using the "New Folder" button
- Drag reports into folders (coming soon)
- Delete reports or folders with the trash icon

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── generate-report/    # Claude AI integration
│   │   └── execute-query/      # Query execution endpoint
│   └── page.tsx                # Main app page
├── components/
│   ├── visualizations/         # Chart components
│   ├── chat-interface.tsx      # Chat UI
│   ├── folder-sidebar.tsx      # Folder management
│   └── report-viewer.tsx       # Report display
├── lib/
│   ├── supabase.ts            # Supabase client
│   ├── query-generator.ts     # SQL query builder
│   └── types.ts               # TypeScript types
└── supabase/
    └── schema.sql             # Database schema
```

## MVP Scope

This is an MVP with the following limitations:

- ❌ No authentication
- ❌ No connection management UI (uses env vars)
- ❌ Single Supabase instance for both app data and analytics
- ✅ AI-powered report generation
- ✅ Predefined component library
- ✅ Folder organization
- ✅ Real-time data from Supabase

## Future Enhancements

- Multi-user authentication
- Multiple data source connections
- Custom SQL queries
- Report sharing and collaboration
- Scheduled reports
- Export to PDF/CSV
- Dashboard creation
- Component customization

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

MIT
