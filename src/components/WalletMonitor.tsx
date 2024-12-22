import { useState } from 'react';
import { WalletDashboard } from './WalletDashboard';
import { useWalletData } from './wallet/hooks/useWalletData';
import { useWalletMonitoring } from './wallet/hooks/useWalletMonitoring';
import { MonitorHeader } from './wallet/components/MonitorHeader';
import { WalletInput } from './wallet/components/WalletInput';
import { useToast } from "@/components/ui/use-toast";
import { supabaseService } from '@/services/supabase';

export const WalletMonitor = () => {
  const [monitoring] = useState(true);
  const [notificationSound] = useState(new Audio('/notification.mp3'));
  const [isSoundEnabled, setSoundEnabled] = useState(true);
  const { toast } = useToast();
  
  const {
    wallets,
    setWallets,
    handleWalletAdd,
    isLoading
  } = useWalletData();

  const { currentEpoch, predictionServiceRef, roundResults } = useWalletMonitoring(
    wallets,
    setWallets,
    isSoundEnabled,
    notificationSound
  );

  const handleAddWallet = async (address: string) => {
    try {
      const wallet = await supabaseService.addWallet(address);
      if (wallet) {
        await handleWalletAdd(wallet);
      }
    } catch (error) {
      console.error('添加錢包時發生錯誤:', error);
      toast({
        title: "錯誤",
        description: "添加錢包時發生錯誤",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWallet = (address: string) => {
    setWallets(prev => prev.filter(w => w.address !== address));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 font-mono">
        <div className="text-center">載入中...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 font-mono">
      <MonitorHeader />
      
      <WalletInput onAddWallet={handleAddWallet} />

      <WalletDashboard
        currentEpoch={currentEpoch}
        wallets={wallets}
        monitoring={monitoring}
        roundResults={roundResults}
        onDeleteWallet={handleDeleteWallet}
      />
    </div>
  );
};