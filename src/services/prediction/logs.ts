import { ethers } from 'ethers';
import { BLOCKS_PER_QUERY } from './constants';
import { providerService } from './provider';
import { WalletHistory } from './types';

export class LogService {
  private async getBlockRanges(fromBlock: number, toBlock: number): Promise<[number, number][]> {
    const ranges: [number, number][] = [];
    const batchSize = BLOCKS_PER_QUERY;
    
    for (let start = fromBlock; start <= toBlock; start += batchSize) {
      const end = Math.min(start + batchSize - 1, toBlock);
      ranges.push([start, end]);
      // 增加查詢間隔到10秒，減少API調用頻率
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    return ranges;
  }

  async queryLogsInBatches(address: string): Promise<WalletHistory> {
    const provider = await providerService.getProvider();
    const latestBlock = await provider.getBlockNumber();
    // 減少查詢區塊範圍，只查詢最近50個區塊
    const fromBlock = latestBlock - 50;
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
        // 增加查詢間隔到8秒
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        const logs = await provider.getLogs({
          ...filter,
          fromBlock: start,
          toBlock: end
        });

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
      } catch (error) {
        console.error(`Error fetching logs for range ${start}-${end}:`, error);
        // 註解掉錯誤重試的等待時間
        // await new Promise(resolve => setTimeout(resolve, 15000));
        continue;
      }
    }

    return history;
  }
}

export const logService = new LogService();