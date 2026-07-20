# PANDA-SPJ — Pendamping Administrasi Dokumen SPJ
Bagian Perekonomian dan Sumber Daya Alam, Sekretariat Daerah Kota Batu

Aplikasi web untuk menyusun dokumen administrasi pencairan GU secara otomatis dari
satu kali input transaksi: **Nota Dinas**, **Surat Pernyataan Tanggung Jawab Belanja (SPTB)**,
dan **Kwitansi/Bukti Pembayaran**.

## 1. Arsitektur

```
Browser (Next.js App Router, React 19, Tailwind)
        │
        ├─ Server Components  → baca data (Supabase, RLS by user session)
        ├─ Server Actions     → tulis data (buatTransaksi, dsb — validasi Zod + trigger DB)
        └─ Route Handlers     → /api/documents/[transaksiId]/[jenis] → generate .docx (docx npm)
                                       │
                                       ▼
                              Supabase PostgreSQL
                     (kode_rekening, transaksi, pegawai, audit_log, ...)
                     trigger fn_validasi_dan_hitung_transaksi = source of truth pagu
```

**Prinsip single source of truth**: form Transaksi hanya meminta *kode rekening*,
*judul/tanggal kegiatan*, dan *rincian belanja*. Semua field lain (program, kegiatan,
sumber dana, PPTK, nomor SK, pagu) diambil via relasi dari `kode_rekening` dan `pegawai`,
lalu dipakai ulang oleh ketiga generator dokumen di `src/lib/documents/`.

## 2. Struktur folder

```
src/
  app/
    (auth)/login/            halaman & server action login
    (dashboard)/             layout+guard role, dashboard, master-data, transaksi, dokumen,
                              rekapitulasi, pengguna, audit-trail, backup
    api/
      documents/[transaksiId]/[jenis]/route.ts   generator & download .docx / .pdf (?format=)
      export/excel/route.ts    ekspor kode rekening / rekap transaksi ke .xlsx
      import/excel/route.ts    impor kode rekening dari .xlsx (Administrator)
      backup/route.ts          ekspor seluruh tabel penting sebagai JSON
      restore/route.ts         pulihkan data dari file backup JSON
      pengguna/invite/route.ts undang pengguna baru (Supabase Admin API)
      auth/signout/route.ts
  lib/
    supabase/{client,server}.ts   client Supabase (browser vs server/service-role)
    documents/{notaDinas,sptb,kuitansi}.ts   generator docx per jenis dokumen
    documents/pdf/{layout,notaDinasPdf,sptbPdf,kuitansiPdf}.ts   generator pdf native (pdf-lib)
    types.ts        tipe domain selaras skema DB
    format.ts        rupiah(), terbilang(), formatTanggalIndonesia()
    validasi.ts       validasi pagu (lapis client, cermin dari trigger DB)
  middleware.ts        refresh sesi Supabase + guard RBAC per prefix route + header x-pathname
supabase/
  schema.sql            skema tabel, trigger validasi pagu, RLS
  seed.sql               contoh data master dari 1__DATABASE.pdf
tests/
  unit/{validasi,format}.test.ts   unit test vitest
  e2e/transaksi-flow.spec.ts        e2e Playwright (login → transaksi → dokumen)
.github/workflows/ci.yml   lint → typecheck → unit test → build (+ e2e opsional)
```

## 3. Setup lokal

```bash
npm install
cp .env.example .env.local     # isi dengan kredensial proyek Supabase Anda
npm run dev
```

### Supabase
1. Buat proyek baru di supabase.com.
2. Jalankan `supabase/schema.sql` lalu `supabase/seed.sql` di SQL Editor.
3. Aktifkan Supabase Auth (Email/Password cukup untuk mulai; SSO bisa ditambah nanti).
4. Buat baris di tabel `pegawai` untuk setiap `auth.users.id` yang login (atau tambahkan
   trigger `on_auth_user_created` bila ingin otomatis) — kolom `role` menentukan akses RBAC.
5. Salin URL & anon key ke `.env.local`.

### Deploy ke Vercel
1. Push proyek ini ke GitHub.
2. Import repo di Vercel → set environment variables yang sama seperti `.env.local`.
3. Deploy. Middleware & Route Handlers berjalan sebagai Vercel Functions secara otomatis.

## 4. Validasi pagu — dua lapis
- **Client** (`src/lib/validasi.ts`, dipakai di `transaksi/form.tsx`): feedback instan agar
  pengguna tidak perlu submit dulu baru tahu salah.
