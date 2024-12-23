import { ethers } from 'ethers';

export class ProviderService {
  private static instance: ProviderService;
  private providers: ethers.JsonRpcProvider[];
  private currentProviderIndex: number;
  private readonly rpcUrls = [
    'https://bsc.getblock.io/mainnet/?api_key=null',
    'https://bsc.blockpi.network/v1/rpc/public',
    'https://1rpc.io/bnb',
    'https://bsc.rpc.blxrbdn.com',
    'https://bsc.drpc.org'
  ];

  private constructor() {
    this.providers = this.rpcUrls.map(url => {
      const provider = new ethers.JsonRpcProvider(url);
      provider.pollingInterval = 12000; // Increase polling interval
      return provider;
    });
    this.currentProviderIndex = 0;
  }

  public static getInstance(): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService();
    }
    return ProviderService.instance;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getProvider(): Promise<ethers.JsonRpcProvider> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        const provider = this.providers[this.currentProviderIndex];
        await provider.getBlockNumber();
        return provider;
      } catch (error) {
        console.log(`Provider ${this.currentProviderIndex} failed, attempt ${retryCount + 1}/${maxRetries}`);
        retryCount++;
        
        // Add exponential backoff
        const backoffDelay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await this.delay(backoffDelay);
        
        if (retryCount === maxRetries) {
          return this.switchProvider();
        }
      }
    }

    throw new Error('All providers failed');
  }

  async switchProvider(): Promise<ethers.JsonRpcProvider> {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    const newProvider = this.providers[this.currentProviderIndex];
    
    try {
      await newProvider.getBlockNumber();
      console.log(`Switched to provider ${this.currentProviderIndex}`);
      return newProvider;
    } catch (error) {
      if (this.currentProviderIndex === 0) {
        throw new Error('All providers failed');
      }
      await this.delay(2000); // Add delay before trying next provider
      return this.switchProvider();
    }
  }
}

export const providerService = ProviderService.getInstance();