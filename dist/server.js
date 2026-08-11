import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, validateConfig } from './config/index.js';
import { logger } from './shared/utils/logger.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { authRoutes } from './modules/auth/routes.js';
import { videoRoutes } from './modules/video/routes.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Validate configuration
validateConfig();
const app = express();
// Security middleware
app.use(helmet());
// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = (config.corsOrigin || '').split(',').map(o => o.trim()).filter(o => o);
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Body parser middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
// Session configuration
app.use(session({
    name: 'sessionId',
    secret: config.session.secret,
    resave: false,
    saveUninitialized: true,
    proxy: config.env === 'production',
    cookie: {
        secure: config.env === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: config.session.maxAge,
    },
}));
logger.info('📋 Session middleware configured', {
    env: config.env,
    secure: config.env === 'production',
    sameSite: 'lax',
    saveUninitialized: true,
});
// Serve static files (HTML, CSS, JS)
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));
logger.info(`📁 Serving static files from: ${publicDir}`);
// Request logging middleware
app.use((req, res, next) => {
    logger.http(`${req.method} ${req.path}`);
    next();
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'TikTok Login & Upload Server',
        data: {
            version: config.api.version,
            status: 'running',
            environment: config.env,
            mode: config.tiktok.sandbox ? 'SANDBOX' : 'PRODUCTION',
            endpoints: {
                auth: `/api/${config.api.version}/auth`,
                video: `/api/${config.api.version}/video`,
                health: '/health',
            },
        },
        timestamp: new Date(),
    });
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is healthy',
        data: {
            timestamp: new Date(),
            environment: config.env,
            tikTokMode: config.tiktok.sandbox ? 'SANDBOX' : 'PRODUCTION',
        },
        timestamp: new Date(),
    });
});
// API Routes
const apiBaseUrl = `/api/${config.api.version}`;
app.use(`${apiBaseUrl}/auth`, authRoutes);
app.use(`${apiBaseUrl}/video`, videoRoutes);
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: 'Endpoint not found',
        },
        timestamp: new Date(),
    });
});
// Error handler (must be last)
app.use(errorHandler);
// Start server
const PORT = config.port;
app.listen(PORT, () => {
    logger.info('🚀 TikTok Login & Upload Server Started', {
        port: PORT,
        environment: config.env,
        mode: config.tiktok.sandbox ? '🧪 SANDBOX' : '🌐 PRODUCTION',
        apiBaseUrl,
    });
    if (config.env === 'development') {
        logger.info('📍 Health check: http://localhost:${PORT}/health');
        logger.info('📍 API docs: Swagger coming soon');
    }
});
export default app;
//# sourceMappingURL=server.js.map