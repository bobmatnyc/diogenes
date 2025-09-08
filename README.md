# Diogenes - The Digital Cynic

A contrarian AI chatbot that challenges conventional thinking through Socratic dialogue and philosophical provocation.

## POC 1 Features

- Fixed password authentication (password: diogenes2024)
- Chat interface with streaming responses
- Session management using localStorage
- Core Diogenean system prompt
- Integration with OpenRouter API

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

## Environment Variables

Create a `.env.local` file with:

```
OPENROUTER_API_KEY=your_openrouter_api_key
NEXT_PUBLIC_APP_PASSWORD=diogenes2024
```

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- Vercel AI SDK for streaming
- OpenRouter for LLM access

## Deployment

Deploy to Vercel:

```bash
vercel
```

Or push to GitHub and connect to Vercel for automatic deployments.