import { redirect } from "next/navigation";

export default function RootPage() {
  // "/" tidak punya tampilan sendiri — middleware yang menentukan tujuan akhir
  // (ke /login jika belum masuk, atau tetap ke /dashboard jika sudah login).
  // Route ini WAJIB ada: tanpanya, "/" dianggap path yang tidak dikenal dan
  // Next.js langsung menyajikan halaman 404 statis tanpa melewati middleware.
  redirect("/dashboard");
}
