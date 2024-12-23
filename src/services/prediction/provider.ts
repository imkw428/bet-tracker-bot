import { ethers } from 'ethers';
import { RPC_ENDPOINTS, REQUEST_DELAY } from './constants';
import { useToast } from "@/components/ui/use-toast";

export class ProviderService {
  private provider: ethers.JsonRpcProvider | ethers.WebSocketProvider;
  private currentRpcIndex: number = 0;
  private retryCount: number = 0;
  private readonly maxRetries: number = 3;
  private readonly normalPollingInterval = 5000;
  private readonly intensivePollingInterval = 2000;
  private lastRequestTime: number = 0;
  private failedNodes: Set<string> = new Set();

  constructor() {
    this.provider = this.createProvider();
  }

  private createProvider(): ethers.JsonRpcProvider | ethers.WebSocketProvider {
    const endpoint = RPC_ENDPOINTS[this.currentRpcIndex];
    
    if (typeof endpoint === 'object' && endpoint.ws) {
      return new ethers.WebSocketProvider(endpoint.ws, {
        chainId: 56,
        name: 'bnb',
        ensAddress: null
      });
    }

    const url = typeof endpoint === 'object' ? endpoint.http : endpoint;
    return new ethers.JsonRpcProvider(url, {
      chainId: 56,
      name: 'bnb',
      ensAddress: null
    });
  }

  private async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = REQUEST_DELAY;
    
    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
  }

  private getNextAvailableRpc(): string | { http: string; ws: string } | null {
    const availableRpcs = RPC_ENDPOINTS.filter((rpc) => {
      const url = typeof rpc === 'object' ? rpc.http : rpc;
      return !this.failedNodes.has(url);
    });
    
    if (availableRpcs.length === 0) {
      this.failedNodes.clear();
      return RPC_ENDPOINTS[0];
    }
    
    return availableRpcs[Math.floor(Math.random() * availableRpcs.length)];
  }

  async switchToNextRpc(): Promise<ethers.JsonRpcProvider | ethers.WebSocketProvider> {
    await this.waitForRateLimit();
    
    const nextRpc = this.getNextAvailableRpc();
    if (!nextRpc) {
      throw new Error('No available RPC nodes');
    }

    try {
      if (this.provider instanceof ethers.WebSocketProvider) {
        await this.provider.destroy();
      }

      const newProvider = typeof nextRpc === 'object' && nextRpc.ws
        ? new ethers.WebSocketProvider(nextRpc.ws, {
            chainId: 56,
            name: 'bnb',
            ensAddress: null
          })
        : new ethers.JsonRpcProvider(typeof nextRpc === 'object' ? nextRpc.http : nextRpc, {
            chainId: 56,
            name: 'bnb',
            ensAddress: null
          });
      
      await newProvider.getNetwork();
      this.provider = newProvider;
      this.retryCount = 0;
      return this.provider;
    } catch (error) {
      console.error(`Failed to connect to RPC ${JSON.stringify(nextRpc)}:`, error);
      const url = typeof nextRpc === 'object' ? nextRpc.http : nextRpc;
      this.failedNodes.add(url);
      
      this.retryCount++;
      if (this.retryCount >= this.maxRetries) {
        throw new Error('All RPC nodes failed to connect');
      }
      
      return this.switchToNextRpc();
    }
  }

  async getProvider(): Promise<ethers.JsonRpcProvider | ethers.WebSocketProvider> {
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
    if (this.provider instanceof ethers.JsonRpcProvider) {
      this.provider.pollingInterval = intensive ? 
        this.intensivePollingInterval : 
        this.normalPollingInterval;
    }
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