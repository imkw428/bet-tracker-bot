interface WalletHeaderProps {
  address: string;
  hasHistory: boolean;
}

export const WalletHeader = ({ 
  address,
  hasHistory
}: WalletHeaderProps) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <h3 className="text-lg font-semibold">
          {`${address.slice(0, 6)}...${address.slice(-4)}`}
        </h3>
      </div>
    </div>
  );
};