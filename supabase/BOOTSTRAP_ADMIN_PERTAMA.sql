-- =====================================================================
-- BOOTSTRAP ADMINISTRATOR PERTAMA
-- =====================================================================
-- Pakai skrip ini KHUSUS untuk akun yang SUDAH Anda buat manual di
-- Supabase Dashboard > Authentication > Users, tapi belum bisa login ke
-- PANDA-SPJ. Ini biasanya karena baris di tabel `pegawai` belum ada, atau
-- `id`-nya tidak sama persis dengan `id` akun tsb di Authentication.
--
-- LANGKAH:
-- 1. Buka Supabase Dashboard > Authentication > Users.
-- 2. Cari akun Anda, klik untuk buka detail, salin nilai "User UID"
--    (format UUID, mis. 8f14e45f-ceea-467e-b5a4-a0b6c1a3e1a2).
-- 3. Di bagian "insert into pegawai" di bawah, GANTI teks pada baris
--    PALING_ATAS_GANTI_INI, GANTI_NAMA_ANDA, dst dengan data Anda.
--    PENTING: jangan sertakan tanda kurung siku < > apa pun -- itu cuma
--    penanda placeholder di komentar, BUKAN bagian dari perintah SQL.
--    Cukup ganti teksnya saja, tanda kutip satu ('...') tetap dipakai.
-- 4. Jalankan di Supabase SQL Editor.
-- 5. Coba login lagi di /login memakai username yang Anda tetapkan di
--    sini (atau langsung pakai email akun tsb, keduanya didukung).
--
-- CONTOH YANG SUDAH BENAR (siap jalan apa adanya, hanya untuk ilustrasi):
--   insert into pegawai (id, nama, nip, username, role, status_aktif)
--   values (
--     '8f14e45f-ceea-467e-b5a4-a0b6c1a3e1a2',
--     'Sari Anas Putri',
--     '198501012009022001',
--     'sari.anas',
--     'Administrator',
--     true
--   )
--   on conflict (id) do update set
--     username = excluded.username, role = excluded.role, status_aktif = true;
--
-- Aman dijalankan berkali-kali (upsert by id).
-- =====================================================================

insert into pegawai (id, nama, nip, username, role, status_aktif)
values (
  PALING_ATAS_GANTI_INI_DENGAN_USER_UID,   -- lihat langkah 3 di atas
  GANTI_NAMA_ANDA,
  GANTI_NIP_ANDA,
  GANTI_USERNAME_PILIHAN_ANDA,             -- huruf kecil, tanpa spasi
  'Administrator',
  true
)
on conflict (id) do update set
  username = excluded.username,
  role = excluded.role,
  status_aktif = true;

-- Verifikasi: pastikan baris berikut muncul dan `id` di atas SAMA PERSIS
-- dengan "User UID" yang Anda salin dari Authentication > Users.
select id, nama, username, role, status_aktif from pegawai where role = 'Administrator';
