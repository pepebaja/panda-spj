import { test, expect } from "@playwright/test";

/**
 * Skenario inti: login → isi transaksi → validasi pagu real-time → simpan
 * → 3 dokumen dapat diunduh. Membutuhkan environment dengan Supabase terisi
 * (jalankan supabase/schema.sql + seed.sql) dan variabel berikut di CI:
 *   E2E_EMAIL, E2E_PASSWORD — akun pengguna uji dengan role PPTK.
 * Jika variabel tidak diset, test di-skip agar tidak gagal di lingkungan
 * tanpa Supabase (mis. saat hanya menjalankan `npm run build`).
 */

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("Alur pencairan GU", () => {
  test.skip(!email || !password, "E2E_EMAIL / E2E_PASSWORD belum diset — lewati e2e di lingkungan ini.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Kata Sandi").fill(password!);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("menampilkan dashboard dengan kartu ringkasan pagu", async ({ page }) => {
    await expect(page.getByText("Total Pagu")).toBeVisible();
    await expect(page.getByText("Total Realisasi")).toBeVisible();
  });

  test("menolak transaksi yang melebihi sisa pagu", async ({ page }) => {
    await page.goto("/transaksi");
    await page.getByLabel("Judul Kegiatan / Acara").fill("Uji Coba E2E Melebihi Pagu");
    await page.getByLabel("Tanggal Kegiatan").fill("2026-08-01");
    await page.getByPlaceholder("Uraian barang/jasa").fill("Item uji coba");
    await page.getByPlaceholder("Vol").fill("1");
    await page.getByPlaceholder("Harga satuan").fill("999999999999");
    await expect(page.getByText(/Ajuan melebihi sisa pagu/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Simpan & Buat 3 Dokumen/ })).toBeDisabled();
  });

  test("berhasil membuat transaksi valid dan menampilkan 3 dokumen", async ({ page }) => {
    await page.goto("/transaksi");
    await page.getByLabel("Judul Kegiatan / Acara").fill("Uji Coba E2E Rapat Koordinasi");
    await page.getByLabel("Tanggal Kegiatan").fill("2026-08-01");
    await page.getByPlaceholder("Uraian barang/jasa").fill("Konsumsi rapat");
    await page.getByPlaceholder("Vol").fill("10");
    await page.getByPlaceholder("Harga satuan").fill("25000");
    await page.getByRole("button", { name: /Simpan & Buat 3 Dokumen/ }).click();

    await expect(page).toHaveURL(/\/dokumen/);
    await expect(page.getByText("Nota Dinas")).toBeVisible();
    await expect(page.getByText("SPTB")).toBeVisible();
    await expect(page.getByText("Kwitansi")).toBeVisible();
  });
});
