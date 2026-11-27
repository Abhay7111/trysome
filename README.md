# Trysome

Trysome is a social app built with a React/Vite client and an Express/MongoDB API. It supports posts, profiles, follows, private accounts, Explore, and direct messages.

## Features

- Create text and image posts; edit, delete, save, like, and comment on posts.
- Explore public posts, users, and hashtags.
- Follow users and approve or decline follow requests for private accounts.
- View private-profile posts only after the owner accepts your follow request. Posts marked **Only me** remain visible only to their author.
- Chat with users who mutually follow each other.
- Share posts using the device's share sheet or copy a post link.
- Switch between light and dark themes.

## Run locally

Requirements: Node.js/npm, a MongoDB database, and an ImageKit private key if you want to upload images.

1. Create `server/.env` with the server configuration:

   ```dotenv
   PORT=3000
   MONGO_URI=your_mongodb_connection_string
   JWT_SCRET=your_jwt_signing_secret
   IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
   ```

   The server currently reads the JWT variable as `JWT_SCRET` (spelled exactly this way). Keep real credentials out of source control.

2. Start the API:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

   The API is available at `http://localhost:3000/api`; `http://localhost:3000/` is the server health check.

3. In a second terminal, start the client:

   ```powershell
   cd clint
   npm install
   npm run dev
   ```

   Open the Vite URL, normally `http://localhost:5173`. During Vite development on `localhost` or `127.0.0.1`, the client uses the local API. Production uses the Render API; the Netlify site proxies `/api` requests to it through [netlify.toml](./netlify.toml).

## Client routes

Sign in or register before using the social app routes.

| Route | Purpose |
| --- | --- |
| `/` or `/home` | Home feed, post composer, and post actions |
| `/explore` | Search public posts, users, and hashtags |
| `/chats` | Direct messages; chatting requires a mutual follow |
| `/notifications` | View likes, follows, mentions, and message notifications |
| `/profile` | View and manage your own profile and posts |
| `/users/:userId` | View another user's profile; `:userId` can be their account ID |
| `/users/:userId?post=:postId` | Open a shared post on its author's profile |
| `/settings` | Change theme and profile privacy, manage follow requests and blocked accounts |
| `/login` | Sign in |
| `/register` | Create an account |

Unknown routes redirect to `/home`.

## API route groups

All API routes are under `/api`.

| Prefix | Examples | Purpose |
| --- | --- | --- |
| `/api/auth` | `POST /register`, `POST /login`, `POST /logout`, `GET /getme`, `PATCH /profile`, `PATCH /profile/privacy` | Authentication and account settings |
| `/api` | `GET /`, `GET /explore/search`, `GET /explore/highlights` | Public feed and authenticated Explore data |
| `/api/post` | `GET /feed`, `GET /mine`, `POST /tweet`, `PATCH /:postId`, `DELETE /:postId`, `POST /:postId/like`, `POST /:postId/save`, `POST /:postId/comments` | Post creation and interactions |
| `/api/users` | `GET /:userId`, `GET /:userId/stats`, `GET /:userId/followers`, `GET /:userId/following`, `POST /:userId/follow`, `POST /:userId/block`, `GET /follow-requests`, `PATCH /follow-requests/:userId` | Profiles, follower lists, and follow/block actions |
| `/api/chat` | `GET` or `POST /conversations`, `GET` or `POST /conversations/:conversationId/messages`, `DELETE /conversations/:conversationId/messages` (delete your messages), `DELETE /conversations/:conversationId/messages/:messageId`, `PATCH /conversations/:conversationId/read`, `DELETE /conversations/:conversationId` | Conversations and messages |
| `/api/notifications` | `GET /`, `GET /unread-count`, `PATCH /read` | Activity notifications and unread counts |

Most API endpoints require the signed-in user's authentication cookie. The unauthenticated `GET /api/` endpoint returns public-account posts only.

## Checks

Run the client production build and linter from `clint/`:

```powershell
npm run build
npm run lint
```
