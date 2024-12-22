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

    this.client = createClient(supabaseUrl, supabaseKey);
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    try {
      // 創建表格的 SQL
      const createTableSQL = `
        create table if not exists public.wallets (
          id uuid default gen_random_uuid() primary key,
          address text not null unique,
          note text,
          created_at timestamp with time zone default timezone('utc'::text, now()) not null
        );

        alter table public.wallets enable row level security;
        
        drop policy if exists "Enable all access for all users" on public.wallets;
        create policy "Enable all access for all users" on public.wallets
          for all
          using (true)
          with check (true);
      `;

      const { error } = await this.client.rpc('exec_sql', { sql: createTableSQL });
      
      if (error) {
        console.error('創建表格失敗:', error);
        // 如果 exec_sql 不存在，先創建它
        if (error.message.includes('function exec_sql() does not exist')) {
          const { error: createFnError } = await this.client.rpc('create_exec_sql_function', {});
          if (!createFnError) {
            // 重試創建表格
            const { error: retryError } = await this.client.rpc('exec_sql', { sql: createTableSQL });
            if (retryError) {
              console.error('重試創建表格失敗:', retryError);
            }
          }
        }
      }
    } catch (error) {
      console.error('初始化數據庫時出錯:', error);
    }
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
      console.error('獲取錢包列表失敗:', error);
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
      console.error('添加錢包失敗:', error);
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
      console.error('更新錢包備註失敗:', error);
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
      console.error('刪除錢包失敗:', error);
      return false;
    }

    return true;
  }
}

export const supabaseService = SupabaseService.getInstance();