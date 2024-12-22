import { createClient } from '@supabase/supabase-js';

interface WalletData {
  address: string;
  note: string;
  created_at?: string;
}

class SupabaseService {
  private static instance: SupabaseService;
  private client;

  private constructor() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not found. Some features may not work.');
      return;
    }

    this.client = createClient(supabaseUrl, supabaseKey);
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  async getWallets(): Promise<WalletData[]> {
    if (!this.client) return [];
    
    const { data, error } = await this.client
      .from('wallets')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching wallets:', error);
      return [];
    }

    return data || [];
  }

  async addWallet(address: string, note: string = ''): Promise<WalletData | null> {
    if (!this.client) return null;

    const { data, error } = await this.client
      .from('wallets')
      .insert([{ address, note }])
      .select()
      .single();

    if (error) {
      console.error('Error adding wallet:', error);
      return null;
    }

    return data;
  }

  async updateWalletNote(address: string, note: string): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('wallets')
      .update({ note })
      .eq('address', address);

    if (error) {
      console.error('Error updating wallet note:', error);
      return false;
    }

    return true;
  }

  async deleteWallet(address: string): Promise<boolean> {
    if (!this.client) return false;

    const { error } = await this.client
      .from('wallets')
      .delete()
      .eq('address', address);

    if (error) {
      console.error('Error deleting wallet:', error);
      return false;
    }

    return true;
  }
}

export const supabaseService = SupabaseService.getInstance();