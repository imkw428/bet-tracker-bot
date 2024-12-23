import { supabase } from '@/lib/supabase';

export interface StoredWallet {
  id?: string;
  address: string;
  created_at?: string;
}

export const walletStorage = {
  async getWallets(): Promise<StoredWallet[]> {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  async addWallet(address: string): Promise<StoredWallet> {
    const { data, error } = await supabase
      .from('wallets')
      .insert([{ address }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async removeWallet(address: string): Promise<void> {
    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('address', address);
    
    if (error) throw error;
  }
};