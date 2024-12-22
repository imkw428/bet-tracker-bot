import { ethers } from 'ethers';

export class ProviderService {
  private static instance: ProviderService;
  private providers: ethers.JsonRpcProvider[];
  private currentProviderIndex: number;
  private readonly rpcUrls = [
    'https://bsc-dataseed1.binance.org',
    'https://bsc-dataseed2.binance.org',
    'https://bsc-dataseed3.binance.org',
    'https://bsc-dataseed4.binance.org',
    'https://bsc-dataseed.binance.org',
  ];

  private constructor() {
    this.providers = this.rpcUrls.map(url => new ethers.JsonRpcProvider(url));
    this.currentProviderIndex = 0;
  }

  public static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  async getProvider(): Promise<ethers.JsonRpcProvider> {
    const provider = this.providers[this.currentProviderIndex];
    try {
      await provider.getBlockNumber();
      return provider;
    } catch (error) {
      console.log('Provider failed, switching to next provider');
      return this.switchProvider();
    }
  }

  async switchProvider(): Promise<ethers.JsonRpcProvider> {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    const newProvider = this.providers[this.currentProviderIndex];
    
    try {
      await newProvider.getBlockNumber();
      return newProvider;
    } catch (error) {
      if (this.currentProviderIndex === 0) {
        throw new Error('All providers failed');
      }
      return this.switchProvider();
    }
  }
}

export const providerService = ProviderService.getInstance();