import { ethers } from 'ethers';
import { RPC_ENDPOINTS, REQUEST_DELAY } from './constants';

export class ProviderService {
  private provider: ethers.JsonRpcProvider;
  private currentRpcIndex: number = 0;
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;
  private readonly normalPollingInterval = 3000;
  private readonly intensivePollingInterval = 1000;

  constructor() {
    this.provider = this.createProvider();
  }

  private createProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[this.currentRpcIndex], {
      chainId: 56,
      name: 'bnb',
      ensAddress: null,
      staticNetwork: true // Add static network to reduce requests
    });
    provider.pollingInterval = this.normalPollingInterval;
    return provider;
  }

  async switchToNextRpc(): Promise<ethers.JsonRpcProvider> {
    console.log(`Switching to next RPC endpoint, current index: ${this.currentRpcIndex}`);
    this.currentRpcIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    
    try {
      this.provider = this.createProvider();
      // Add delay before testing connection
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
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

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  setPollingInterval(intensive: boolean) {
    this.provider.pollingInterval = intensive ? this.intensivePollingInterval : this.normalPollingInterval;
  }

  // Add method to check provider health
  async isProviderHealthy(): Promise<boolean> {
    try {
      await this.provider.getNetwork();
      return true;
    } catch {
      return false;
    }
  }
}