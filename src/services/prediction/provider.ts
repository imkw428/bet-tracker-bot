import { ethers } from 'ethers';
import { RPC_ENDPOINTS, REQUEST_DELAY } from './constants';

export class ProviderService {
  private provider: ethers.JsonRpcProvider;
  private currentRpcIndex: number = 0;
  private retryCount: number = 0;
  private readonly maxRetries: number = 5;
  private readonly normalPollingInterval = 5000;
  private readonly intensivePollingInterval = 2000;
  private lastRequestTime: number = 0;
  private failedNodes: Set<string> = new Set();

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
    const minDelay = REQUEST_DELAY * Math.pow(2, this.retryCount); // Exponential backoff
    
    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
  }

  private getNextAvailableRpc(): string | null {
    const availableRpcs = RPC_ENDPOINTS.filter(rpc => !this.failedNodes.has(rpc));
    if (availableRpcs.length === 0) {
      this.failedNodes.clear(); // Reset failed nodes if all are failed
      return RPC_ENDPOINTS[0];
    }
    return availableRpcs[Math.floor(Math.random() * availableRpcs.length)];
  }

  async switchToNextRpc(): Promise<ethers.JsonRpcProvider> {
    await this.waitForRateLimit();
    
    const nextRpc = this.getNextAvailableRpc();
    if (!nextRpc) {
      throw new Error('No available RPC nodes');
    }

    try {
      const newProvider = new ethers.JsonRpcProvider(nextRpc, {
        chainId: 56,
        name: 'bnb',
        ensAddress: null
      });
      
      await newProvider.getNetwork();
      this.provider = newProvider;
      this.retryCount = 0;
      return this.provider;
    } catch (error) {
      console.error(`Failed to connect to RPC ${nextRpc}:`, error);
      this.failedNodes.add(nextRpc);
      
      this.retryCount++;
      if (this.retryCount >= this.maxRetries) {
        throw new Error('All RPC nodes failed to connect');
      }
      
      return this.switchToNextRpc();
    }
  }

  async getProvider(): Promise<ethers.JsonRpcProvider> {
    await this.waitForRateLimit();
    
    try {
      await this.provider.getNetwork();
      return this.provider;
    } catch (error) {
      console.error('Current provider failed, switching to next RPC');
      return this.switchToNextRpc();
    }
  }

  setPollingInterval(intensive: boolean) {
    this.provider.pollingInterval = intensive ? 
      this.intensivePollingInterval : 
      this.normalPollingInterval;
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