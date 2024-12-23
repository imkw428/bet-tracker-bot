import { ethers } from 'ethers';
import { RPC_ENDPOINTS, REQUEST_DELAY } from './constants';

export class ProviderService {
  private provider: ethers.JsonRpcProvider;
  private lastRequestTime: number = 0;
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private consecutiveErrors: number = 0;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private maxRequestsPerSecond: number = 30; // Reduced from 35

  constructor() {
    this.provider = this.createProvider();
    this.resetRequestCount();
  }

  private createProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[0], {
      chainId: 56,
      name: 'bnb',
      ensAddress: null
    });
    
    provider.pollingInterval = 8000; // Increased from 6000
    
    provider.on('error', (error) => {
      console.error('Provider error:', error);
      this.consecutiveErrors++;
      this.cleanup();
    });

    return provider;
  }

  private cleanup() {
    this.pendingRequests.clear();
    this.lastRequestTime = 0;
  }

  private resetRequestCount() {
    setInterval(() => {
      this.requestCount = 0;
      this.lastResetTime = Date.now();
    }, 1000);
  }

  private async waitForRateLimit() {
    if (this.requestCount >= this.maxRequestsPerSecond) {
      const timeUntilReset = 1000 - (Date.now() - this.lastResetTime);
      if (timeUntilReset > 0) {
        await new Promise(resolve => setTimeout(resolve, timeUntilReset + 500)); // Added buffer
      }
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < REQUEST_DELAY) {
      const waitTime = REQUEST_DELAY + (this.consecutiveErrors * 500); // Increased backoff multiplier
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  private async testConnection(): Promise<void> {
    const network = await this.provider.getNetwork();
    if (network.chainId !== 56n) {
      throw new Error('Invalid chain ID');
    }
    this.consecutiveErrors = 0;
  }

  async getProvider(): Promise<ethers.JsonRpcProvider> {
    await this.waitForRateLimit();
    
    try {
      await this.testConnection();
      return this.provider;
    } catch (error) {
      console.error('Provider error, recreating connection:', error);
      this.cleanup();
      this.provider = this.createProvider();
      await this.testConnection();
      return this.provider;
    }
  }

  setPollingInterval(intensive: boolean) {
    this.provider.pollingInterval = intensive ? 6000 : 10000; // Further increased intervals
  }
}