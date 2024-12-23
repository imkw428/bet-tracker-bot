import { ethers } from 'ethers';
import { RPC_ENDPOINTS, REQUEST_DELAY, RATE_LIMIT_DELAY, MAX_RETRIES } from './constants';

export class ProviderService {
  private provider: ethers.JsonRpcProvider;
  private currentRpcIndex: number = 0;
  private retryCount: number = 0;
  private readonly normalPollingInterval = 5000;
  private readonly intensivePollingInterval = 2000;
  private lastRequestTime: number = 0;
  private failedEndpoints: Set<string> = new Set();
  private connectionAttempts: Map<string, number> = new Map();

  constructor() {
    this.provider = this.createProvider();
  }

  private createProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[this.currentRpcIndex], {
      chainId: 56,
      name: 'bnb',
      ensAddress: null,
      timeout: 15000 // Increased timeout
    });
    
    provider.pollingInterval = this.normalPollingInterval;
    
    provider.on('error', (error) => {
      console.error(`Provider error on ${RPC_ENDPOINTS[this.currentRpcIndex]}:`, error);
      this.failedEndpoints.add(RPC_ENDPOINTS[this.currentRpcIndex]);
    });

    return provider;
  }

  private async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    // Calculate delay based on retry count and rate limit status
    const baseDelay = this.retryCount > 0 ? RATE_LIMIT_DELAY : REQUEST_DELAY;
    const minDelay = baseDelay * Math.pow(1.5, this.retryCount); // Gentler exponential backoff
    
    if (timeSinceLastRequest < minDelay) {
      const waitTime = minDelay - timeSinceLastRequest;
      console.log(`Waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private getNextValidRpcIndex(): number {
    let attempts = 0;
    const maxAttempts = RPC_ENDPOINTS.length * 2; // Allow multiple passes through the list
    
    while (attempts < maxAttempts) {
      const nextIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
      const endpoint = RPC_ENDPOINTS[nextIndex];
      const failCount = this.connectionAttempts.get(endpoint) || 0;
      
      if (!this.failedEndpoints.has(endpoint) && failCount < 3) {
        return nextIndex;
      }
      
      this.currentRpcIndex = nextIndex;
      attempts++;
    }
    
    // Reset everything if we've tried all endpoints
    this.failedEndpoints.clear();
    this.connectionAttempts.clear();
    return 0;
  }

  async switchToNextRpc(): Promise<ethers.JsonRpcProvider> {
    await this.waitForRateLimit();
    
    console.log(`Switching from RPC endpoint ${RPC_ENDPOINTS[this.currentRpcIndex]}`);
    this.currentRpcIndex = this.getNextValidRpcIndex();
    const currentEndpoint = RPC_ENDPOINTS[this.currentRpcIndex];
    
    try {
      this.provider = this.createProvider();
      await this.testConnection();
      console.log(`Successfully connected to ${currentEndpoint}`);
      this.retryCount = 0;
      return this.provider;
    } catch (error: any) {
      console.error(`Failed to connect to RPC endpoint ${currentEndpoint}:`, error);
      
      // Track connection attempts
      const failCount = (this.connectionAttempts.get(currentEndpoint) || 0) + 1;
      this.connectionAttempts.set(currentEndpoint, failCount);
      
      // Handle rate limits
      if (error.body?.includes('rate limit') || error.message?.includes('rate limit')) {
        console.log('Rate limit detected, adding longer delay');
        this.retryCount++;
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
      
      this.failedEndpoints.add(currentEndpoint);
      
      if (this.failedEndpoints.size === RPC_ENDPOINTS.length) {
        this.retryCount++;
        if (this.retryCount >= MAX_RETRIES) {
          throw new Error('All RPC nodes failed to connect after maximum retries');
        }
        this.failedEndpoints.clear();
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY * Math.pow(2, this.retryCount)));
      }
      
      return this.switchToNextRpc();
    }
  }

  private async testConnection(): Promise<void> {
    const network = await this.provider.getNetwork();
    if (network.chainId !== 56n) {
      throw new Error('Invalid chain ID');
    }
  }

  async getProvider(): Promise<ethers.JsonRpcProvider> {
    await this.waitForRateLimit();
    
    try {
      await this.testConnection();
      return this.provider;
    } catch (error) {
      console.error('Current provider unhealthy, switching to next RPC');
      return this.switchToNextRpc();
    }
  }

  setPollingInterval(intensive: boolean) {
    this.provider.pollingInterval = intensive ? this.intensivePollingInterval : this.normalPollingInterval;
  }

  async isProviderHealthy(): Promise<boolean> {
    try {
      await this.waitForRateLimit();
      await this.testConnection();
      return true;
    } catch {
      return false;
    }
  }
}