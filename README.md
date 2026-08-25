# Note-MakerApp

## Run the working version

1. Create a Gemini API key in Google AI Studio at https://aistudio.google.com/app/apikey.
2. Copy `.env.example` to `.env.local`.
3. Open `.env.local` and replace `your_gemini_api_key_here` with your key.
4. Restart the development server with `npm.cmd run dev`.
5. Open http://localhost:3000 and enter a topic.

The app uses Gemini 3.6 Flash. Google AI Studio provides a free tier with rate and usage limits; it is not unlimited anonymous access. The key stays in `.env.local`, which is ignored by git. Never put it in a client component or commit it.