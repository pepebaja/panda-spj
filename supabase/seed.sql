-- =====================================================================
-- Seed data master — sumber: 1__DATABASE.pdf (rekap DPA Bagian
-- Perekonomian & SDA, Setda Kota Batu, TA 2026)
-- Jalankan setelah schema.sql (dan migrations/0001_*.sql jika database
-- Anda dibuat dari schema.sql versi lama). Sesuaikan NIP/pangkat pejabat
-- dengan SK asli sebelum dipakai di lingkungan produksi — nilai di sini
-- masih contoh.
--
-- AMAN DIJALANKAN BERKALI-KALI (idempotent): setiap insert memakai
-- ON CONFLICT DO NOTHING sesuai unique constraint masing-masing tabel,
-- jadi menjalankan ulang file ini tidak akan menghasilkan data duplikat
-- maupun error "duplicate key".
-- =====================================================================

-- Tahun anggaran 2026-2036 disediakan di muka (Lampiran 01. DATABASE
-- mencantumkan rentang ini) agar dapat dipilih di halaman login begitu
-- tahun berjalan berganti. Hanya 2026 yang berstatus 'aktif' secara
-- default -- Administrator dapat mengaktifkan tahun berikutnya kelak
-- lewat Data Master > Tahun Anggaran saat tahun anggaran baru dibuka.
insert into tahun_anggaran (tahun, status)
select y, case when y = 2026 then 'aktif' else 'ditutup' end
from generate_series(2026, 2036) as y
on conflict (tahun) do nothing;

insert into tahapan_anggaran (kode, nama) values
  ('murni', 'Murni'), ('pergeseran', 'Pergeseran'), ('perubahan', 'Perubahan')
  on conflict (kode) do nothing;

-- Pegawai (PPTK berdasarkan kolom PPTK di database; KPA & BPP contoh — ganti sesuai SK)
-- Kolom `username` di sini hanya contoh penamaan; kosongkan/samakan dengan
-- akun Supabase Auth yang benar-benar Anda buat (lihat README bagian
-- "Login dengan Username").
insert into pegawai (nama, nip, username, pangkat, jabatan, no_sk, role) values
  ('Sari Anas Putri', '198501012009022001', 'sari.anas', 'Penata Tk. I / III.d', 'PPTK', '800/123/35.79.121/2026', 'PPTK'),
  ('Diyah Wahyuni', '198711202010022002', 'diyah.wahyuni', 'Penata / III.c', 'PPTK', '800/124/35.79.121/2026', 'PPTK'),
  ('Tengko Wolok', '198909082011011003', 'tengko.wolok', 'Penata Muda Tk. I / III.b', 'PPTK', '800/125/35.79.121/2026', 'PPTK'),
  ('Drs. Ahmad Fauzi, M.Si', '196705121993031008', 'ahmad.fauzi', 'Pembina Utama Muda / IV.c', 'Kuasa Pengguna Anggaran', '800/001/35.79.121/2026', 'KPA'),
  ('Rina Kusumawati, S.E.', '198203152006042003', 'rina.kusumawati', 'Penata / III.c', 'Bendahara Pengeluaran Pembantu', '800/002/35.79.121/2026', 'BPP')
  on conflict (nip) do nothing;

insert into sumber_dana (kode, nama) values
  ('PAD', 'Pendapatan Asli Daerah'),
  ('DBH CHT', 'Dana Bagi Hasil Cukai Hasil Tembakau')
  on conflict (kode) do nothing;

-- Program & kegiatan (subset — tambahkan baris lain dari 1__DATABASE.pdf sesuai kebutuhan,
-- atau gunakan modul "Import Excel" di aplikasi untuk mengisi data lebih cepat)
insert into program (tahun_id, nama)
  select id, 'Program Penunjang Urusan Pemerintahan Kabupaten/Kota' from tahun_anggaran where tahun = 2026
  on conflict (tahun_id, nama) do nothing;
insert into program (tahun_id, nama)
  select id, 'Program Perekonomian dan Pembangunan' from tahun_anggaran where tahun = 2026
  on conflict (tahun_id, nama) do nothing;

insert into kegiatan (program_id, nama)
  select id, 'Administrasi Keuangan Perangkat Daerah' from program where nama = 'Program Penunjang Urusan Pemerintahan Kabupaten/Kota'
  on conflict (program_id, nama) do nothing;
insert into kegiatan (program_id, nama)
  select id, 'Administrasi Umum Perangkat Daerah' from program where nama = 'Program Penunjang Urusan Pemerintahan Kabupaten/Kota'
  on conflict (program_id, nama) do nothing;
insert into kegiatan (program_id, nama)
  select id, 'Pelaksanaan Kebijakan Perekonomian' from program where nama = 'Program Perekonomian dan Pembangunan'
  on conflict (program_id, nama) do nothing;

insert into sub_kegiatan (kegiatan_id, nama)
  select id, 'Penyediaan Administrasi Pelaksanaan Tugas ASN' from kegiatan where nama = 'Administrasi Keuangan Perangkat Daerah'
  on conflict (kegiatan_id, nama) do nothing;
insert into sub_kegiatan (kegiatan_id, nama)
  select id, 'Penyediaan Peralatan dan Perlengkapan Kantor' from kegiatan where nama = 'Administrasi Umum Perangkat Daerah'
  on conflict (kegiatan_id, nama) do nothing;
insert into sub_kegiatan (kegiatan_id, nama)
  select id, 'Koordinasi, Sinkronisasi, Monitoring dan Evaluasi Kebijakan Pengelolaan BUMD dan BLUD' from kegiatan where nama = 'Pelaksanaan Kebijakan Perekonomian'
  on conflict (kegiatan_id, nama) do nothing;

-- Contoh baris kode rekening (ulangi pola ini untuk seluruh baris pada 1__DATABASE.pdf,
-- atau gunakan modul "Import Excel" di aplikasi alih-alih menulis INSERT manual satu per satu)
insert into kode_rekening (tahun_id, kode, program_id, kegiatan_id, sub_kegiatan_id, belanja, sumber_dana_id, pptk_id, pagu_murni, pagu_pergeseran, pagu_perubahan)
select
  (select id from tahun_anggaran where tahun = 2026),
  '4.01.01.2.02.0002.5.1.02.02.001.00080',
  (select id from program where nama = 'Program Penunjang Urusan Pemerintahan Kabupaten/Kota'),
  (select k.id from kegiatan k join program pr on pr.id = k.program_id
     where k.nama = 'Administrasi Keuangan Perangkat Daerah' and pr.nama = 'Program Penunjang Urusan Pemerintahan Kabupaten/Kota'),
  (select sk.id from sub_kegiatan sk join kegiatan k on k.id = sk.kegiatan_id
     where sk.nama = 'Penyediaan Administrasi Pelaksanaan Tugas ASN'),
  'Belanja Honorarium Penanggungjawaban Pengelola Keuangan',
  (select id from sumber_dana where kode = 'PAD'),
  (select id from pegawai where nama = 'Sari Anas Putri'),
  59220000, 59220000, 59220000
on conflict (tahun_id, kode) do nothing;
