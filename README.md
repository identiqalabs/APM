# APM — Website Widget App

A small web app for keeping a list of monitored websites ("widgets"). Each
widget has a **name**, a **URL** and an optional **description**. Signed-in
users can add, view and delete them from a simple dashboard.

It runs either as a normal Node.js server or as an **AWS Lambda** function.

## Tech stack

Node.js (ES modules) · Express 4 · express-session · MongoDB (Mongoose) · `serverless-http` · plain HTML/CSS/JS frontend

## Features

- Login page with a single admin account (username and password from configuration)
- Session-based authentication (`express-session`)
- Create, list and delete website widgets, stored in MongoDB (`widget_app` database)
- Caching disabled on every response, so the browser's Back button can't show protected pages after logout

## Project layout

```
server.js          Express app: auth, widget API, static pages
lambda.js          AWS Lambda entry point (wraps server.js with serverless-http)
public/
  index.html       Login page
  app.html         Widget dashboard
  app.js           Dashboard logic
  styles.css       Styles
  identiqa.png     Logo
```

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/login` | — | Sign in with `{ "username", "password" }` |
| `POST` | `/api/logout` | — | End the session |
| `GET` / `HEAD` | `/api/auth-check` | ✅ | Returns 200 if signed in |
| `GET` | `/api/widgets` | ✅ | List widgets |
| `POST` | `/api/widgets` | ✅ | Create a widget: `{ "name", "url", "description"? }` |
| `DELETE` | `/api/widgets/:id` | ✅ | Delete a widget |
| `GET` | `/` | — | Login page |
| `GET` | `/app.html`, `/APMWidgetApp` | — | Dashboard page (it checks auth on load) |

## Configuration

Create a `.env` file in the project root:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `SESSION_SECRET` | Long random string used to sign session cookies |
| `ADMIN_USERNAME` | Login username |
| `ADMIN_PASSWORD` | Login password |
| `PORT` | Local port (default `3000`) |

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/?appName=<app>
SESSION_SECRET=<long-random-string>
ADMIN_USERNAME=<username>
ADMIN_PASSWORD=<password>
```

> Keep real values out of git. Set all of these explicitly in production;
> don't rely on the fallback values in `server.js`.

## Running locally

```bash
npm install
npm run dev      # nodemon, restarts on change
# or
npm start
```

Open `http://localhost:3000` and sign in.

## Deploying to AWS Lambda

1. Install production dependencies: `npm install --omit=dev`
2. Zip the project (including `node_modules` and `public/`) and upload it to a Lambda function.
3. Set the handler to `lambda.handler` and the runtime to Node.js 18 or newer.
4. Add the variables from the table above as Lambda environment variables.
5. Expose it with a Function URL or API Gateway.

On Lambda (when `AWS_LAMBDA_FUNCTION_NAME` is set), the app does not open its own
port; `lambda.js` handles requests instead.
