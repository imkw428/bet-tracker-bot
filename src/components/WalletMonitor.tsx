import { useState, useEffect } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { PredictionService } from '@/services/prediction';
import { supabaseService } from '@/services/supabase';
import { WalletList } from './WalletList';
import { WalletDashboard } from './WalletDashboard';
import { useToast } from "@/components/ui/use-toast";
import { useWalletMonitoring } from '@/hooks/useWalletMonitoring';

interface WalletData {
  address: string;
  history: any;
  recentBets: any[];
  note: string;
  created_at: string;
}

export const WalletMonitor = () => {
  const { toast } = useToast();
  const [monitoring, setMonitoring] = useState(false);
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const [isSoundEnabled, setSoundEnabled] = useState(true);

  const { currentEpoch, startMonitoring } = useWalletMonitoring(
    wallets,
    monitoring,
    isSoundEnabled,
    notificationSound
  );

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

  const handleStartMonitoring = () => {
    if (wallets.length === 0) {
      toast({
        title: "錯誤",
        description: "請至少添加一個錢包地址",
        variant: "destructive",
      });
      return;
    }
    startMonitoring();
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
          <Button onClick={handleStartMonitoring} disabled={monitoring}>
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