- **Database** (`fn_validasi_dan_hitung_transaksi` trigger di `schema.sql`): sumber
  kebenaran akhir, mencegah race condition dua PPTK menginput bersamaan pada kode
  rekening yang sama. Server action meneruskan pesan error trigger apa adanya.

## 5. Status implementasi (per fase)

| Fase | Cakupan | Status |
|---|---|---|
| 1 | Prototipe UI single-file (form → 3 dokumen, preview cetak browser) | ✅ Selesai — `si-gu-prototype.jsx` |
| 2 | Skema database, arsitektur Next.js, autentikasi, RBAC dasar, generator .docx asli, dashboard real-query | ✅ Selesai |
| 3 | Master Data CRUD penuh (Program, Kegiatan, Sub Kegiatan, Kode Rekening, Pegawai) | ✅ Selesai — `master-data/tabs.tsx` |
| 4 | Import/Export Excel (unggah DPA → isi `kode_rekening` otomatis, ekspor rekening & rekap transaksi) | ✅ Selesai — `api/import/excel`, `api/export/excel` |
| 5 | Rekapitulasi harian/bulanan/triwulanan/tahunan + grafik `recharts` interaktif (per program, sumber dana, PPTK) | ✅ Selesai — `rekapitulasi/charts.tsx` |
| 6 | Manajemen Pengguna (aktif/nonaktif per role), Audit Trail, Backup/Restore (JSON) | ✅ Selesai — `pengguna/`, `audit-trail/`, `backup/` |
| 7 | Generator PDF native (`pdf-lib`) untuk ketiga dokumen — tanpa bergantung LibreOffice/binary eksternal | ✅ Selesai — `lib/documents/pdf/`, `?format=pdf` |
| 8 | Unit test (validasi pagu, format rupiah/terbilang), scaffold e2e Playwright, CI GitHub Actions | ✅ Selesai — `tests/`, `.github/workflows/ci.yml` |
| 9 | Undangan pengguna in-app via Supabase Admin API (`inviteUserByEmail`) | ✅ Selesai — `api/pengguna/invite`, `pengguna/invite-form.tsx` |
| 10 | Deploy produksi ke Vercel + domain resmi, load testing, hardening RLS lanjutan | ⏳ Langkah Anda selanjutnya (lihat bagian Deploy) |

## 8. Testing

```bash
npm run test          # unit test (vitest) — validasi pagu, rupiah, terbilang
npm run test:watch    # mode watch saat development
npm run test:e2e      # e2e Playwright — perlu Supabase terisi + E2E_EMAIL/E2E_PASSWORD
```

E2E test di-skip otomatis jika `E2E_EMAIL`/`E2E_PASSWORD` tidak diset (mis. di lokal tanpa akun uji),
sehingga tidak menghalangi `npm run build`. CI (`.github/workflows/ci.yml`) menjalankan lint → typecheck
→ unit test → build pada setiap push/PR ke `main`; job e2e terpisah dan bersifat `continue-on-error`
sampai secrets Supabase uji disiapkan di GitHub repo Settings.

## 9. Catatan PDF vs DOCX
Setiap dokumen kini bisa diunduh dalam dua format lewat query param:
`/api/documents/{transaksiId}/{jenis}?format=docx` (default) atau `?format=pdf`.
PDF dibuat langsung dengan `pdf-lib` (bukan konversi dari .docx), sehingga tidak perlu
menjalankan LibreOffice headless di server — cocok untuk Vercel serverless. Konsekuensinya,
layout PDF dan DOCX dijaga selaras secara manual di `src/lib/documents/{jenis}.ts` (docx)
dan `src/lib/documents/pdf/{jenis}Pdf.ts` (pdf-lib); bila mengubah format satu dokumen,
perbarui juga versi satunya.

## 6. Catatan keamanan
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di Route Handler server-side (`createServiceRoleClient`)
  untuk menulis `audit_log`/`dokumen` — **jangan pernah** diekspos ke client bundle.
  Middleware sudah menolak akses `/master-data` dsb. bagi role selain Administrator.
- Semua perubahan data tercatat di `audit_log` (aktor, aksi, entitas, detail JSON).
- RLS di `schema.sql` masih contoh dasar (`authenticated` boleh baca/tulis) — perketat
  sebelum produksi, misal PPTK hanya boleh insert transaksi pada `kode_rekening` miliknya sendiri.

