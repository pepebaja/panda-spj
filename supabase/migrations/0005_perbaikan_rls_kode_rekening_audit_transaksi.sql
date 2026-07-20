-- =====================================================================
-- Migration 0005: perbaikan Row Level Security yang menyebabkan Data
-- Master (kode_rekening) selalu tampak kosong dan Import Excel selalu
-- gagal, serta melengkapi policy transaksi yang belum lengkap.
--
-- AKAR MASALAH
-- ------------
-- schema.sql mengaktifkan RLS pada 3 tabel:
--     alter table transaksi     enable row level security;
--     alter table kode_rekening enable row level security;
--     alter table audit_log     enable row level security;
--
-- Tapi policy CREATE POLICY cuma dibuat untuk `transaksi` (select + insert).
-- Perilaku default PostgreSQL saat RLS aktif tanpa policy sama sekali
-- adalah TOLAK SEMUA akses (termasuk SELECT) untuk role selain pemilik
-- tabel / service_role. Karena app ini memakai anon key + sesi user
-- (`src/lib/supabase/server.ts` -> createClient(), BUKAN service role),
-- semua query ke `kode_rekening` dan `audit_log` dari aplikasi otomatis:
--   - SELECT  -> selalu mengembalikan 0 baris (bukan error, jadi diam-diam
--                Dashboard & Data Master selalu terlihat "belum ada data").
--   - INSERT/UPDATE/UPSERT -> gagal dengan error
--                "new row violates row-level security policy" — inilah
--                yang membuat Import Excel di Data Master selalu gagal.
-- `transaksi` juga cuma punya policy SELECT + INSERT, tanpa UPDATE/DELETE,
-- jadi fitur "Edit draft" dan "Hapus draft" transaksi juga pasti gagal
-- dengan error yang sama.
--
-- Otorisasi rinci (siapa boleh apa) sudah dijaga di level aplikasi:
--   - middleware.ts membatasi /master-data, /pengguna, /audit-trail,
--     /backup hanya untuk role tertentu (dan Next.js mengirim Server
--     Action ke URL halaman itu juga, jadi ikut kena guard ini).
--   - api/import/excel/route.ts sudah mengecek role === 'Administrator'
--     secara eksplisit sebelum memproses file.
-- Policy di bawah ini mengikuti pola yang sama dengan `transaksi` yang
-- sudah ada: mengizinkan akses untuk semua user yang sudah login
-- (authenticated), karena pembatasan lebih rinci sudah dilakukan di
-- lapisan aplikasi.
--
-- Aman dijalankan berkali-kali (idempotent) — silakan jalankan lewat
-- Supabase SQL Editor.
-- =====================================================================

-- ---------- kode_rekening ----------
drop policy if exists "Semua role terautentikasi dapat membaca kode rekening" on kode_rekening;
create policy "Semua role terautentikasi dapat membaca kode rekening"
  on kode_rekening for select using (auth.role() = 'authenticated');

drop policy if exists "Semua role terautentikasi dapat menambah kode rekening" on kode_rekening;
create policy "Semua role terautentikasi dapat menambah kode rekening"
  on kode_rekening for insert with check (auth.role() = 'authenticated');

drop policy if exists "Semua role terautentikasi dapat mengubah kode rekening" on kode_rekening;
create policy "Semua role terautentikasi dapat mengubah kode rekening"
  on kode_rekening for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Semua role terautentikasi dapat menghapus kode rekening" on kode_rekening;
create policy "Semua role terautentikasi dapat menghapus kode rekening"
  on kode_rekening for delete using (auth.role() = 'authenticated');

-- ---------- audit_log ----------
drop policy if exists "Semua role terautentikasi dapat membaca audit log" on audit_log;
create policy "Semua role terautentikasi dapat membaca audit log"
  on audit_log for select using (auth.role() = 'authenticated');

drop policy if exists "Semua role terautentikasi dapat menulis audit log" on audit_log;
create policy "Semua role terautentikasi dapat menulis audit log"
  on audit_log for insert with check (auth.role() = 'authenticated');

-- ---------- transaksi: lengkapi UPDATE & DELETE yang belum ada ----------
drop policy if exists "Semua role terautentikasi dapat mengubah transaksi" on transaksi;
create policy "Semua role terautentikasi dapat mengubah transaksi"
  on transaksi for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Semua role terautentikasi dapat menghapus transaksi" on transaksi;
create policy "Semua role terautentikasi dapat menghapus transaksi"
  on transaksi for delete using (auth.role() = 'authenticated');
