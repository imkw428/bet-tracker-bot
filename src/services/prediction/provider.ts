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
  private static instance: ProviderService;

  private constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[0], {
      chainId: 56,
      name: 'bnb',
      ensAddress: null
    });
  }

  public static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  private async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = REQUEST_DELAY * Math.pow(2, this.retryCount);
    
    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
  }

  private getNextAvailableRpc(): string {
    const availableRpcs = RPC_ENDPOINTS.filter(rpc => !this.failedNodes.has(rpc));
    if (availableRpcs.length === 0) {
      this.failedNodes.clear();
      return RPC_ENDPOINTS[0];
    }
    
    this.currentRpcIndex = (this.currentRpcIndex + 1) % availableRpcs.length;
    return availableRpcs[this.currentRpcIndex];
  }

  public async getProvider(): Promise<ethers.JsonRpcProvider> {
    await this.waitForRateLimit();

    try {
      // 嘗試使用現有的 provider
      await this.provider.getBlockNumber();
      return this.provider;
    } catch (error) {
      if (this.retryCount >= this.maxRetries) {
        this.retryCount = 0;
        throw new Error('Maximum retry attempts exceeded');
      }

      console.log(`Provider failed, switching to next RPC. Attempt ${this.retryCount + 1}/${this.maxRetries}`);
      
      const nextRpc = this.getNextAvailableRpc();
      this.failedNodes.add(this.provider.connection.url);
      
      try {
        const newProvider = new ethers.JsonRpcProvider(nextRpc, {
          chainId: 56,
          name: 'bnb',
          ensAddress: null
        });
        
        await newProvider.getBlockNumber(); // 測試新的連接
        this.provider = newProvider;
        this.retryCount = 0;
        return this.provider;
      } catch (error) {
        this.retryCount++;
        this.failedNodes.add(nextRpc);
        return this.getProvider(); // 遞迴重試
      }
    }
  }
}

export const providerService = ProviderService.getInstance();