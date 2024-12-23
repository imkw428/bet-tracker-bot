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
    const supabaseUrl = 'https://swnqaebpbjrmeetylkzb.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3bnFhZWJwYmpybWVldHlsa3piIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ4MjU2NDYsImV4cCI6MjA1MDQwMTY0Nn0.JvXRyTuOVx3i8nSmF3I9cJvyUbggtPHrBhqt6maFYbE';

    this.client = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public'
      }
    });
  }

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  async getWallets(): Promise<WalletData[]> {
    try {
      const { data, error } = await this.client
        .from('wallets')
        .select('address, note, created_at')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('獲取錢包列表失敗:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('獲取錢包列表失敗:', error);
      return [];
    }
  }

  async addWallet(address: string, note: string = ''): Promise<WalletData | null> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await this.client
        .from('wallets')
        .insert([{ 
          address, 
          note, 
          created_at: now
        }])
        .select()
        .single();

      if (error) {
        console.error('添加錢包失敗:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('添加錢包失敗:', error);
      return null;
    }
  }

  async updateWalletNote(address: string, note: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('wallets')
        .update({ note })
        .eq('address', address);

      if (error) {
        console.error('更新錢包備註失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('更新錢包備註失敗:', error);
      return false;
    }
  }

  async updateWalletTime(address: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('wallets')
        .update({ 
          updated_at: new Date().toISOString() 
        })
        .eq('address', address);

      if (error) {
        console.error('更新錢包時間失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('更新錢包時間失敗:', error);
      return false;
    }
  }

  async deleteWallet(address: string): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('wallets')
        .delete()
        .eq('address', address);

      if (error) {
        console.error('刪除錢包失敗:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('刪除錢包失敗:', error);
      return false;
    }
  }
}

export const supabaseService = SupabaseService.getInstance();