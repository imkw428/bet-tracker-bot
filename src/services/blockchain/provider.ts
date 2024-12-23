import { ethers } from 'ethers';
import { BSC_NETWORK, RPC_ENDPOINTS, WS_ENDPOINT } from './constants';

export class ProviderManager {
  createProvider(): ethers.JsonRpcProvider {
    const provider = new ethers.JsonRpcProvider(
      RPC_ENDPOINTS[0],
      BSC_NETWORK,
      {
        staticNetwork: null,
        batchMaxCount: 1,
        polling: false,
        pollingInterval: 15000,
        cacheTimeout: -1,
      }
    );

    return provider;
  }

  createWebSocketProvider(): ethers.WebSocketProvider {
    const provider = new ethers.WebSocketProvider(
      WS_ENDPOINT,
      BSC_NETWORK
    );

    // In ethers v6, we need to handle the close event differently
    if (provider.websocket) {
      provider.websocket.addEventListener('close', () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(() => {
          this.createWebSocketProvider();
        }, 5000);
      });
    }

    return provider;
  }
}