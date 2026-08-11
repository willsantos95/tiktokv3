import session from 'express-session';
import { SessionUser } from './index.js';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
  }
}
