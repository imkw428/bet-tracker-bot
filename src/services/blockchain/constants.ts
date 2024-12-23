export const PREDICTION_ABI = [
  "function currentEpoch() view returns (uint256)",
  "function rounds(uint256) view returns (uint256 epoch, uint256 startTimestamp, uint256 lockTimestamp, uint256 closeTimestamp, int256 lockPrice, int256 closePrice, uint256 lockOracleId, uint256 closeOracleId, uint256 totalAmount, uint256 bullAmount, uint256 bearAmount, uint256 rewardBaseCalAmount, uint256 rewardAmount, bool oracleCalled)",
  "event BetBull(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event BetBear(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event Claim(address indexed sender, uint256 indexed epoch, uint256 amount)",
];

export const PREDICTION_ADDRESS = "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA";
export const BLOCKS_PER_QUERY = 100; // Significantly reduced from 500 to avoid rate limits
export const QUERY_DELAY = 3000; // Increased delay between requests
export const RPC_SWITCH_DELAY = 8000;
export const MAX_RETRIES = 5;
export const CHUNK_SIZE = 20; // Number of blocks per chunk when splitting requests

export const BSC_NETWORK = {
  name: 'bnb',
  chainId: 56,
  ensAddress: null,
  ensNetwork: null
};

export const RPC_ENDPOINTS = [
  "https://bsc-dataseed.binance.org",
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
  "https://endpoints.omniatech.io/v1/bsc/mainnet/public",
  "https://bsc.meowrpc.com"
];