## 7. Nomor dokumen
Nomor Nota Dinas & Kwitansi dibuat otomatis di `transaksi/actions.ts` dengan pola
`934/{urut}/35.79.121/{tahun}` — sesuaikan pola ini dengan format penomoran resmi
Setda Kota Batu (biasanya diatur SK Sekda per tahun berjalan) sebelum go-live.

## 10. Kop Surat & Branding
- Kop surat resmi (`public/kop-surat.png`) disisipkan sebagai **gambar asli** di bagian atas
  Nota Dinas dan SPTB — baik versi `.docx` (`lib/documents/kopSurat.ts`, via `ImageRun`) maupun
  `.pdf` (`lib/documents/pdf/layout.ts` fungsi `drawKopSurat`, via `embedPng`). Kwitansi
  sengaja **tidak** memakai kop surat, sesuai template resmi.
- Untuk mengganti kop surat (misal pindah instansi atau logo diperbarui): timpa
  `public/kop-surat.png` dengan gambar baru. Jika rasio lebar:tinggi berbeda dari 1600:325,
  perbarui juga konstanta `KOP_RATIO` di kedua file di atas agar tidak gepeng/melar.
- Logo aplikasi (`public/logo-panda-spj.jpeg`) dipakai di sidebar dashboard, halaman login,
  dan favicon (`src/app/icon.jpeg`, konvensi App Router — otomatis menjadi `/icon.jpeg`).
- Nama aplikasi **PANDA-SPJ** (Pendamping Administrasi Dokumen SPJ) sudah diterapkan di
  seluruh UI, `package.json`, metadata halaman, dan komentar `schema.sql`.

## 11. Catatan keamanan dependency
Log build awal (Vercel) melaporkan **CVE-2025-66478** — kerentanan RCE kritis (CVSS 10.0)
pada Next.js App Router versi 15.x sebelum 15.4.8. `package.json` sudah di-bump ke
`"next": "^15.4.8"` (ter-resolve ke rilis lebih baru saat `npm install`, mis. 15.5.x, yang juga
mencakup patch DoS/source-exposure susulan pada 11 Desember 2025). **Tindakan wajib setelah
menarik update ini**: redeploy ke Vercel, lalu rotasi seluruh secret (`SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` bila memungkinkan) sesuai rekomendasi resmi Next.js —
lihat https://nextjs.org/blog/CVE-2025-66478.

## 12. Login dengan Username (bukan Email)
Supabase Auth secara teknis tetap memakai email di balik layar (`signInWithPassword`
hanya menerima email/phone), tapi pengguna login memakai **username**. Alurnya
(`login/actions.ts`): username → cari `pegawai.id` (service role, bypass RLS) →
ambil email asli via `auth.admin.getUserById(id)` (karena `pegawai.id = auth.users.id`)
→ baru `signInWithPassword` dengan email tsb. Email tidak pernah disimpan ulang di
tabel `pegawai`, jadi tidak ada risiko data tidak sinkron.

**Untuk akun yang SUDAH Anda buat manual di Supabase Authentication:**
1. Jalankan migration `supabase/migrations/0002_add_username_to_pegawai.sql` (aman
   dijalankan berkali-kali) — ini menambahkan kolom `username` pada tabel `pegawai`.
2. Pastikan setiap akun tersebut sudah punya baris di tabel `pegawai` dengan
   `id` yang **sama persis** dengan `id` akunnya di Supabase Authentication
   (lihat kolom `id` di Authentication → Users).
3. Isi kolom `username` masing-masing — lewat SQL Editor:
   ```sql
   update pegawai set username = 'sari.anas' where nip = '198501012009022001';
   ```
   atau lewat UI: Data Master → tab Pegawai → Ubah (field "Username login").
4. Pengguna baru selanjutnya cukup diundang lewat halaman **Pengguna** di aplikasi
   (mengisi username sekaligus saat itu juga) — lihat bagian 9.

## 13. Ringkasan Desain (Login, Topbar, Palet Warna)
- **Halaman login** dirombak total: split-screen, panel kiri bergradasi
  navy→hijau dengan motif garis kontur pegunungan (mewakili "Batu"), panel kanan
  form login bersih dengan ikon, toggle lihat/sembunyikan kata sandi, dan pesan
  error yang tidak membocorkan username mana yang valid.
