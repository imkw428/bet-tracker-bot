import { ethers } from 'ethers';
import { BSC_NETWORK, RPC_ENDPOINTS } from './constants';

export class ProviderManager {
  createProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(
      RPC_ENDPOINTS[0],
      BSC_NETWORK,
      {
        staticNetwork: null,
        batchMaxCount: 1,
        polling: true,
        pollingInterval: 15000,
        cacheTimeout: -1,
      }
    );

    return provider;
  }
}