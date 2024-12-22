import { ethers } from 'ethers';
import { BLOCKS_PER_QUERY, PREDICTION_ADDRESS } from './constants';
import { WalletHistory } from './types';

export class LogService {
  constructor(
    private provider: ethers.JsonRpcProvider,
    private contractInterface: ethers.Interface
  ) {}

  private async getBlockRanges(fromBlock: number, toBlock: number): Promise<Array<[number, number]>> {
    const ranges: Array<[number, number]> = [];
    // 減少每批次的區塊數量
    const batchSize = Math.floor(BLOCKS_PER_QUERY / 2);
    for (let start = fromBlock; start <= toBlock; start += batchSize) {
      const end = Math.min(start + batchSize - 1, toBlock);
      ranges.push([start, end]);
    }
    return ranges;
  }

  async queryLogsInBatches(address: string): Promise<WalletHistory> {
    const latestBlock = await this.provider.getBlockNumber();
    // 減少查詢的區塊範圍
    const fromBlock = latestBlock - 5000;
    const ranges = await this.getBlockRanges(fromBlock, latestBlock);

    const filter = {
      address: PREDICTION_ADDRESS,
      topics: [
        [
          this.contractInterface.getEvent('BetBull').topicHash,
          this.contractInterface.getEvent('BetBear').topicHash,
          this.contractInterface.getEvent('Claim').topicHash,
        ],
        ethers.zeroPadValue(address.toLowerCase(), 32),
      ],
    };

    const bulls: { epoch: number; amount: string; }[] = [];
    const bears: { epoch: number; amount: string; }[] = [];
    const claims: { epoch: number; amount: string; }[] = [];

    for (const [start, end] of ranges) {
      try {
        const logs = await this.provider.getLogs({
          ...filter,
          fromBlock: start,
          toBlock: end,
        });

        for (const log of logs) {
          const parsedLog = this.contractInterface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });

          if (!parsedLog) continue;

          const epoch = Number(parsedLog.args[1]);
          const amount = ethers.formatEther(parsedLog.args[2]);

          switch (parsedLog.name) {
            case 'BetBull':
              bulls.push({ epoch, amount });
              break;
            case 'BetBear':
              bears.push({ epoch, amount });
              break;
            case 'Claim':
              claims.push({ epoch, amount });
              break;
          }
        }

        // 增加請求之間的延遲
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`Error fetching logs for range ${start}-${end}:`, error);
        // 發生錯誤時增加更長的延遲
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw error;
      }
    }

    return { bulls, bears, claims };
  }
}