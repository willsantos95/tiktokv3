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
