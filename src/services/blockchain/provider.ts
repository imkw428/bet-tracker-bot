import { ethers } from 'ethers';
import { BSC_NETWORK, RPC_ENDPOINTS } from './constants';

export class ProviderManager {
  private currentRpcIndex: number = 0;
  private consecutiveFailures: number = 0;

  createProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(
      RPC_ENDPOINTS[this.currentRpcIndex],
      BSC_NETWORK,
      {
        staticNetwork: null,
        batchMaxCount: 1,
        polling: true,
        pollingInterval: 15000,
        cacheTimeout: -1,
      }
    );

    provider.on("error", () => {
      this.switchToNextRpc();
    });

    return provider;
  }

  async switchToNextRpc(): Promise<ethers.JsonRpcProvider> {
    this.consecutiveFailures++;
    const backoffDelay = Math.min(
      8000 * Math.pow(2, this.consecutiveFailures - 1),
      45000
    );
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    
    this.currentRpcIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    return this.createProvider();
  }

  resetFailures() {
    this.consecutiveFailures = 0;
  }
}