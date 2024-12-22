import { ethers } from 'ethers';
import { RPC_ENDPOINTS } from './constants';

export class ProviderService {
  private static instance: ProviderService;
  private provider: ethers.JsonRpcProvider;
  private currentRpcIndex: number = 0;

  private constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[0]);
  }

  public static getInstance(): ProviderService {
    if (!this.instance) {
      this.instance = new ProviderService();
    }
    return this.instance;
  }

  async getProvider(): Promise<ethers.JsonRpcProvider> {
    return this.provider;
  }

  async switchProvider(): Promise<ethers.JsonRpcProvider> {
    this.currentRpcIndex = (this.currentRpcIndex + 1) % RPC_ENDPOINTS.length;
    const newRpcUrl = RPC_ENDPOINTS[this.currentRpcIndex];
    this.provider = new ethers.JsonRpcProvider(newRpcUrl);
    return this.provider;
  }
}

export const providerService = ProviderService.getInstance();