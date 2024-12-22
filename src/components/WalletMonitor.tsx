import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PredictionService } from '@/services/prediction';
import { X, Volume2 } from 'lucide-react';
import { WalletCard } from './WalletCard';
import { Textarea } from "@/components/ui/textarea";
import { supabaseService } from '@/services/supabase';

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
}

export const WalletMonitor = () => {
  const { toast } = useToast();
  const [newAddress, setNewAddress] = useState('');
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const [monitoring, setMonitoring] = useState(false);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const [isSoundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    const loadWallets = async () => {
      const savedWallets = await supabaseService.getWallets();
      setWallets(savedWallets.map(w => ({
        address: w.address,
        note: w.note || '',
        history: null,
        recentBets: []
      })));
    };

    loadWallets();
  }, []);

  useEffect(() => {
    const predictionService = new PredictionService();
    let interval: NodeJS.Timeout;

    if (monitoring && wallets.length > 0) {
      const updateData = async () => {
        try {
          const epoch = await predictionService.getCurrentEpoch();
          setCurrentEpoch(Number(epoch));

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
        } catch (error) {
          console.error('更新數據時出錯:', error);
        }
      };

      updateData();
      interval = setInterval(updateData, 3000);

      wallets.forEach(wallet => {
        predictionService.onNewBet(wallet.address, (bet) => {
          if (isSoundEnabled) {
            notificationSound.play().catch(console.error);
          }

          setWallets(prevWallets => 
            prevWallets.map(w => {
              if (w.address === wallet.address) {
                return {
                  ...w,
                  recentBets: [bet]  // 只保留最新的一筆下注
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
    }

    return () => {
      clearInterval(interval);
    };
  }, [monitoring, wallets, toast, isSoundEnabled, notificationSound]);

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

    const newWallet = await supabaseService.addWallet(newAddress);
    if (newWallet) {
      setWallets(prev => [...prev, {
        address: newWallet.address,
        note: newWallet.note || '',
        history: null,
        recentBets: []
      }]);
      setNewAddress('');
    }
  };

  const removeWallet = async (address: string) => {
    const success = await supabaseService.deleteWallet(address);
    if (success) {
      setWallets(prev => prev.filter(w => w.address !== address));
    }
  };

  const updateNote = async (address: string, note: string) => {
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
    setMonitoring(true);
  };

  return (
    <div className="container mx-auto p-4 font-mono">
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">PancakeSwap 預測監控</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!isSoundEnabled)}
            className="ml-2"
          >
            <Volume2 className={isSoundEnabled ? 'text-green-500' : 'text-gray-400'} />
          </Button>
        </div>
        
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map(wallet => (
            <div key={wallet.address} className="space-y-2">
              <div className="flex items-center gap-2 bg-muted/50 p-2 rounded">
                <span className="text-sm">{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
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
              <Textarea
                placeholder="添加備註..."
                value={wallet.note}
                onChange={(e) => updateNote(wallet.address, e.target.value)}
                className="text-sm h-20"
                disabled={monitoring}
              />
            </div>
          ))}
        </div>
      </div>

      {monitoring && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-4 col-span-full">
            <h2 className="text-lg font-bold mb-4">當前狀態</h2>
            <div className="space-y-2">
              <p className="text-sm">當前回合: <span className="animate-blink">{currentEpoch}</span></p>
              <p className="text-sm">監控錢包數量: {wallets.length}</p>
            </div>
          </Card>

          {wallets.map(wallet => (
            <WalletCard
              key={wallet.address}
              address={wallet.address}
              history={wallet.history}
              recentBets={wallet.recentBets}
              note={wallet.note}
            />
          ))}
        </div>
      )}
    </div>
  );
};