- **Tombol "Keluar"** dipindah dari pojok kiri-bawah sidebar ke **topbar kanan-atas**,
  disertai avatar inisial pengguna + nama + role, supaya konsisten dengan pola
  aplikasi modern pada umumnya.
- **Palet warna** diperluas (`tailwind.config.ts` → `theme.extend.colors.batu`):
  `batu-navy`, `batu-forest` (hijau), `batu-sky` (biru), `batu-gold`, `batu-mist`,
  `batu-ink` dipakai konsisten di sidebar, topbar, kartu dashboard, dan badge role
  pengguna — tetap profesional (bukan warna-warni acak) karena mengikuti satu
  sistem token warna yang sama di seluruh halaman.
- Font display **Plus Jakarta Sans** (judul/hero) + **Inter** (isi/form/tabel),
  di-self-host lewat paket `@fontsource/*` (bukan `next/font/google`) agar build
  tidak bergantung akses jaringan ke Google Fonts saat proses build — juga lebih
  baik dari sisi privasi karena IP pengguna tidak terkirim ke domain pihak ketiga.

## 14. Troubleshooting Login Tidak Bisa Masuk

Jika akun yang sudah dibuat di Supabase Authentication tetap tidak bisa login,
ikuti urutan berikut:

1. **Jalankan `supabase/BOOTSTRAP_ADMIN_PERTAMA.sql`** — ini kebutuhan #1
   penyebab paling umum: baris `pegawai` untuk akun tsb belum ada, atau
   `id`-nya tidak sama persis dengan `id` akun tsb di Authentication.
2. Pastikan `supabase/migrations/0002_add_username_to_pegawai.sql` sudah
   dijalankan (kolom `username` harus ada di tabel `pegawai`).
3. Pastikan environment variable `SUPABASE_SERVICE_ROLE_KEY` sudah diisi
   dengan benar di Vercel Project Settings → Environment Variables (login
   memakai service role untuk menerjemahkan username → email).
4. Coba login langsung memakai **email** akun tsb (bukan username) di kolom
   yang sama — halaman login kini menerima keduanya. Jika email berhasil
   tapi username tidak, berarti kolom `username` pada baris `pegawai` akun
   tsb kosong — isi lewat Data Master → Pegawai, atau SQL:
   ```sql
   update pegawai set username = 'namauser' where nip = 'NIP_ANDA';
   ```
5. Cek log detail di **Vercel → Deployments → pilih deployment → Functions
   Logs**: server mencatat kode singkat (`PGW-USERNAME`, `PGW-LINK`) yang
   menunjukkan akar masalah tanpa membocorkannya ke pengguna.
6. Setelah bisa login sebagai Administrator, gunakan fitur **Pengguna →
   Tautkan Akun yang Sudah Ada** untuk pengguna berikutnya yang dibuat
   manual di Supabase Authentication (tidak perlu SQL lagi).

## 15. Tahun Anggaran & Tahapan sebagai Konteks Kerja

Halaman login kini meminta **Tahun Anggaran** (2026–2036, sesuai Lampiran 01.
DATABASE) dan **Tahapan** (Murni/Pergeseran/Perubahan). Pilihan ini disimpan
sebagai cookie sesi (`src/lib/konteks-anggaran.ts`) dan menentukan:
- Daftar Kode Rekening yang muncul di halaman Transaksi (difilter per
  `tahun_id`).
- Pagu yang dipakai untuk validasi (`pagu_murni`/`pagu_pergeseran`/`pagu_perubahan`
  sesuai Tahapan yang dipilih).

Konteks ini bisa diganti kapan saja tanpa logout lewat badge **"TA 2026 ·
Perubahan"** di topbar kanan atas. `seed.sql` sudah menyediakan baris
`tahun_anggaran` 2026–2036 (hanya 2026 berstatus `aktif` — aktifkan tahun
berikutnya lewat Data Master saat tahun anggaran baru dibuka).

## 16. Mesin Perhitungan Pajak Pengadaan (`src/lib/pajak.ts`)

Form Transaksi kini punya bagian **Klasifikasi Pajak Rekanan** yang menghitung
PPN, PPh 22, PPh 23, PPh Final Pasal 4(2), dan PPh 21 Final honorarium secara
otomatis, mengikuti aturan pajak pengadaan barang/jasa pemerintah (rujukan
lengkap ada sebagai komentar di puncak file `src/lib/pajak.ts`):

