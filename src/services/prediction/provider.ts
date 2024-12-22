import { ethers } from 'ethers';
import { RPC_ENDPOINTS } from './constants';

export class ProviderService {
  private static instance: ProviderService;
  private provider: ethers.JsonRpcProvider;
  private currentRpcIndex: number = 0;
  private pollingInterval: number = 5000;

  constructor() {
    if (ProviderService.instance) {
      return ProviderService.instance;
    }
    this.provider = new ethers.JsonRpcProvider(RPC_ENDPOINTS[0]);
    ProviderService.instance = this;
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

  setPollingInterval(intensive: boolean) {
    this.pollingInterval = intensive ? 2000 : 5000;
    // Note: Modern ethers.js doesn't support setPollingInterval directly
    // We'll use this value in our custom polling logic if needed
  }
}