import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PredictionService } from '@/services/prediction';

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

export const WalletMonitor = () => {
  const { toast } = useToast();
  const [address, setAddress] = useState('');
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const [monitoring, setMonitoring] = useState(false);
  const [history, setHistory] = useState<WalletHistory | null>(null);
  const [recentBets, setRecentBets] = useState<Bet[]>([]);
  
  useEffect(() => {
    const predictionService = new PredictionService();
    let interval: NodeJS.Timeout;

    if (monitoring) {
      const updateEpoch = async () => {
        try {
          const epoch = await predictionService.getCurrentEpoch();
          setCurrentEpoch(Number(epoch));
        } catch (error) {
          console.error('獲取當前回合錯誤:', error);
        }
      };

      updateEpoch();
      interval = setInterval(updateEpoch, 5000);

      predictionService.onNewBet(address, (bet) => {
        setRecentBets(prev => [bet, ...prev].slice(0, 10));
        toast({
          title: `新的${bet.type === 'bull' ? '看漲' : '看跌'}下注!`,
          description: `金額: ${bet.amount} BNB，回合: ${bet.epoch}`,
        });
      });

      predictionService.getWalletHistory(address, 0, 0).then(setHistory);
    }

    return () => {
      clearInterval(interval);
    };
  }, [monitoring, address, toast]);

  const startMonitoring = () => {
    if (!address) {
      toast({
        title: "錯誤",
        description: "請輸入錢包地址",
        variant: "destructive",
      });
      return;
    }
    setMonitoring(true);
  };

  return (
    <div className="container mx-auto p-4 font-mono">
      <div className="mb-8 space-y-4">
        <h1 className="text-2xl font-bold">PancakeSwap 預測監控</h1>
        <div className="flex gap-4">
          <Input
            placeholder="輸入錢包地址"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="flex-1"
          />
          <Button onClick={startMonitoring} disabled={monitoring}>
            {monitoring ? "監控中..." : "開始監控"}
          </Button>
        </div>
      </div>

      {monitoring && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">當前狀態</h2>
            <div className="space-y-2">
              <p>當前回合: <span className="animate-blink">{currentEpoch}</span></p>
              <p>監控地址: {address.slice(0, 6)}...{address.slice(-4)}</p>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">最近下注</h2>
            <div className="space-y-2">
              {recentBets.map((bet, i) => (
                <div key={i} className={`p-2 rounded ${
                  bet.type === 'bull' ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'
                }`}>
                  {bet.type === 'bull' ? '看漲' : '看跌'} - {bet.amount} BNB (回合 {bet.epoch})
                </div>
              ))}
            </div>
          </Card>

          {history && (
            <Card className="p-4 md:col-span-2">
              <h2 className="text-xl font-bold mb-4">錢包歷史</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-bold text-win mb-2">看漲下注</h3>
                  {history.bulls.map((bet, i) => (
                    <div key={i} className="text-sm">
                      回合 {bet.epoch}: {bet.amount} BNB
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-bold text-loss mb-2">看跌下注</h3>
                  {history.bears.map((bet, i) => (
                    <div key={i} className="text-sm">
                      回合 {bet.epoch}: {bet.amount} BNB
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-bold text-neutral mb-2">獲勝領取</h3>
                  {history.claims.map((claim, i) => (
                    <div key={i} className="text-sm">
                      回合 {claim.epoch}: {claim.amount} BNB
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};