| Objek Pajak | Tarif | Syarat |
|---|---|---|
| PPN | 11% efektif (DPP Nilai Lain 11/12 × 12%) | Hanya rekanan **PKP**; tidak dipungut ≤ Rp2.000.000 |
| PPh 22 (barang) | 1,5% / 3% tanpa NPWP | Tidak dipungut ≤ Rp2.000.000 |
| PPh 23 (jasa lainnya/konsultansi) | 2% / 4% tanpa NPWP | Hanya rekanan **Badan Usaha**; tidak ada batas minimum |
| PPh Final Ps. 4(2) — sewa tanah/bangunan | 10% | Final, tidak terpengaruh NPWP |
| PPh Final Ps. 4(2) — jasa konstruksi | 1,75%–6% | Bervariasi menurut kualifikasi & sertifikasi |
| PPh 21 Final — honorarium ASN | 0% / 5% / 15% | Menurut golongan kepangkatan |
| PPh 21 Final — honorarium Non-ASN | 2,5% (5% × 50% DPP) | Estimasi transaksi tunggal |

Nilai pajak **dihitung & disimpan saat transaksi dibuat** (kolom baru pada
tabel `transaksi`, lihat `supabase/migrations/0003_kolom_pajak_transaksi.sql`),
bukan dihitung ulang saat dokumen dicetak — supaya Kwitansi tetap konsisten
dengan tarif yang berlaku saat transaksi terjadi meski tarif berubah nanti.
Hasilnya otomatis muncul di Kwitansi (docx & PDF) menggantikan baris "Rp 0,00"
yang sebelumnya statis, dan diekspor di **Ekspor Rekap Transaksi (Excel)**.

⚠️ **Modul ini adalah alat bantu hitung, bukan pengganti Bendahara/Verifikator
Pajak.** Klasifikasi objek pajak kerap butuh penilaian kasus per kasus —
form akan menampilkan catatan/peringatan (mis. jasa dari perorangan yang
sebenarnya objek PPh 21, bukan PPh 23) tapi keputusan akhir tetap di tangan
petugas. Selalu verifikasi transaksi bernilai besar/tidak lazim ke KPP setempat.
22 unit test di `tests/unit/pajak.test.ts` memvalidasi setiap skenario tarif.

## 17. CRUD Dokumen (Tambah/Ubah/Hapus/Simpan/Cetak/Lihat)

Halaman **Dokumen** kini mendukung siklus penuh:
- **Tambah** — halaman Transaksi Baru.
- **Ubah** — tombol "Ubah" per baris (hanya transaksi berstatus `draft`) →
  `/transaksi/{id}/edit`, memakai ulang form yang sama dengan mode edit.
- **Hapus** — tombol "Hapus" dengan konfirmasi inline (hanya status `draft`;
  mencegah transaksi yang sudah diajukan/dicairkan terhapus tidak sengaja).
- **Simpan** — otomatis setiap submit form (create/update).
- **Lihat** — tombol "Lihat/Cetak PDF" membuka PDF langsung di tab baru
  (`Content-Disposition: inline`, bukan paksa unduh) sehingga bisa dibaca
  dan dicetak langsung dari browser.
- **Cetak** — dari tab PDF yang terbuka (Ctrl/Cmd+P), atau unduh `.docx`
  untuk dicetak lewat Word.

Transaksi berstatus selain `draft` (`diajukan`/`disetujui`/`dicairkan`/`ditolak`)
sengaja dikunci dari Ubah/Hapus untuk menjaga jejak audit tetap utuh — gunakan
kolom `status` (lihat `master-data`/proses bisnis internal) untuk mengelola
alur persetujuan lebih lanjut di fase berikutnya.

## 18. Data Master Terkunci Sesuai Tahapan (Murni/Pergeseran/Perubahan)

Sesuai `1__DATABASE.pdf` yang punya 3 kolom pagu (Murni/Pergeseran/Perubahan)
per baris Kode Rekening, halaman **Data Master** kini mengikuti aturan:

- **Tahapan Murni & Pergeseran** → Program, Kegiatan, Sub Kegiatan, dan Kode
  Rekening bersifat **baca-saja** (mencerminkan DPA resmi apa adanya — tombol
  Tambah/Ubah/Hapus disembunyikan, dan server action `master-data/actions.ts`
  juga menolak permintaan langsung lewat guard `pastikanTahapanPerubahan()`,
  bukan cuma disembunyikan di UI).
