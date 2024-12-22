import { ethers } from 'ethers';
import { RPC_ENDPOINTS, REQUEST_DELAY } from './constants';

export class ProviderService {
  private provider: ethers.JsonRpcProvider;
  private currentRpcIndex: number = 0;
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;
  private readonly normalPollingInterval = 3000;
  private readonly intensivePollingInterval = 1000;
  private lastRequestTime: number = 0;

  constructor() {
    this.provider = this.createProvider();
  }

  private createProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[this.currentRpcIndex], {
      chainId: 56,
      name: 'bnb',
      ensAddress: null
    });
    provider.pollingInterval = this.normalPollingInterval;
    return provider;
  }

  private async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = REQUEST_DELAY * (this.retryCount + 1);
    
    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
  }

  async switchToNextRpc(): Promise<ethers.JsonRpcProvider> {
    await this.waitForRateLimit();
    
    console.log(`Switching to next RPC endpoint, current index: ${this.currentRpcIndex}`);
    this.currentRpcIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    
    try {
      this.provider = this.createProvider();
      await this.provider.getNetwork();
      this.retryCount = 0; // Reset retry count on successful connection
      return this.provider;
    } catch (error) {
      console.error(`Failed to connect to RPC endpoint ${RPC_ENDPOINTS[this.currentRpcIndex]}:`, error);
      
      if (this.currentRpcIndex === 0) {
        this.retryCount++;
        // Exponential backoff with max delay of 30 seconds
        const delay = Math.min(REQUEST_DELAY * Math.pow(2, this.retryCount), 30000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      if (this.retryCount < this.maxRetries) {
        return this.switchToNextRpc();
      }
      
      throw new Error('All RPC nodes failed to connect');
    }
  }

  async getProvider(): Promise<ethers.JsonRpcProvider> {
    await this.waitForRateLimit();
    return this.provider;
  }

  setPollingInterval(intensive: boolean) {
    this.provider.pollingInterval = intensive ? this.intensivePollingInterval : this.normalPollingInterval;
  }

  async isProviderHealthy(): Promise<boolean> {
    try {
      await this.waitForRateLimit();
      await this.provider.getNetwork();
      return true;
    } catch {
      return false;
    }
  }
}