-- =====================================================================
-- PANDA-SPJ — Skema Database PostgreSQL (Supabase)
-- Bagian Perekonomian dan Sumber Daya Alam, Setda Kota Batu
-- =====================================================================
create extension if not exists "uuid-ossp";

-- ---------- Referensi tahun anggaran & tahapan ----------
create table if not exists tahun_anggaran (
  id            uuid primary key default uuid_generate_v4(),
  tahun         int not null unique,
  status        text not null default 'aktif' check (status in ('aktif','ditutup')),
  created_at    timestamptz default now()
);

create table if not exists tahapan_anggaran (
  id            uuid primary key default uuid_generate_v4(),
  kode          text not null unique,        -- 'murni' | 'pergeseran' | 'perubahan'
  nama          text not null
);

-- ---------- Struktur program/kegiatan (referensi tahunan) ----------
create table if not exists program (
  id            uuid primary key default uuid_generate_v4(),
  tahun_id      uuid references tahun_anggaran(id),
  nama          text not null,
  unique (tahun_id, nama)
);

create table if not exists kegiatan (
  id            uuid primary key default uuid_generate_v4(),
  program_id    uuid references program(id),
  nama          text not null,
  unique (program_id, nama)
);

create table if not exists sub_kegiatan (
  id            uuid primary key default uuid_generate_v4(),
  kegiatan_id   uuid references kegiatan(id),
  nama          text not null,
  unique (kegiatan_id, nama)
);

create table if not exists sumber_dana (
  id            uuid primary key default uuid_generate_v4(),
  kode          text not null unique,        -- PAD, DBH CHT, DAU, dst
  nama          text not null
);

-- ---------- Pegawai / pejabat ----------
create table if not exists pegawai (
  id            uuid primary key default uuid_generate_v4(),
  nama          text not null,
  nip           text not null unique,
  username      text unique,                 -- dipakai untuk login (bukan email) — lihat login/actions.ts
  pangkat       text,
  jabatan       text,
  no_sk         text,                        -- SK penunjukan (PPTK/KPA/BPP)
  role          text not null check (role in ('KPA','PPTK','BPP','Administrator','Auditor','Viewer')),
  tanda_tangan_url text,                     -- opsional: spesimen ttd digital
  status_aktif  boolean default true,
  created_at    timestamptz default now()
);

-- ---------- Kode rekening (baris DPA — single source of truth anggaran) ----------
create table if not exists kode_rekening (
  id                  uuid primary key default uuid_generate_v4(),
  tahun_id            uuid references tahun_anggaran(id),
  kode                text not null,          -- kode rekening lengkap (spt di 1__DATABASE.pdf)
  program_id          uuid references program(id),
  kegiatan_id         uuid references kegiatan(id),
  sub_kegiatan_id     uuid references sub_kegiatan(id),
  belanja             text not null,
  sumber_dana_id      uuid references sumber_dana(id),
  pptk_id             uuid references pegawai(id),
  pagu_murni          numeric(18,2) default 0,
  pagu_pergeseran     numeric(18,2) default 0,
  pagu_perubahan      numeric(18,2) default 0,
  created_at          timestamptz default now(),
  unique (tahun_id, kode)
);

