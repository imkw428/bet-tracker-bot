import { ethers } from 'ethers';
import { RPC_ENDPOINTS, REQUEST_DELAY } from './constants';

export class ProviderService {
  private provider: ethers.JsonRpcProvider;
  private currentRpcIndex: number = 0;
  private retryCount: number = 0;
  private readonly maxRetries: number = 5; // Increased from 3
  private readonly normalPollingInterval = 5000; // Increased from 3000
  private readonly intensivePollingInterval = 2000; // Increased from 1000
  private lastRequestTime: number = 0;
  private failedEndpoints: Set<string> = new Set();

  constructor() {
    this.provider = this.createProvider();
  }

  private createProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[this.currentRpcIndex], {
      chainId: 56,
      name: 'bnb',
      ensAddress: null,
      staticNetwork: true // Add static network optimization
    });
    
    provider.pollingInterval = this.normalPollingInterval;
    
    // Add event listeners for connection issues
    provider.on('error', (error) => {
      console.error(`Provider error on ${RPC_ENDPOINTS[this.currentRpcIndex]}:`, error);
      this.failedEndpoints.add(RPC_ENDPOINTS[this.currentRpcIndex]);
    });

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

  private getNextValidRpcIndex(): number {
    let attempts = 0;
    while (attempts < RPC_ENDPOINTS.length) {
      const nextIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
      if (!this.failedEndpoints.has(RPC_ENDPOINTS[nextIndex])) {
        return nextIndex;
      }
      this.currentRpcIndex = nextIndex;
      attempts++;
    }
    // If all endpoints have failed, reset and try again
    this.failedEndpoints.clear();
    return 0;
  }

  async switchToNextRpc(): Promise<ethers.JsonRpcProvider> {
    await this.waitForRateLimit();
    
    console.log(`Switching from RPC endpoint ${RPC_ENDPOINTS[this.currentRpcIndex]}`);
    this.currentRpcIndex = this.getNextValidRpcIndex();
    
    try {
      this.provider = this.createProvider();
      // Test the connection
      const network = await this.provider.getNetwork();
      if (network.chainId !== 56n) {
        throw new Error('Invalid chain ID');
      }
      console.log(`Successfully connected to ${RPC_ENDPOINTS[this.currentRpcIndex]}`);
      this.retryCount = 0;
      return this.provider;
    } catch (error) {
      console.error(`Failed to connect to RPC endpoint ${RPC_ENDPOINTS[this.currentRpcIndex]}:`, error);
      this.failedEndpoints.add(RPC_ENDPOINTS[this.currentRpcIndex]);
      
      if (this.failedEndpoints.size === RPC_ENDPOINTS.length) {
        this.retryCount++;
        if (this.retryCount >= this.maxRetries) {
          throw new Error('All RPC nodes failed to connect after maximum retries');
        }
        // Reset failed endpoints and try again with increased delay
        this.failedEndpoints.clear();
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY * Math.pow(2, this.retryCount)));
      }
      
      return this.switchToNextRpc();
    }
  }

  async getProvider(): Promise<ethers.JsonRpcProvider> {
    await this.waitForRateLimit();
    
    try {
      // Test if current provider is healthy
      await this.provider.getNetwork();
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
      const network = await this.provider.getNetwork();
      return network.chainId === 56n;
    } catch {
      return false;
    }
  }
}