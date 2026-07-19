-- =====================================================================
-- Migration 0003: kolom klasifikasi pajak & hasil perhitungan pada
-- tabel transaksi (PPN, PPh22, PPh23, PPh Final 4(2), PPh21 Final).
-- Lihat src/lib/pajak.ts untuk logika & rujukan regulasinya.
--
-- Nilai pajak DISIMPAN pada saat transaksi dibuat (bukan dihitung ulang
-- setiap kali dokumen dicetak) agar dokumen tetap konsisten dengan tarif
-- yang berlaku saat transaksi terjadi, meskipun tarif berubah di kemudian
-- hari.
--
-- Aman dijalankan berkali-kali (idempotent).
-- =====================================================================

do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='jenis_pengadaan') then
    alter table transaksi add column jenis_pengadaan text not null default 'barang';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='status_pkp') then
    alter table transaksi add column status_pkp boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='status_npwp') then
    alter table transaksi add column status_npwp boolean not null default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='jenis_penyedia') then
    alter table transaksi add column jenis_penyedia text not null default 'badan_usaha';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='kualifikasi_konstruksi') then
    alter table transaksi add column kualifikasi_konstruksi text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='golongan_honorarium') then
    alter table transaksi add column golongan_honorarium text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='metode_pengadaan') then
    alter table transaksi add column metode_pengadaan text not null default 'manual';
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='harga_termasuk_pajak') then
    alter table transaksi add column harga_termasuk_pajak boolean not null default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='dpp') then
    alter table transaksi add column dpp numeric(18,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='ppn') then
    alter table transaksi add column ppn numeric(18,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='pph22') then
    alter table transaksi add column pph22 numeric(18,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='pph23') then
    alter table transaksi add column pph23 numeric(18,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='pph_final_4ayat2') then
    alter table transaksi add column pph_final_4ayat2 numeric(18,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='pph21_final') then
    alter table transaksi add column pph21_final numeric(18,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='label_pph_final') then
    alter table transaksi add column label_pph_final text;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='jumlah_potongan') then
    alter table transaksi add column jumlah_potongan numeric(18,2) not null default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_name='transaksi' and column_name='jumlah_diterima') then
    alter table transaksi add column jumlah_diterima numeric(18,2) not null default 0;
  end if;
end $$;

-- Batasan nilai yang wajar untuk kolom kategori (di luar ini ditolak).
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'transaksi_jenis_pengadaan_check') then
    alter table transaksi add constraint transaksi_jenis_pengadaan_check check (
      jenis_pengadaan in ('barang','jasa_lainnya','jasa_konsultansi','jasa_konstruksi_pelaksanaan','jasa_konstruksi_konsultansi','sewa_tanah_bangunan','honorarium_pns','honorarium_non_pns')
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transaksi_jenis_penyedia_check') then
    alter table transaksi add constraint transaksi_jenis_penyedia_check check (jenis_penyedia in ('badan_usaha','perorangan'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'transaksi_metode_pengadaan_check') then
    alter table transaksi add constraint transaksi_metode_pengadaan_check check (metode_pengadaan in ('manual','e_katalog'));
  end if;
end $$;
