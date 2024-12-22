import { WalletActivity, WalletAnalytics } from '../types/wallet';

export class WalletAnalyticsService {
  private activities: Map<string, WalletActivity> = new Map();

  updateWalletActivity(address: string, isPresent: boolean): void {
    const now = new Date();
    let activity = this.activities.get(address);

    if (isPresent) {
      if (!activity) {
        activity = {
          address,
          firstSeen: now,
          lastSeen: now,
          isActive: true,
          totalActiveTime: 0,
          activePeriods: [{ start: now, end: now }]
        };
        this.activities.set(address, activity);
      } else {
        activity.lastSeen = now;
        if (!activity.isActive) {
          activity.isActive = true;
          activity.activePeriods.push({ start: now, end: now });
        }
      }
    } else if (activity?.isActive) {
      activity.isActive = false;
      const lastPeriod = activity.activePeriods[activity.activePeriods.length - 1];
      lastPeriod.end = now;
      
      // 计算总活跃时间
      activity.totalActiveTime = activity.activePeriods.reduce((total, period) => {
        const duration = (period.end.getTime() - period.start.getTime()) / (1000 * 60);
        return total + duration;
      }, 0);
    }
  }

  updateWalletStats(address: string, betResult: {
    won: boolean;
    amount: number;
  }): void {
    const activity = this.activities.get(address);
    if (!activity) return;

    activity.totalBets = (activity.totalBets || 0) + 1;
    if (betResult.won) {
      activity.winRate = ((activity.winRate || 0) * (activity.totalBets - 1) + 1) / activity.totalBets;
    } else {
      activity.winRate = ((activity.winRate || 0) * (activity.totalBets - 1)) / activity.totalBets;
    }

    // 更新平均下注金额
    activity.averageBetSize = activity.averageBetSize 
      ? (activity.averageBetSize * (activity.totalBets - 1) + betResult.amount) / activity.totalBets
      : betResult.amount;
  }

  analyzeWallet(address: string): WalletAnalytics {
    const activity = this.activities.get(address);
    if (!activity) {
      return {
        address,
        consistency: 0,
        profitability: 0,
        activityScore: 0
      };
    }

    // 计算一致性分数 (基于活跃时间模式)
    const consistency = Math.min(activity.totalActiveTime / (24 * 60), 1); // 最多计算24小时

    // 计算盈利能力 (基于胜率和平均下注)
    const profitability = activity.winRate 
      ? (activity.winRate - 0.5) * (activity.averageBetSize || 0) * (activity.totalBets || 0)
      : 0;

    // 计算活跃度分数
    const activityScore = activity.activePeriods.length > 1 
      ? Math.min(activity.activePeriods.length / 10, 1) // 最多计算10个活跃周期
      : 0;

    return {
      address,
      consistency,
      profitability,
      activityScore
    };
  }

  getWalletActivity(address: string): WalletActivity | null {
    return this.activities.get(address) || null;
  }

  getAllActivities(): WalletActivity[] {
    return Array.from(this.activities.values());
  }
}

export const walletAnalyticsService = new WalletAnalyticsService();