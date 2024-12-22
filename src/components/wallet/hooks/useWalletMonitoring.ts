import { useState, useEffect, useRef } from 'react';
import { PredictionService } from '@/services/prediction';
import { duneService } from '@/services/dune';
import { useToast } from "@/components/ui/use-toast";
import { WalletData } from '../types';
import { supabaseService } from '@/services/supabase';

export const useWalletMonitoring = (
  wallets: WalletData[],
  setWallets: React.Dispatch<React.SetStateAction<WalletData[]>>,
  isSoundEnabled: boolean,
  notificationSound: HTMLAudioElement
) => {
  const { toast } = useToast();
  const [currentEpoch, setCurrentEpoch] = useState<number | null>(null);
  const [roundResults, setRoundResults] = useState<Record<number, 'bull' | 'bear'>>({});
  const predictionServiceRef = useRef<PredictionService | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const updateIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    predictionServiceRef.current = new PredictionService();

    const updateWalletData = async () => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 5 * 60 * 1000) {
        return;
      }
      
      try {
        const latestWallets = await supabaseService.getWallets();
        
        if (!predictionServiceRef.current) return;
        
        const updatedWallets = await Promise.all(
          latestWallets.map(async (wallet) => {
            const history = await predictionServiceRef.current!.getWalletHistory(wallet.address, 0, 0);
            
            return {
              address: wallet.address,
              note: wallet.note || '',
              history,
              recentBets: [],
              created_at: wallet.created_at || new Date().toISOString(),
            } as WalletData;
          })
        );

        setWallets(updatedWallets);
        lastUpdateRef.current = now;
        
        toast({
          title: "錢包資料已更新",
          description: `已更新 ${updatedWallets.length} 個錢包的資料`,
        });
      } catch (error) {
        console.error('更新錢包資料時發生錯誤:', error);
        toast({
          title: "更新失敗",
          description: "更新錢包資料時發生錯誤",
          variant: "destructive",
        });
      }
    };

    const fetchData = async () => {
      if (!predictionServiceRef.current) return;
      
      try {
        const epoch = await predictionServiceRef.current.getCurrentEpoch();
        setCurrentEpoch(Number(epoch));

        for (let i = 0; i < 5; i++) {
          const roundEpoch = Number(epoch) - i;
          const roundInfo = await predictionServiceRef.current.getRoundInfo(roundEpoch);
          
          if (roundInfo && roundInfo.closePrice && roundInfo.lockPrice) {
            const result = roundInfo.closePrice > roundInfo.lockPrice ? 'bull' : 'bear';
            setRoundResults(prev => ({ ...prev, [roundEpoch]: result }));
          }
        }

        await updateWalletData();
      } catch (error) {
        console.error('更新資料時發生錯誤:', error);
      }
    };

    const checkAndScheduleNextUpdate = async () => {
      if (!predictionServiceRef.current) return;
      
      try {
        const timeUntilNextRound = await predictionServiceRef.current.getTimeUntilNextRound();
        console.log('距離下一回合還有（毫秒）:', timeUntilNextRound);
        
        updateIntervalRef.current = setTimeout(async () => {
          console.log('開始更新新回合資料');
          await fetchData();
          checkAndScheduleNextUpdate();
        }, timeUntilNextRound);

      } catch (error) {
        console.error('檢查下一回合時間時發生錯誤:', error);
        updateIntervalRef.current = setTimeout(checkAndScheduleNextUpdate, 120000);
      }
    };

    fetchData();
    checkAndScheduleNextUpdate();

    const cleanupFns = wallets.map(wallet => {
      if (!predictionServiceRef.current) return undefined;
      
      return predictionServiceRef.current.onNewBet(wallet.address, (bet) => {
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
      if (updateIntervalRef.current) {
        clearTimeout(updateIntervalRef.current);
      }
      cleanupFns.forEach(cleanup => cleanup && cleanup());
      predictionServiceRef.current = null;
    };
  }, [wallets, toast, isSoundEnabled, notificationSound, setWallets]);

  return { currentEpoch, predictionServiceRef, roundResults };
};