import { Card } from "@/components/ui/card";
import { WalletAnalytics } from "@/types/wallet";
import { WalletHeader } from "./wallet/components/WalletHeader";
import { WalletAnalyticsDisplay } from "./wallet/components/WalletAnalytics";
import { BettingHistory } from "./wallet/components/BettingHistory";
import { Badge } from "@/components/ui/badge";
import { Database } from "lucide-react";

interface Bet {
  type: 'bull' | 'bear';
  epoch: number;
  amount: string;
}

interface WalletHistory {
  bulls: { epoch: number; amount: string; }[];
  bears: { epoch: number; amount: string; }[];
  claims: { epoch: number; timestamp?: number; amount: string; }[];
}

interface WalletCardProps {
  address: string;
  history: WalletHistory | null;
  recentBets: Bet[];
  note: string;
  analytics?: WalletAnalytics;
  currentEpoch: number;
  totalTimeOnList: number;
  roundResults: Record<number, 'bull' | 'bear'>;
}

export const WalletCard = ({ 
  address, 
  history, 
  analytics,
  currentEpoch,
  totalTimeOnList,
  roundResults
}: WalletCardProps) => {
  const winningEpochs = history?.claims.map(claim => claim.epoch) || [];
  const hasHistory = history && (
    history.bulls.length > 0 || 
    history.bears.length > 0 || 
    history.claims.length > 0
  );

  // 計算最近一小時內的領獎次數
  const recentClaimsCount = history?.claims.filter(claim => {
    if (!claim.timestamp) return false;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return claim.timestamp >= oneHourAgo;
  }).length || 0;

  // 檢查是否為大額操作者 (累積超過12次未領獎)
  const unclaimedWins = history?.bulls.map(bet => ({...bet, type: 'bull' as const}))
    .concat(history.bears.map(bet => ({...bet, type: 'bear' as const})))
    .filter(bet => {
      const result = roundResults[bet.epoch];
      if (!result) return false;
      
      // 檢查是否贏了但還沒領獎
      const won = (bet.type === result);
      const claimed = winningEpochs.includes(bet.epoch);
      return won && !claimed;
    }).length || 0;

  const isLargeOperator = unclaimedWins >= 12;

  const getRecentRounds = () => {
    if (!history) return [];
    
    const allBets = [
      ...history.bulls.map(bet => ({ ...bet, type: 'bull' as const })),
      ...history.bears.map(bet => ({ ...bet, type: 'bear' as const }))
    ];

    return Array.from({ length: 5 }, (_, index) => {
      const roundEpoch = currentEpoch - index;
      const bet = allBets.find(b => b.epoch === roundEpoch);
      const won = winningEpochs.includes(roundEpoch);
      
      return {
        epoch: roundEpoch,
        type: bet?.type || null,
        amount: bet?.amount || null,
        won,
        result: roundResults[roundEpoch]
      };
    });
  };

  return (
    <Card className={`p-4 shadow-lg hover:shadow-xl transition-all duration-300 border ${
      isLargeOperator 
        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
        : 'bg-white dark:bg-gray-900 border-emerald-100 dark:border-emerald-800'
    }`}>
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <WalletHeader
              address={address}
              hasHistory={hasHistory}
              totalTimeOnList={totalTimeOnList}
            />
            {isLargeOperator && (
              <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <Database className="w-4 h-4" />
                <span className="text-xs">大額操作者</span>
              </div>
            )}
          </div>
          {recentClaimsCount > 0 && (
            <Badge variant={recentClaimsCount >= 6 ? "destructive" : "secondary"}>
              {recentClaimsCount} 次領獎
            </Badge>
          )}
        </div>

        <WalletAnalyticsDisplay analytics={analytics} />

        <BettingHistory rounds={getRecentRounds()} />
      </div>
    </Card>
  );
};