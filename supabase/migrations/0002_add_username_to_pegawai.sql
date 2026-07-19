-- =====================================================================
-- Migration 0002: tambahkan kolom `username` pada tabel pegawai agar
-- pengguna bisa login dengan username, bukan email.
--
-- Supabase Auth tetap memakai email di balik layar (signInWithPassword
-- hanya menerima email/phone) — server action login akan menerjemahkan
-- username -> email secara diam-diam via service role, memakai
-- auth.admin.getUserById(pegawai.id) karena pegawai.id = auth.users.id.
-- Jadi TIDAK perlu menyimpan email di tabel pegawai (menghindari data
-- yang bisa tidak sinkron dengan Supabase Auth).
--
-- Aman dijalankan berkali-kali (idempotent).
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'pegawai' and column_name = 'username'
  ) then
    alter table pegawai add column username text;
  end if;
end $$;

-- Unique constraint (case-insensitive akan divalidasi di level aplikasi
-- dengan menyimpan/mencari selalu dalam huruf kecil). Postgres unique
-- constraint mengizinkan banyak NULL, jadi pegawai referensi (PPTK/KPA/BPP
-- yang belum tentu punya akun login) tetap boleh username kosong.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'pegawai_username_key'
  ) then
    alter table pegawai add constraint pegawai_username_key unique (username);
  end if;
end $$;
