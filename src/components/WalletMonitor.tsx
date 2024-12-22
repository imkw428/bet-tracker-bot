import { useState } from 'react';
import { Volume2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { duneService } from '@/services/dune';
import { WalletList } from './WalletList';
import { WalletDashboard } from './WalletDashboard';
import { useToast } from "@/components/ui/use-toast";
import { useWalletData } from './wallet/hooks/useWalletData';
import { useWalletMonitoring } from './wallet/hooks/useWalletMonitoring';
import { PredictionService } from '@/services/prediction';

export const WalletMonitor = () => {
  const { toast } = useToast();
  const [monitoring, setMonitoring] = useState(false);
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const [isSoundEnabled, setSoundEnabled] = useState(true);
  
  const {
    wallets,
    setWallets,
    handleWalletAdd,
    handleWalletRemove,
    handleWalletNoteUpdate
  } = useWalletData();

  const { currentEpoch, predictionServiceRef } = useWalletMonitoring(
    wallets,
    setWallets,
    isSoundEnabled,
    notificationSound
  );

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
    duneService.startTracking();
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