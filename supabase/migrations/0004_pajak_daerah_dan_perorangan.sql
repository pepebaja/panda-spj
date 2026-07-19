-- =====================================================================
-- Migration 0004: kolom Pajak Daerah (restoran/hotel) dan PPh Perorangan
-- pada tabel transaksi — melengkapi src/lib/pajak.ts agar kuitansi bisa
-- menampilkan kedua baris ini sesuai template asli (4__KUITANSI_GU.pdf)
-- SEKALIGUS mesin pajak rinci (PPN/PPh22/23/Final) yang sudah ada.
--
-- Aman dijalankan berkali-kali (idempotent).
-- =====================================================================

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='kena_pajak_daerah') then
    alter table transaksi add column kena_pajak_daerah boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='pajak_daerah') then
    alter table transaksi add column pajak_daerah numeric(18,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='pph_perorangan') then
    alter table transaksi add column pph_perorangan numeric(18,2) not null default 0;
  end if;
end $$;
