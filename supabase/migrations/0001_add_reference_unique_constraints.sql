-- =====================================================================
-- Migration 0001: tambahkan unique constraint pada program/kegiatan/
-- sub_kegiatan agar seed data & import Excel bisa idempotent (aman
-- dijalankan berkali-kali via ON CONFLICT DO NOTHING).
--
-- HANYA perlu dijalankan jika database Anda dibuat dari schema.sql versi
-- SEBELUM revisi ini (mis. Anda sudah pernah menjalankan schema.sql dan
-- mendapati error "relation already exists" saat menjalankan ulang).
-- Jika ini instalasi baru dari schema.sql versi terbaru, constraint ini
-- sudah otomatis ada — migration ini akan langsung skip tanpa error.
--
-- Aman dijalankan berkali-kali (idempotent): setiap langkah dicek dulu
-- sebelum dieksekusi.
-- =====================================================================

-- 1) Bersihkan duplikat LEBIH DULU (kalau ada, sisa dari seed.sql yang
--    sempat dijalankan berulang sebelum constraint terpasang) — kalau
--    langkah ini dilewati, ADD CONSTRAINT di bawah akan gagal karena data
--    yang sudah duplikat melanggar unique index yang mau dibuat.
delete from sub_kegiatan a using sub_kegiatan b
  where a.id > b.id and a.kegiatan_id = b.kegiatan_id and a.nama = b.nama;

delete from kegiatan a using kegiatan b
  where a.id > b.id and a.program_id = b.program_id and a.nama = b.nama;

delete from program a using program b
  where a.id > b.id and a.tahun_id = b.tahun_id and a.nama = b.nama;

-- 2) Baru pasang unique constraint, masing-masing dicek dulu agar aman
--    dijalankan ulang.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'program_tahun_id_nama_key'
  ) then
    alter table program add constraint program_tahun_id_nama_key unique (tahun_id, nama);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'kegiatan_program_id_nama_key'
  ) then
    alter table kegiatan add constraint kegiatan_program_id_nama_key unique (program_id, nama);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sub_kegiatan_kegiatan_id_nama_key'
  ) then
    alter table sub_kegiatan add constraint sub_kegiatan_kegiatan_id_nama_key unique (kegiatan_id, nama);
  end if;
end $$;
