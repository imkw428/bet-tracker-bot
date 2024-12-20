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
      // Update current epoch every 5 seconds
      const updateEpoch = async () => {
        try {
          const epoch = await predictionService.getCurrentEpoch();
          setCurrentEpoch(Number(epoch));
        } catch (error) {
          console.error('Error fetching current epoch:', error);
        }
      };

      updateEpoch();
      interval = setInterval(updateEpoch, 5000);

      // Monitor new bets
      predictionService.onNewBet(address, (bet) => {
        setRecentBets(prev => [bet, ...prev].slice(0, 10));
        toast({
          title: `New ${bet.type.toUpperCase()} Bet!`,
          description: `Amount: ${bet.amount} BNB at Epoch ${bet.epoch}`,
        });
      });

      // Fetch history
      predictionService.getWalletHistory(address, 0, 0).then(setHistory);
    }

    return () => {
      clearInterval(interval);
    };
  }, [monitoring, address, toast]);

  const startMonitoring = () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Please enter a wallet address",
        variant: "destructive",
      });
      return;
    }
    setMonitoring(true);
  };

  return (
    <div className="container mx-auto p-4 font-mono">
      <div className="mb-8 space-y-4">
        <h1 className="text-2xl font-bold">PancakeSwap Prediction Monitor</h1>
        <div className="flex gap-4">
          <Input
            placeholder="Enter wallet address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="flex-1"
          />
          <Button onClick={startMonitoring} disabled={monitoring}>
            {monitoring ? "Monitoring..." : "Start Monitoring"}
          </Button>
        </div>
      </div>

      {monitoring && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Current Status</h2>
            <div className="space-y-2">
              <p>Current Epoch: <span className="animate-blink">{currentEpoch}</span></p>
              <p>Monitoring: {address.slice(0, 6)}...{address.slice(-4)}</p>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-xl font-bold mb-4">Recent Bets</h2>
            <div className="space-y-2">
              {recentBets.map((bet, i) => (
                <div key={i} className={`p-2 rounded ${
                  bet.type === 'bull' ? 'bg-win/10 text-win' : 'bg-loss/10 text-loss'
                }`}>
                  {bet.type.toUpperCase()} - {bet.amount} BNB (Epoch {bet.epoch})
                </div>
              ))}
            </div>
          </Card>

          {history && (
            <Card className="p-4 md:col-span-2">
              <h2 className="text-xl font-bold mb-4">Wallet History</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="font-bold text-win mb-2">Bull Bets</h3>
                  {history.bulls.map((bet, i) => (
                    <div key={i} className="text-sm">
                      Epoch {bet.epoch}: {bet.amount} BNB
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-bold text-loss mb-2">Bear Bets</h3>
                  {history.bears.map((bet, i) => (
                    <div key={i} className="text-sm">
                      Epoch {bet.epoch}: {bet.amount} BNB
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-bold text-neutral mb-2">Claims</h3>
                  {history.claims.map((claim, i) => (
                    <div key={i} className="text-sm">
                      Epoch {claim.epoch}: {claim.amount} BNB
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