- **Tahapan Perubahan** → bisa menambah/mengubah, dengan urutan pengisian
  yang dipandu langsung di halaman: **Program → Kegiatan → Sub Kegiatan →
  Kode Rekening** (Belanja + Sumber Dana + Anggaran + PPTK diisi sekaligus
  di tab terakhir). Kode Rekening yang baru dibuat pada tahap ini otomatis
  Pagu Murni & Pergeseran = 0 (karena memang belum ada di tahap sebelumnya),
  hanya Pagu Perubahan yang diisi.
- Ganti Tahapan aktif kapan saja lewat badge **"TA 2026 · ..."** di topbar
  (lihat bagian 15) — tidak perlu logout.
- Pegawai (PPTK/KPA/BPP) TIDAK ikut terkunci oleh Tahapan, karena data
  kepegawaian bukan bagian dari struktur anggaran per-tahap.

## 19. Banner "Atur Username" (Self-Service)

Jika akun yang sedang login belum punya `username` (kolom `pegawai.username`
kosong), banner kuning otomatis muncul di atas semua halaman dashboard berisi
input untuk mengatur username sendiri — tidak perlu ke Master Data atau minta
bantuan Administrator. Ini pelengkap `BOOTSTRAP_ADMIN_PERTAMA.sql` (bagian 14):
skrip SQL untuk akun PERTAMA yang belum bisa login sama sekali, banner ini
untuk melengkapi username SETELAH berhasil login (mis. lewat email). Banner
otomatis hilang begitu username tersimpan, dan tidak muncul lagi untuk akun
yang sudah punya username.

## 20. Pajak Daerah & PPh Perorangan (Selaras Template Asli Kuitansi)

Menindaklanjuti `4__KUITANSI_GU.pdf` yang memiliki baris tetap "Pajak Daerah 10%"
dan "PPH Perorangan", kedua ini kini **digabung** dengan mesin pajak rinci yang
sudah ada (bagian 16), bukan saling menggantikan:

- **Pajak Daerah 10%** — checkbox opsional "Kena Pajak Daerah (Restoran/Rumah
  Makan/Hotel)" di form Transaksi. Sesuai UU HKPD No. 1/2022, objek Pajak
  Daerah dan PPN saling meniadakan (restoran/hotel bukan objek PPN) — begitu
  toggle ini aktif, **PPN otomatis tidak dipungut** sama sekali, walau
  rekanan berstatus PKP. Tetap bisa dipungut bersamaan dengan PPh 22
  (mis. katering dari toko yang juga kena Pajak Daerah).
- **PPh Perorangan** — sebelumnya form hanya menampilkan *peringatan* saat
  rekanan Jasa Lainnya/Konsultansi berstatus Perorangan (karena bukan objek
  PPh 23). Sekarang otomatis **dihitung** 2,5% (5% × 50% DPP) dan diberi
  label "PPh Perorangan" — persis istilah di kuitansi asli — alih-alih
  dibiarkan Rp 0.

Kedua baris ini muncul berdampingan dengan PPN/PPh22/PPh23/PPh Final/PPh21
Final di Kwitansi (docx, PDF, dan ekspor Excel), sesuai baris yang benar-benar
berlaku untuk transaksi tsb — bukan seluruh baris ditampilkan sekaligus.
Lihat `supabase/migrations/0004_pajak_daerah_dan_perorangan.sql` dan 4 unit
test tambahan di `tests/unit/pajak.test.ts` (total 26 test pajak, 40 test
keseluruhan).

## 21. Data Awal Kode Rekening (Import Excel Siap Pakai)

`Kode_Rekening_Import_PANDA-SPJ.xlsx` (dibagikan terpisah, di luar isi repo)
berisi ke-52 baris `1__DATABASE.pdf` yang sudah diformat persis sesuai kolom
yang diharapkan modul Import Excel (Data Master → Import/Export Excel):
`Kode Rekening, Program, Kegiatan, Sub Kegiatan, Belanja, Sumber Dana, PPTK,
Pagu Murni, Pagu Pergeseran, Pagu Perubahan`. Kolom **Pagu Pergeseran** diisi
sama dengan **Pagu Murni** karena lampiran asli hanya mencantumkan kolom
Murni dan Perubahan — sesuaikan manual per baris di Data Master (Tahapan
Perubahan) bila nilai Pergeseran sesungguhnya berbeda.

