# AI Finance Assistant

An AI-powered personal finance app. Track income and expenses, set budgets and savings goals, chat with an AI coach (typed or by voice), and fund your savings goals with PayPal. The AI proposes an action such as "add $25 to your Laptop goal", and money moves only after you approve the payment in PayPal Sandbox.

Built for the PayPal AI Hackathon.

## Features

- Dashboard with animated numbers, a clickable spending donut and a cash-flow chart
- Separate income and expense tracking, monthly budgets, savings goals with progress rings
- PayPal Sandbox payments (Orders v2 API: create order, buyer approves, server captures)
- AI chatbot with Google Gemini: answers from your own data and proposes a savings action that becomes a PayPal button
- Voice: speak to the chatbot (English or Tamil), hear replies, add transactions by voice
- Security: login with hashed passwords, private data per user, tokens revoked on logout, amounts hidden by default, hide with Esc, blur when idle, auto-lock after 2 minutes

## How PayPal and AI work together

1. You ask the AI "help me save for my laptop".
2. The backend sends a summary of your finances to Gemini and gets a reply plus a suggestion (goal and amount).
3. The backend validates the suggestion, then the app shows a PayPal button for that exact amount.
4. After you approve in PayPal, the backend captures the payment and your goal progress updates.

PayPal secrets and the Gemini key stay on the backend only.

## Tech stack
PayPal Developer Platform (Sandbox, Orders v2), Google Gemini API, React, Vite, Recharts, Node.js, Express.
## Run it locally
You need Node.js 18+, a free PayPal Developer account and a free Gemini API key.

1. Install:
   ```bash
   git clone https://github.com/mvazeemabanu-cell/AI-Finance-Assistant.git
   cd AI-Finance-Assistant
   npm install
   ```
2. PayPal: at developer.paypal.com switch to Sandbox, open Apps & Credentials, create an app, and copy the Client ID (starts with `A`) and the Secret. The sandbox Personal account (Testing tools > Sandbox accounts) is the buyer used to pay.
3. Gemini: create a key at aistudio.google.com.
4. Copy `.env.example` to `.env` and fill in the values. Make `SESSION_SECRET` with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
5. Terminal 1: `npm run server`
6. Terminal 2: `npm run dev`
7. Open http://localhost:5173, create an account, log in, and click Show to reveal amounts.

## Try it

1. Add income and some expenses.
2. Create a goal (for example Laptop, target 1000).
3. In the chatbot ask: "Add $25 to my Laptop goal".
4. Click the PayPal button and log in with the sandbox Personal account.
5. The goal and the PayPal Payments list update.

Voice works in Chrome or Edge.

## Security notes

Hackathon demo: passwords are hashed with scrypt and every API route needs a signed token. It uses plain http on localhost and JSON files. A production version needs HTTPS and a real database. Only PayPal Sandbox is used, so no real money moves.

## License

MIT, see LICENSE.