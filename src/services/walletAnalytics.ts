import { WalletAnalytics } from "@/types/wallet";
import { ethers } from "ethers";

export class WalletAnalyticsService {
  calculateAnalytics(history: any): WalletAnalytics {
    if (!history) {
      return {
        totalBets: 0,
        winRate: 0,
        profit: 0,
        roi: 0
      };
    }

    // 計算總下注金額
    const totalBullAmount = history.bulls.reduce((sum: number, bet: any) => 
      sum + Number(bet.amount), 0
    );
    const totalBearAmount = history.bears.reduce((sum: number, bet: any) => 
      sum + Number(bet.amount), 0
    );
    const totalBets = totalBullAmount + totalBearAmount;

    // 計算總獲勝次數和獲利
    const winningEpochs = new Set(history.claims.map((claim: any) => claim.epoch));
    const totalWins = history.bulls.filter((bet: any) => winningEpochs.has(bet.epoch)).length +
                     history.bears.filter((bet: any) => winningEpochs.has(bet.epoch)).length;
    
    const totalGames = history.bulls.length + history.bears.length;
    const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

    // 計算總收益
    const totalClaims = history.claims.reduce((sum: number, claim: any) => 
      sum + Number(claim.amount), 0
    );
    const profit = totalClaims - totalBets;

    // 計算 ROI
    const roi = totalBets > 0 ? (profit / totalBets) * 100 : 0;

    return {
      totalBets: Number(totalBets.toFixed(4)),
      winRate: Number(winRate.toFixed(2)),
      profit: Number(profit.toFixed(4)),
      roi: Number(roi.toFixed(2))
    };
  }
}

export const walletAnalyticsService = new WalletAnalyticsService();