**Dashboard/Transaksi kosong sebelumnya karena `seed.sql` hanya memuat SATU
baris contoh** — bukan bug, tapi karena data DPA lengkap memang belum
diimpor. Setelah file Excel ini diunggah, Dashboard dan Transaksi akan
otomatis terisi (keduanya sudah difilter sesuai Tahun Anggaran & Tahapan
yang dipilih saat login).

## 22. Perbaikan UX & Performa

- **Dashboard** sekarang memfilter Kode Rekening & Transaksi berdasarkan
  konteks Tahun Anggaran aktif (sebelumnya menampilkan seluruh data tanpa
  filter tahun, dan selalu memakai Pagu Perubahan berapa pun Tahapan yang
  dipilih). Pesan status kosong yang jelas ditambahkan, konsisten dengan
  halaman Transaksi.
- **Header/topbar kini statis (tidak ikut scroll)** — akar masalahnya
  container terluar memakai `min-h-screen` (boleh tumbuh melebihi viewport,
  membuat seluruh halaman ikut di-scroll browser) diganti `h-screen` tetap,
  sehingga hanya area konten (`<main>`) yang scroll secara internal.
- **Nama akun yang tampil** di sidebar/topbar sekarang prioritas
  `nama lengkap → username → email` (sebelumnya langsung jatuh ke email
  begitu `pegawai.nama` kosong). Isi Nama lengkap pegawai lewat Data Master
  atau `BOOTSTRAP_ADMIN_PERTAMA.sql` agar tidak tampil sebagai email/username.
- **Login & navigasi dipercepat**: `middleware.ts` meneruskan `user.id` lewat
  header `x-user-id` sehingga `layout.tsx` tidak perlu memanggil
  `supabase.auth.getUser()` kedua kalinya di setiap navigasi (sebelumnya
  dipanggil 2× per halaman — sekali di middleware, sekali lagi di layout).
  Lookup profil pegawai & konteks Tahun/Tahapan juga dijalankan paralel
  (`Promise.all`) alih-alih berurutan. Proses login sendiri memparalelkan
  lookup Tahun Anggaran/Tahapan dengan proses autentikasi.
  Latensi sisa yang tidak bisa dihilangkan dari sisi kode: jarak jaringan
  Vercel Function ↔ project Supabase — kalau masih terasa lambat, cek region
  project Supabase Anda (Project Settings → General) dan usahakan sedekat
  mungkin dengan region Vercel Function (`iad1`/Washington DC pada log build
  Anda); kalau project Supabase ada di region lain (mis. Singapore), pindahkan
  region deployment Vercel Function lewat `vercel.json` (`"regions": ["sin1"]`)
  supaya keduanya berdekatan.

## 23. Konteks Tahun Anggaran/Tahapan Kini "Self-Healing"

Sebelumnya, kalau `seed.sql` belum/lupa dijalankan (tabel `tahun_anggaran`
dan/atau `tahapan_anggaran` kosong), aplikasi gagal membentuk konteks kerja
**tanpa pesan yang jelas**: badge "TA ..." di topbar tidak muncul sama sekali
(cuma kelihatan tombol Keluar), halaman Transaksi bilang "Belum ada Kode
Rekening untuk Tahun Anggaran " (kosong tanpa angka tahun), dan Import Excel
gagal dengan pesan "Tahun Anggaran aktif tidak terdeteksi" — padahal akar
masalahnya satu: data dasar tahun/tahapan belum ada.

Sekarang `src/lib/konteks-anggaran.ts` punya fungsi `pastikanKonteksTersedia()`
yang dipanggil dari **login** dan **switcher topbar** — kalau baris tahun yang
dipilih belum ada, dibuat otomatis (`status: 'aktif'`); kalau 3 baris tahapan
standar (Murni/Pergeseran/Perubahan) belum ada, dibuat otomatis juga. Jadi
aplikasi tidak lagi bergantung sepenuhnya pada `seed.sql` sudah dijalankan
lebih dulu untuk bagian ini secara spesifik (data Kode Rekening tetap perlu
diisi manual/impor seperti biasa — hanya kerangka tahun/tahapannya yang
self-healing).

Sebagai jaring pengaman terakhir, kalau karena suatu sebab konteks tetap
gagal terbentuk, topbar sekarang menampilkan badge merah "⚠️ Konteks Tahun
Anggaran belum terbentuk" — **selalu ada sesuatu yang terlihat di pojok kanan
atas**, tidak lagi kosong tanpa penjelasan seperti sebelumnya.
