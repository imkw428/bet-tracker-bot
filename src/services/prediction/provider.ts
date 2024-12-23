import { ethers } from 'ethers';
import { RPC_ENDPOINTS, REQUEST_DELAY } from './constants';

export class ProviderService {
  private provider: ethers.JsonRpcProvider;
  private lastRequestTime: number = 0;
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor() {
    this.provider = this.createProvider();
  }

  private createProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[0], {
      chainId: 56,
      name: 'bnb',
      ensAddress: null
    });
    
    provider.pollingInterval = 5000;
    
    provider.on('error', (error) => {
      console.error('Provider error:', error);
      this.cleanup();
    });

    return provider;
  }

  private cleanup() {
    this.pendingRequests.clear();
    this.lastRequestTime = 0;
  }

  private async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < REQUEST_DELAY) {
      const waitTime = REQUEST_DELAY - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
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
      console.error('Provider error, recreating connection:', error);
      this.cleanup();
      this.provider = this.createProvider();
      await this.testConnection();
      return this.provider;
    }
  }

  setPollingInterval(intensive: boolean) {
    this.provider.pollingInterval = intensive ? 2000 : 5000;
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