-- ---------- Transaksi GU (input tunggal -> sumber 3 dokumen) ----------
create table if not exists transaksi (
  id                  uuid primary key default uuid_generate_v4(),
  kode_rekening_id    uuid references kode_rekening(id),
  tahapan_anggaran_id uuid references tahapan_anggaran(id),
  tahun_id            uuid references tahun_anggaran(id),
  judul_acara         text not null,
  tanggal_acara       date not null,
  no_sk_kpa           text,
  nomor_nota_dinas    text unique,
  nomor_bukti_kuitansi text unique,
  realisasi_sebelum   numeric(18,2) default 0,
  ajuan               numeric(18,2) not null,
  sisa_pagu           numeric(18,2),
  pptk_id             uuid references pegawai(id),
  kpa_id              uuid references pegawai(id),
  bpp_id              uuid references pegawai(id),
  penerima            text,
  status              text not null default 'draft'
                        check (status in ('draft','diajukan','disetujui','dicairkan','ditolak')),
  -- Klasifikasi & hasil perhitungan pajak (lihat src/lib/pajak.ts)
  jenis_pengadaan     text not null default 'barang'
                        check (jenis_pengadaan in ('barang','jasa_lainnya','jasa_konsultansi','jasa_konstruksi_pelaksanaan','jasa_konstruksi_konsultansi','sewa_tanah_bangunan','honorarium_pns','honorarium_non_pns')),
  status_pkp          boolean not null default false,
  status_npwp         boolean not null default true,
  jenis_penyedia      text not null default 'badan_usaha' check (jenis_penyedia in ('badan_usaha','perorangan')),
  kualifikasi_konstruksi text,
  golongan_honorarium text,
  metode_pengadaan    text not null default 'manual' check (metode_pengadaan in ('manual','e_katalog')),
  harga_termasuk_pajak boolean not null default false,
  dpp                 numeric(18,2) not null default 0,
  ppn                 numeric(18,2) not null default 0,
  pph22               numeric(18,2) not null default 0,
  pph23               numeric(18,2) not null default 0,
  pph_final_4ayat2    numeric(18,2) not null default 0,
  pph21_final         numeric(18,2) not null default 0,
  kena_pajak_daerah   boolean not null default false,
  pajak_daerah        numeric(18,2) not null default 0,
  pph_perorangan      numeric(18,2) not null default 0,
  label_pph_final     text,
  jumlah_potongan     numeric(18,2) not null default 0,
  jumlah_diterima     numeric(18,2) not null default 0,
  created_by          uuid,                 -- fk ke auth.users (Supabase Auth)
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ---------- Rincian barang/jasa per transaksi ----------
create table if not exists transaksi_rincian (
  id             uuid primary key default uuid_generate_v4(),
  transaksi_id   uuid references transaksi(id) on delete cascade,
  uraian         text not null,
  volume         numeric(12,2) not null default 1,
  satuan         text not null default 'Kali',
  harga_satuan   numeric(18,2) not null default 0,
  jumlah         numeric(18,2) generated always as (volume * harga_satuan) stored
);

-- ---------- Dokumen tergenerate (arsip file & status) ----------
create table if not exists dokumen (
  id             uuid primary key default uuid_generate_v4(),
  transaksi_id   uuid references transaksi(id) on delete cascade,
  jenis          text not null check (jenis in ('nota_dinas','sptb','kuitansi')),
  nomor          text,
  format         text not null check (format in ('docx','pdf')),
  file_url       text,                       -- Supabase Storage path
  generated_at   timestamptz default now()
);

-- ---------- Audit trail ----------
create table if not exists audit_log (
  id            uuid primary key default uuid_generate_v4(),
  actor_id      uuid references pegawai(id),  -- pegawai.id = auth.users.id (lihat README)
  actor_role    text,
  aksi          text not null,               -- create/update/delete/generate/approve
  entitas       text not null,               -- nama tabel
  entitas_id    uuid,
  detail        jsonb,
  created_at    timestamptz default now()
);

-- ---------- Trigger: hitung sisa pagu & cegah realisasi > pagu ----------
create or replace function fn_validasi_dan_hitung_transaksi()
returns trigger as $$
declare
  v_pagu numeric(18,2);
  v_tahapan text;
  v_terpakai numeric(18,2);
begin
  select kode into v_tahapan from tahapan_anggaran where id = new.tahapan_anggaran_id;

  select case lower(v_tahapan)
           when 'murni' then pagu_murni
           when 'pergeseran' then pagu_pergeseran
           else pagu_perubahan
         end
    into v_pagu
    from kode_rekening where id = new.kode_rekening_id;

  select coalesce(sum(ajuan),0) into v_terpakai
    from transaksi
   where kode_rekening_id = new.kode_rekening_id
     and id <> coalesce(new.id, uuid_nil())
     and status <> 'ditolak';

  if (v_terpakai + new.realisasi_sebelum + new.ajuan) > v_pagu then
    raise exception 'Ajuan melebihi sisa pagu. Pagu: %, Terpakai: %, Ajuan: %', v_pagu, v_terpakai, new.ajuan;
  end if;

  new.sisa_pagu := v_pagu - v_terpakai - new.realisasi_sebelum - new.ajuan;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_validasi_transaksi on transaksi;
create trigger trg_validasi_transaksi
before insert or update on transaksi
for each row execute function fn_validasi_dan_hitung_transaksi();

-- ---------- Row Level Security (contoh dasar, sesuaikan dengan role mapping Supabase Auth) ----------
alter table transaksi enable row level security;
alter table kode_rekening enable row level security;
alter table audit_log enable row level security;

drop policy if exists "Semua role terautentikasi dapat membaca transaksi" on transaksi;
create policy "Semua role terautentikasi dapat membaca transaksi"
  on transaksi for select using (auth.role() = 'authenticated');

drop policy if exists "PPTK & Administrator dapat membuat transaksi" on transaksi;
create policy "PPTK & Administrator dapat membuat transaksi"
  on transaksi for insert with check (auth.role() = 'authenticated');

-- Indexing untuk performa dashboard/rekap
create index if not exists idx_transaksi_tahun on transaksi(tahun_id);
create index if not exists idx_transaksi_kode_rekening on transaksi(kode_rekening_id);
create index if not exists idx_transaksi_status on transaksi(status);
create index if not exists idx_kode_rekening_tahun on kode_rekening(tahun_id);
