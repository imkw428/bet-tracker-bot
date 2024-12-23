import { ethers } from 'ethers';
import { BLOCKS_PER_QUERY, REQUEST_DELAY } from './constants';
import { providerService } from './provider';
import { WalletHistory } from './types';

export class LogService {
  private async getBlockRanges(fromBlock: number, toBlock: number): Promise<[number, number][]> {
    const ranges: [number, number][] = [];
    const batchSize = BLOCKS_PER_QUERY;
    
    for (let start = fromBlock; start <= toBlock; start += batchSize) {
      const end = Math.min(start + batchSize - 1, toBlock);
      ranges.push([start, end]);
    }
    return ranges;
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY * (i + 1)));
      }
    }
    
    throw lastError;
  }

  async queryLogsInBatches(address: string): Promise<WalletHistory> {
    const provider = await providerService.getProvider();
    
    const latestBlock = await this.retryOperation(async () => {
      return await provider.getBlockNumber();
    });
    
    // 只查詢最近5個區塊，進一步減少負載
    const fromBlock = latestBlock - 5;
    const ranges = await this.getBlockRanges(fromBlock, latestBlock);

    const filter = {
      address: "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA",
      topics: [
        [
          ethers.id("BetBull(address,uint256,uint256)"),
          ethers.id("BetBear(address,uint256,uint256)"),
          ethers.id("Claim(address,uint256,uint256)")
        ],
        ethers.zeroPadValue(address.toLowerCase(), 32)
      ]
    };

    const history: WalletHistory = {
      bulls: [],
      bears: [],
      claims: []
    };

    for (const [start, end] of ranges) {
      try {
        const logs = await this.retryOperation(async () => {
          return await provider.getLogs({
            ...filter,
            fromBlock: start,
            toBlock: end
          });
        });

        if (logs.length > 0) {
          console.log(`區塊 ${start}-${end} 發現 ${logs.length} 筆記錄`);
          
          for (const log of logs) {
            const event = log.topics[0];
            const epoch = Number(log.topics[2]);
            const amount = ethers.formatEther(log.topics[3]);

            if (event === ethers.id("BetBull(address,uint256,uint256)")) {
              history.bulls.push({ epoch, amount });
            } else if (event === ethers.id("BetBear(address,uint256,uint256)")) {
              history.bears.push({ epoch, amount });
            } else if (event === ethers.id("Claim(address,uint256,uint256)")) {
              history.claims.push({ epoch, amount });
            }
          }
          
          // 只在找到記錄時等待，避免不必要的延遲
          await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
        }
      } catch (error) {
        console.error(`查詢區塊 ${start}-${end} 失敗:`, error);
        // 遇到錯誤時切換節點
        await providerService.getProvider();
      }
    }

    return history;
  }
}

export const logService = new LogService();