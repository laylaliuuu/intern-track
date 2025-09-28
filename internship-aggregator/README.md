# InternTrack - Real-time Internship Aggregator

A Next.js application that aggregates and surfaces the freshest internship opportunities for college students in real-time.

## Project Foundation Setup ✅

This project has been initialized with the following core infrastructure:

### Technology Stack
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS with Shadcn UI configuration
- **Database**: Supabase (PostgreSQL with real-time subscriptions)
- **Data Fetching**: React Query (@tanstack/react-query)
- **Table Rendering**: TanStack Table + TanStack Virtual
- **Validation**: Zod schemas
- **Rate Limiting**: p-limit for API concurrency control

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   └── ui/                # Shadcn UI components
├── lib/                   # Utility functions and configurations
│   ├── supabase.ts        # Supabase client setup
│   └── utils.ts           # Utility functions (cn helper)
├── providers/             # React context providers
│   └── query-provider.tsx # React Query provider
├── types/                 # TypeScript type definitions
│   └── index.ts           # Core types (Internship, Company, etc.)
└── hooks/                 # Custom React hooks
```

### Environment Variables
⚠️ **SECURITY**: Never commit API keys to git. The `.env.local` file is already in `.gitignore`.

Copy `.env.example` to `.env.local` and configure:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key  
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (keep secret!)
- `EXA_API_KEY`: Your Exa.ai API key

### Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Next Steps

The project foundation is complete. Ready to implement:
- Task 2: Create database schema and core data models
- Task 3: Build ingestion and normalization system
- Task 4: Create API layer and data access
- Task 5: Build core frontend components

### Build & Deploy

```bash
# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Requirements Addressed

This setup addresses the following requirements from the specification:

- **Requirement 7.3**: TypeScript strict mode and performant table virtualization setup
- **Requirement 7.5**: Secure environment configuration and error handling foundation

## Architecture Overview

The application follows a modern React architecture with:
- Server-side rendering with Next.js App Router
- Client-side state management with React Query
- Real-time data synchronization with Supabase
- Component-based UI with Shadcn UI and Tailwind CSS
- Type-safe development with TypeScript strict mode