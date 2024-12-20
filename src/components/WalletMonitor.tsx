import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PredictionService } from '@/services/prediction';
import { X } from 'lucide-react';

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

interface WalletData {
  address: string;
  history: WalletHistory | null;
  recentBets: Bet[];
}

export const WalletMonitor = () => {
  const { toast } = useToast();
  const [newAddress, setNewAddress] = useState('');
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const [monitoring, setMonitoring] = useState(false);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  
  useEffect(() => {
    const predictionService = new PredictionService();
    let interval: NodeJS.Timeout;

    if (monitoring && wallets.length > 0) {
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

      // 為每個錢包設置監聽
      wallets.forEach(wallet => {
        predictionService.onNewBet(wallet.address, (bet) => {
          setWallets(prevWallets => 
            prevWallets.map(w => {
              if (w.address === wallet.address) {
                return {
                  ...w,
                  recentBets: [bet, ...w.recentBets].slice(0, 10)
                };
              }
              return w;
            })
          );

          toast({
            title: `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)} 新的${bet.type === 'bull' ? '看漲' : '看跌'}下注!`,
            description: `金額: ${bet.amount} BNB，回合: ${bet.epoch}`,
          });
        });

        // 獲取每個錢包的歷史記錄
        predictionService.getWalletHistory(wallet.address, 0, 0).then(history => {
          setWallets(prevWallets =>
            prevWallets.map(w => {
              if (w.address === wallet.address) {
                return { ...w, history };
              }
              return w;
            })
          );
        });
      });
    }

    return () => {
      clearInterval(interval);
    };
  }, [monitoring, wallets, toast]);

  const addWallet = () => {
    if (!newAddress) {
      toast({
        title: "錯誤",
        description: "請輸入錢包地址",
        variant: "destructive",
      });
      return;
    }

    if (wallets.some(w => w.address.toLowerCase() === newAddress.toLowerCase())) {
      toast({
        title: "錯誤",
        description: "此錢包地址已在監控列表中",
        variant: "destructive",
      });
      return;
    }

    setWallets(prev => [...prev, {
      address: newAddress,
      history: null,
      recentBets: []
    }]);
    setNewAddress('');
  };

  const removeWallet = (address: string) => {
    setWallets(prev => prev.filter(w => w.address !== address));
  };

  const startMonitoring = () => {
    if (wallets.length === 0) {
      toast({
        title: "錯誤",
        description: "請至少添加一個錢包地址",
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
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            className="flex-1"
          />
          <Button onClick={addWallet} disabled={monitoring}>
            添加錢包
          </Button>
          <Button onClick={startMonitoring} disabled={monitoring}>
            {monitoring ? "監控中..." : "開始監控"}
          </Button>
        </div>

        {/* 錢包列表 */}
        <div className="space-y-2">
          {wallets.map(wallet => (
            <div key={wallet.address} className="flex items-center gap-2 bg-muted/50 p-2 rounded">
              <span>{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
                onClick={() => removeWallet(wallet.address)}
                disabled={monitoring}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {monitoring && (
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">當前狀態</h2>
            <div className="space-y-2">
              <p>當前回合: <span className="animate-blink">{currentEpoch}</span></p>
              <p>監控錢包數量: {wallets.length}</p>
            </div>
          </Card>

          {wallets.map(wallet => (
            <div key={wallet.address} className="space-y-6">
              <Card className="p-4">
                <h2 className="text-xl font-bold mb-4">
                  錢包 {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </h2>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold mb-2">最近下注</h3>
                    <div className="space-y-2">
                      {wallet.recentBets.map((bet, i) => (
                        <div key={i} className={`p-2 rounded ${
                          bet.type === 'bull' ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'
                        }`}>
                          {bet.type === 'bull' ? '看漲' : '看跌'} - {bet.amount} BNB (回合 {bet.epoch})
                        </div>
                      ))}
                    </div>
                  </div>

                  {wallet.history && (
                    <div>
                      <h3 className="font-bold mb-2">歷史記錄</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-bold text-win mb-2">看漲下注</h4>
                          {wallet.history.bulls.map((bet, i) => (
                            <div key={i} className="text-sm">
                              回合 {bet.epoch}: {bet.amount} BNB
                            </div>
                          ))}
                        </div>
                        <div>
                          <h4 className="font-bold text-loss mb-2">看跌下注</h4>
                          {wallet.history.bears.map((bet, i) => (
                            <div key={i} className="text-sm">
                              回合 {bet.epoch}: {bet.amount} BNB
                            </div>
                          ))}
                        </div>
                        <div>
                          <h4 className="font-bold text-neutral mb-2">獲勝領取</h4>
                          {wallet.history.claims.map((claim, i) => (
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
};