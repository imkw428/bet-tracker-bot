import { useState, useEffect, useRef } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { PredictionService } from '@/services/prediction';
import { supabaseService } from '@/services/supabase';
import { duneService } from '@/services/dune';
import { WalletList } from './WalletList';
import { WalletDashboard } from './WalletDashboard';
import { useToast } from "@/components/ui/use-toast";

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
  note: string;
  created_at: string;
}

export const WalletMonitor = () => {
  const { toast } = useToast();
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const [monitoring, setMonitoring] = useState(false);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const [isSoundEnabled, setSoundEnabled] = useState(true);
  const predictionServiceRef = useRef<PredictionService>();

  useEffect(() => {
    const loadWallets = async () => {
      const savedWallets = await supabaseService.getWallets();
      const walletsWithHistory = await Promise.all(
        savedWallets.map(async w => {
          const predictionService = new PredictionService();
          const history = await predictionService.getWalletHistory(w.address, 0, 0);
          return {
            address: w.address,
            note: w.note || '',
            history,
            recentBets: [],
            created_at: w.created_at
          };
        })
      );
      setWallets(walletsWithHistory);
    };

    loadWallets();
  }, []);

  // Start Dune tracking when monitoring starts
  useEffect(() => {
    if (monitoring) {
      duneService.startTracking();
    } else {
      duneService.stopTracking();
    }

    return () => {
      duneService.stopTracking();
    };
  }, [monitoring]);

  useEffect(() => {
    if (!monitoring || !predictionServiceRef.current) return;

    let interval: NodeJS.Timeout;
    const predictionService = predictionServiceRef.current;

    const checkRoundTiming = async () => {
      try {
        const timeUntilNext = await predictionService.getTimeUntilNextRound();
        const shouldIntensivePolling = timeUntilNext <= 30000 && timeUntilNext > 0;
        
        // 根據時間設定輪詢間隔
        predictionService.setPollingInterval(shouldIntensivePolling);
        
        // 更新當前回合
        const epoch = await predictionService.getCurrentEpoch();
        setCurrentEpoch(Number(epoch));

        // 更新錢包歷史記錄
        for (const wallet of wallets) {
          const history = await predictionService.getWalletHistory(wallet.address, 0, 0);
          setWallets(prevWallets =>
            prevWallets.map(w => {
              if (w.address === wallet.address) {
                return { ...w, history };
              }
              return w;
            })
          );
        }

        // 根據時間設定下次檢查的延遲
        const nextCheckDelay = shouldIntensivePolling ? 1000 : 3000;
        interval = setTimeout(checkRoundTiming, nextCheckDelay);
      } catch (error) {
        console.error('更新資料時發生錯誤:', error);
        interval = setTimeout(checkRoundTiming, 3000); // 發生錯誤時3秒後重試
      }
    };

    // 開始監控
    checkRoundTiming();

    // 設置下注監聽器
    const cleanupFns = wallets.map(wallet => {
      return predictionService.onNewBet(wallet.address, (bet) => {
        if (isSoundEnabled) {
          notificationSound.play().catch(console.error);
        }

        setWallets(prevWallets => 
          prevWallets.map(w => {
            if (w.address === wallet.address) {
              return {
                ...w,
                recentBets: [bet]
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
    });

    return () => {
      clearTimeout(interval);
      cleanupFns.forEach(cleanup => cleanup && cleanup());
    };
  }, [monitoring, wallets, toast, isSoundEnabled, notificationSound]);

  const handleWalletAdd = async (newWallet: any) => {
    const predictionService = new PredictionService();
    const history = await predictionService.getWalletHistory(newWallet.address, 0, 0);
    
    setWallets(prev => [...prev, {
      address: newWallet.address,
      note: newWallet.note || '',
      history,
      recentBets: [],
      created_at: newWallet.created_at
    }]);
  };

  const handleWalletRemove = async (address: string) => {
    const success = await supabaseService.deleteWallet(address);
    if (success) {
      setWallets(prev => prev.filter(w => w.address !== address));
    }
  };

  const handleWalletNoteUpdate = async (address: string, note: string) => {
    const success = await supabaseService.updateWalletNote(address, note);
    if (success) {
      setWallets(prev => prev.map(w => {
        if (w.address === address) {
          return { ...w, note };
        }
        return w;
      }));
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
    predictionServiceRef.current = new PredictionService();
    setMonitoring(true);
  };

  return (
    <div className="container mx-auto p-4 font-mono">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">PancakeSwap 預測監控</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!isSoundEnabled)}
          >
            <Volume2 className={isSoundEnabled ? 'text-green-500' : 'text-gray-400'} />
          </Button>
          <Button onClick={startMonitoring} disabled={monitoring}>
            {monitoring ? "監控中..." : "開始監控"}
          </Button>
        </div>
      </div>

      <WalletList
        wallets={wallets}
        monitoring={monitoring}
        onWalletAdd={handleWalletAdd}
        onWalletRemove={handleWalletRemove}
        onWalletNoteUpdate={handleWalletNoteUpdate}
      />

      <WalletDashboard
        currentEpoch={currentEpoch}
        wallets={wallets}
        monitoring={monitoring}
      />
    </div>
  );
};
