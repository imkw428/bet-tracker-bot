import { Card } from "@/components/ui/card";
import { formatEther } from "ethers";
import { Badge } from "@/components/ui/badge";

interface Bet {
  type: 'bull' | 'bear';
  epoch: number;
  amount: string;
}

interface WalletHistory {
  bulls: { epoch: number; amount: string; }[];
  bears: { epoch: number; amount: string; }[];
  claims: { epoch: number; amount: string; }[];
}

interface WalletCardProps {
  address: string;
  history: WalletHistory | null;
  recentBets: Bet[];
}

export const WalletCard = ({ address, history, recentBets }: WalletCardProps) => {
  // 計算贏得的回合
  const winningEpochs = history?.claims.map(claim => claim.epoch) || [];

  return (
    <Card className="p-4">
      <h2 className="text-xl font-bold mb-4">
        錢包 {address.slice(0, 6)}...{address.slice(-4)}
      </h2>

      <div className="space-y-4">
        {/* 贏得的回合 */}
        <div>
          <h3 className="font-bold mb-2">贏得的回合</h3>
          <div className="flex flex-wrap gap-2">
            {winningEpochs.map((epoch) => (
              <Badge key={epoch} variant="success" className="bg-win text-white">
                回合 {epoch}
              </Badge>
            ))}
          </div>
        </div>

        {/* 最近下注 */}
        <div>
          <h3 className="font-bold mb-2">最近下注</h3>
          <div className="space-y-2">
            {recentBets.map((bet, i) => (
              <div
                key={`${bet.epoch}-${i}`}
                className={`p-2 rounded ${
                  bet.type === 'bull' ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'
                }`}
              >
                {bet.type === 'bull' ? '看漲' : '看跌'} - {bet.amount} BNB (回合 {bet.epoch})
              </div>
            ))}
          </div>
        </div>

        {/* 歷史記錄 */}
        {history && (
          <div>
            <h3 className="font-bold mb-2">歷史記錄</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-bold text-win mb-2">看漲下注</h4>
                {history.bulls.map((bet, i) => (
                  <div key={i} className="text-sm">
                    回合 {bet.epoch}: {bet.amount} BNB
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-bold text-loss mb-2">看跌下注</h4>
                {history.bears.map((bet, i) => (
                  <div key={i} className="text-sm">
                    回合 {bet.epoch}: {bet.amount} BNB
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-bold text-neutral mb-2">獲勝領取</h4>
                {history.claims.map((claim, i) => (
                  <div key={i} className="text-sm">
                    回合 {claim.epoch}: {claim.amount} BNB
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};