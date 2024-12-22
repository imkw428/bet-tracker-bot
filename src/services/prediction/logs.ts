import { ethers } from 'ethers';
import { BLOCKS_PER_QUERY, PREDICTION_ADDRESS } from './constants';
import { WalletHistory } from './types';

export class LogService {
  constructor(
    private provider: ethers.JsonRpcProvider,
    private interface: ethers.Interface
  ) {}

  private async getBlockRanges(fromBlock: number, toBlock: number): Promise<Array<[number, number]>> {
    const ranges: Array<[number, number]> = [];
    for (let start = fromBlock; start <= toBlock; start += BLOCKS_PER_QUERY) {
      const end = Math.min(start + BLOCKS_PER_QUERY - 1, toBlock);
      ranges.push([start, end]);
    }
    return ranges;
  }

  async queryLogsInBatches(address: string): Promise<WalletHistory> {
    const latestBlock = await this.provider.getBlockNumber();
    const fromBlock = latestBlock - 10000;
    const ranges = await this.getBlockRanges(fromBlock, latestBlock);

    const filter = {
      address: PREDICTION_ADDRESS,
      topics: [
        [
          this.interface.getEvent('BetBull').topicHash,
          this.interface.getEvent('BetBear').topicHash,
          this.interface.getEvent('Claim').topicHash,
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
          const parsedLog = this.interface.parseLog({
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

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching logs for range ${start}-${end}:`, error);
        throw error;
      }
    }

    return { bulls, bears, claims };
  }
}