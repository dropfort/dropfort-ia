-- =============================================
-- Dropfort IA - Configuração do Supabase
-- Execute este SQL no SQL Editor do Supabase
-- =============================================

-- 1. Criar tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_name TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  pdf_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criar índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_payments_user_name ON payments(user_name);
CREATE INDEX IF NOT EXISTS idx_payments_year ON payments(year);
CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(month);

-- 3. Habilitar Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 4. Política: permitir todas as operações para usuários anônimos
-- (sistema interno, sem autenticação complexa)
DROP POLICY IF EXISTS "Allow all for anon" ON payments;
CREATE POLICY "Allow all for anon" ON payments
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 5. Criar bucket de storage para os PDFs
INSERT INTO storage.buckets (id, name, public, avif_autodetection)
VALUES ('receipts', 'receipts', true, false)
ON CONFLICT (id) DO NOTHING;

-- 6. Política de storage: acesso público ao bucket receipts
DROP POLICY IF EXISTS "Allow public access" ON storage.objects;
CREATE POLICY "Allow public access" ON storage.objects
  FOR ALL
  TO anon
  USING (bucket_id = 'receipts')
  WITH CHECK (bucket_id = 'receipts');
