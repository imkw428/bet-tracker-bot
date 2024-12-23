export const PREDICTION_ABI = [
  "function currentEpoch() view returns (uint256)",
  "function rounds(uint256) view returns (uint256 epoch, uint256 startTimestamp, uint256 lockTimestamp, uint256 closeTimestamp, int256 lockPrice, int256 closePrice, uint256 lockOracleId, uint256 closeOracleId, uint256 totalAmount, uint256 bullAmount, uint256 bearAmount, uint256 rewardBaseCalAmount, uint256 rewardAmount, bool oracleCalled)",
  "event BetBull(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event BetBear(address indexed sender, uint256 indexed epoch, uint256 amount)",
  "event Claim(address indexed sender, uint256 indexed epoch, uint256 amount)",
];

export const PREDICTION_ADDRESS = "0x18B2A687610328590Bc8F2e5fEdDe3b582A49cdA";

// Reduced block query size to prevent timeouts
export const BLOCKS_PER_QUERY = 25;

// Increased delay between requests
export const REQUEST_DELAY = 10000;

// Base QuickNode URL - will be completed with API key from Supabase secrets
const QUICKNODE_BASE_URL = "https://bold-twilight-tree.bsc.discover.quiknode.pro/";

// Updated RPC endpoints with fallback nodes
export const RPC_ENDPOINTS = [
  `${QUICKNODE_BASE_URL}${import.meta.env.VITE_QUICKNODE_API_KEY || ''}/`,
  "https://bsc-dataseed1.binance.org",
  "https://bsc-dataseed2.binance.org",
  "https://bsc-dataseed3.binance.org",
  "https://bsc-dataseed4.binance.org",
];