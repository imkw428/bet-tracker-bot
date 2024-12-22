import { WalletAnalytics as WalletAnalyticsType } from "@/types/wallet";

interface WalletAnalyticsDisplayProps {
  analytics?: WalletAnalyticsType;
}

export const WalletAnalyticsDisplay = ({ analytics }: WalletAnalyticsDisplayProps) => {
  if (!analytics) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-sm text-neutral-500">總下注</p>
        <p className="font-semibold">{analytics.totalBets} BNB</p>
      </div>
      <div>
        <p className="text-sm text-neutral-500">勝率</p>
        <p className="font-semibold">{analytics.winRate}%</p>
      </div>
      <div>
        <p className="text-sm text-neutral-500">獲利</p>
        <p className={`font-semibold ${analytics.profit >= 0 ? 'text-win' : 'text-loss'}`}>
          {analytics.profit > 0 ? '+' : ''}{analytics.profit} BNB
        </p>
      </div>
      <div>
        <p className="text-sm text-neutral-500">ROI</p>
        <p className={`font-semibold ${analytics.roi >= 0 ? 'text-win' : 'text-loss'}`}>
          {analytics.roi > 0 ? '+' : ''}{analytics.roi}%
        </p>
      </div>
    </div>
  );
};