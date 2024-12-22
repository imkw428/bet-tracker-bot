import { useState, useEffect } from 'react';
import { PredictionService } from '@/services/prediction';
import { supabaseService } from '@/services/supabase';
import { WalletData } from '../types';
import { useToast } from "@/components/ui/use-toast";

export const useWalletData = () => {
  const { toast } = useToast();
  const [wallets, setWallets] = useState<WalletData[]>([]);

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

  return {
    wallets,
    setWallets,
    handleWalletAdd,
    handleWalletRemove,
    handleWalletNoteUpdate
  };
};