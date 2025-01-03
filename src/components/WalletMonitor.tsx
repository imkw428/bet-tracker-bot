import { useState, useEffect, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PredictionService } from '@/services/prediction';
import { walletStorage } from '@/services/walletStorage';
import { WalletCard } from './WalletCard';
import { WalletList } from './wallet/WalletList';
import { MonitorStatus } from './wallet/MonitorStatus';

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
  const [isPaused, setIsPaused] = useState(false);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const predictionServiceRef = useRef<PredictionService | null>(null);
  
  // 載入已儲存的錢包
  useEffect(() => {
    const loadStoredWallets = async () => {
      try {
        const storedWallets = await walletStorage.getWallets();
        setWallets(storedWallets.map(w => ({
          address: w.address,
          history: null,
          recentBets: []
        })));
      } catch (error) {
        console.error('載入錢包時出錯:', error);
        toast({
          title: "載入錢包時出錯",
          description: "請稍後再試",
          variant: "destructive",
        });
      }
    };

    loadStoredWallets();
  }, [toast]);

  useEffect(() => {
    if (monitoring && wallets.length > 0 && !isPaused) {
      const predictionService = new PredictionService();
      predictionServiceRef.current = predictionService;

      const updateData = async () => {
        try {
          const epoch = await predictionService.getCurrentEpoch();
          setCurrentEpoch(Number(epoch));

          for (const wallet of wallets) {
            if (isPaused) break; 
            
            try {
              const history = await predictionService.getWalletHistory(wallet.address, 0, 0);
              setWallets(prevWallets =>
                prevWallets.map(w => {
                  if (w.address === wallet.address) {
                    return { ...w, history };
                  }
                  return w;
                })
              );
              await new Promise(resolve => setTimeout(resolve, 5000));
            } catch (error) {
              console.error(`Error updating wallet ${wallet.address}:`, error);
              toast({
                title: "更新錢包資料時出錯",
                description: `地址: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`,
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error('Error updating data:', error);
          toast({
            title: "更新資料時出錯",
            description: "請稍後再試",
            variant: "destructive",
          });
        }
      };

      updateData();
      const interval = setInterval(updateData, 60000);

      wallets.forEach(wallet => {
        predictionService.onNewBet(wallet.address, (bet) => {
          if (!isPaused) {
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
          }
        });
      });

      return () => {
        clearInterval(interval);
        if (predictionServiceRef.current) {
          predictionServiceRef.current.cleanup();
          predictionServiceRef.current = null;
        }
      };
    }
  }, [monitoring, wallets, toast, isPaused]);

  const addWallet = async () => {
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

    try {
      await walletStorage.addWallet(newAddress);
      setWallets(prev => [...prev, {
        address: newAddress,
        history: null,
        recentBets: []
      }]);
      setNewAddress('');
    } catch (error) {
      console.error('添加錢包時出錯:', error);
      toast({
        title: "添加錢包時出錯",
        description: "請稍後再試",
        variant: "destructive",
      });
    }
  };

  const removeWallet = async (address: string) => {
    try {
      await walletStorage.removeWallet(address);
      setWallets(prev => prev.filter(w => w.address !== address));
    } catch (error) {
      console.error('移除錢包時出錯:', error);
      toast({
        title: "移除錢包時出錯",
        description: "請稍後再試",
        variant: "destructive",
      });
    }
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
    setIsPaused(false);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
    toast({
      title: !isPaused ? "監控已暫停" : "監控已恢復",
      description: !isPaused ? "所有請求已暫停" : "系統將繼續監控錢包",
    });
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
            disabled={monitoring && !isPaused}
          />
          <Button onClick={addWallet} disabled={monitoring && !isPaused}>
            添加錢包
          </Button>
          <Button onClick={startMonitoring} disabled={monitoring}>
            {monitoring ? "監控中..." : "開始監控"}
          </Button>
          {monitoring && (
            <Button 
              onClick={togglePause}
              variant={isPaused ? "default" : "secondary"}
            >
              {isPaused ? "恢復監控" : "暫停監控"}
            </Button>
          )}
        </div>

        <WalletList 
          wallets={wallets} 
          onRemoveWallet={removeWallet}
          isPaused={isPaused || !monitoring}
        />
      </div>

      {monitoring && (
        <div className="space-y-6">
          <MonitorStatus
            currentEpoch={currentEpoch}
            walletsCount={wallets.length}
            isPaused={isPaused}
          />

          {wallets.map(wallet => (
            <WalletCard
              key={wallet.address}
              address={wallet.address}
              history={wallet.history}
              recentBets={wallet.recentBets}
            />
          ))}
        </div>
      )}
    </div>
  );
};