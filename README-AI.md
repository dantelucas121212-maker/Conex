# CONEX AI backend

This backend connects the existing CONEX webpage to either OpenAI or Google Gemini without exposing an API key in the browser.

## Run locally

```bash
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3000`. Turn **Web Access** on inside CONEX before using the ChatGPT Helper.

## Provider setup

Choose one provider in `.env`:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

Or use Gemini:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
```

Never put either API key in `Conex` or commit a real `.env` file. The frontend only calls `/api/chat`; the backend keeps the secret.
