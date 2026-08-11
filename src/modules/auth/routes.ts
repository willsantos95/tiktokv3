import { Router } from 'express';
import { oauthController } from '../../modules/auth/controllers/oauth.controller.js';
import { authMiddleware } from '../../shared/middleware/auth.middleware.js';

export const authRoutes = Router();

// Public routes
authRoutes.get('/url', (req, res, next) => oauthController.getAuthUrl(req, res, next));
authRoutes.get('/callback', (req, res, next) => oauthController.handleCallback(req, res, next));
authRoutes.post('/logout', (req, res, next) => oauthController.logout(req, res, next));

// Protected routes
authRoutes.get('/user', authMiddleware, (req, res, next) => oauthController.getUser(req, res, next));

// Debug route - shows raw session data
authRoutes.get('/debug/session', (req, res) => {
  res.json({
    success: true,
    debug: {
      sessionId: req.sessionID,
      hasSession: !!req.session,
      sessionKeys: req.session ? Object.keys(req.session) : [],
      hasUser: !!req.session?.user,
      userKeys: req.session?.user ? Object.keys(req.session.user) : [],
      rawUser: req.session?.user || null,
      displayName: req.session?.user?.displayName,
      avatarUrl: req.session?.user?.avatarUrl,
    },
    timestamp: new Date(),
  });
});
