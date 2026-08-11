import crypto from 'crypto';
import { logger } from '../../../shared/utils/logger.js';
import { OAUTH_STATE_TTL } from '../../../shared/constants/error-codes.js';
export class StateService {
    constructor() {
        this.states = new Map();
    }
    generateState() {
        return crypto.randomBytes(16).toString('hex');
    }
    storeState(state) {
        const oauthState = {
            state,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + OAUTH_STATE_TTL),
        };
        this.states.set(state, oauthState);
        // Clean up expired states
        this.cleanupExpiredStates();
        logger.info('💾 OAuth state stored', {
            state: state.substring(0, 8) + '...',
            expiresIn: `${OAUTH_STATE_TTL / 1000 / 60} minutes`,
        });
        return oauthState;
    }
    validateState(state) {
        const storedState = this.states.get(state);
        if (!storedState) {
            logger.warn('❌ OAuth state not found or expired', {
                state: state.substring(0, 8) + '...',
            });
            return false;
        }
        if (new Date() > storedState.expiresAt) {
            logger.warn('❌ OAuth state expired', {
                state: state.substring(0, 8) + '...',
            });
            this.states.delete(state);
            return false;
        }
        // Remove the state after validation (one-time use)
        this.states.delete(state);
        logger.info('✅ OAuth state validated', {
            state: state.substring(0, 8) + '...',
        });
        return true;
    }
    cleanupExpiredStates() {
        const now = new Date();
        let cleanedCount = 0;
        for (const [state, data] of this.states.entries()) {
            if (now > data.expiresAt) {
                this.states.delete(state);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger.debug(`🧹 Cleaned up ${cleanedCount} expired OAuth states`);
        }
    }
}
export const stateService = new StateService();
//# sourceMappingURL=state.service.js.map