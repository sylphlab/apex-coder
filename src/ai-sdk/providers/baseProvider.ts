import type { LanguageModel } from 'ai';

/**
 * Base interface for all AI providers
 */
export interface AIProvider {
    /**
     * Get the provider name
     */
    getName(): string;
    
    /**
     * Create an AI model instance
     * @param modelId The model ID to use
     * @param credentials Provider-specific credentials
     */
    createModel(modelId: string, credentials: Record<string, any>): Promise<LanguageModel>;
    
    /**
     * Get available models for this provider
     * @param credentials Provider-specific credentials (optional for some providers)
     */
    getAvailableModels(credentials?: Record<string, any>): Promise<string[]>;
    
    /**
     * Validate credentials for this provider
     * @param credentials Provider-specific credentials
     */
    validateCredentials(credentials: Record<string, any>): Promise<boolean>;
    
    /**
     * Get required credential fields for this provider
     */
    getRequiredCredentialFields(): string[];
}

/**
 * Base abstract class for AI providers
 */
export abstract class BaseAIProvider implements AIProvider {
    protected readonly providerName: string;
    
    constructor(providerName: string) {
        this.providerName = providerName;
    }
    
    getName(): string {
        return this.providerName;
    }
    
    abstract createModel(modelId: string, credentials: Record<string, any>): Promise<LanguageModel>;
    
    abstract getAvailableModels(credentials?: Record<string, any>): Promise<string[]>;
    
    abstract validateCredentials(credentials: Record<string, any>): Promise<boolean>;
    
    abstract getRequiredCredentialFields(): string[];
}