import { OAuthState } from '../../../types/index.js';
export declare class StateService {
    private states;
    generateState(): string;
    storeState(state: string): OAuthState;
    validateState(state: string): boolean;
    private cleanupExpiredStates;
}
export declare const stateService: StateService;
//# sourceMappingURL=state.service.d.ts.map