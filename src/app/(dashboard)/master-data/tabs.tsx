"use client";

import { useState, useTransition } from "react";
import { rupiah } from "@/lib/format";
import {
  simpanProgram, hapusProgram, simpanKegiatan, hapusKegiatan,
  simpanSubKegiatan, hapusSubKegiatan, simpanKodeRekening, hapusKodeRekening,
  simpanPegawai,
} from "./actions";

const TABS = [
  { id: "rekening", label: "Kode Rekening" },
  { id: "program", label: "Program" },
  { id: "kegiatan", label: "Kegiatan" },
  { id: "subkegiatan", label: "Sub Kegiatan" },
  { id: "pegawai", label: "Pegawai" },
];

export default function MasterDataTabs({ tahunList, programList, kegiatanList, subKegiatanList, rekeningList, pegawaiList, sumberDanaList, tahunId, bisaUbah }: any) {
  const [tab, setTab] = useState("rekening");
  const tahunAktifId = tahunId || tahunList.find((t: any) => t.status === "aktif")?.id || tahunList[0]?.id;

  return (
    <div>
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-4 w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium ${tab === t.id ? "bg-white shadow-sm text-batu-navy" : "text-slate-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rekening" && (
        <RekeningTab list={rekeningList} subKegiatanList={subKegiatanList} sumberDanaList={sumberDanaList} pegawaiList={pegawaiList} tahunAktifId={tahunAktifId} bisaUbah={bisaUbah} />
      )}
      {tab === "program" && <ProgramTab list={programList} tahunAktifId={tahunAktifId} bisaUbah={bisaUbah} />}
      {tab === "kegiatan" && <KegiatanTab list={kegiatanList} programList={programList} bisaUbah={bisaUbah} />}
      {tab === "subkegiatan" && <SubKegiatanTab list={subKegiatanList} kegiatanList={kegiatanList} bisaUbah={bisaUbah} />}
      {tab === "pegawai" && <PegawaiTab list={pegawaiList} />}
    </div>
  );
}

function Toolbar({ onAdd, label, bisaUbah }: { onAdd: () => void; label: string; bisaUbah: boolean }) {
  return (
    <div className="flex justify-between items-center mb-3">
      <div className="font-semibold text-sm text-batu-navy">{label}</div>
      {bisaUbah ? (
        <button onClick={onAdd} className="text-[12px] px-3 py-1.5 rounded-md bg-batu-navy text-white font-medium hover:bg-batu-navy/90">+ Tambah</button>
      ) : (
        <span className="text-[11px] text-slate-400" title="Hanya bisa ditambah pada Tahapan Perubahan">🔒 Baca saja</span>
      )}
    </div>
  );
}

function AksiBaris({ bisaUbah, onEdit, onDelete }: { bisaUbah: boolean; onEdit: () => void; onDelete: () => void }) {
  if (!bisaUbah) return <span className="text-slate-300 text-[11px]">—</span>;
  return (
    <>
      <button onClick={onEdit} className="text-sky-600 mr-3">Ubah</button>
      <button onClick={onDelete} className="text-rose-600">Hapus</button>
    </>
  );
}

// ---------- Program ----------
function ProgramTab({ list, tahunAktifId, bisaUbah }: any) {
  const [editing, setEditing] = useState<any>(null);
  const [pending, start] = useTransition();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <Toolbar label={`Program (${list.length})`} onAdd={() => setEditing({})} bisaUbah={bisaUbah} />
      {editing && bisaUbah && (
        <form action={(fd) => start(async () => { fd.set("tahun_id", tahunAktifId); if (editing.id) fd.set("id", editing.id); await simpanProgram(fd); setEditing(null); })}
          className="flex gap-2 mb-3 bg-batu-mist p-3 rounded-lg">
          <input name="nama" defaultValue={editing.nama} required placeholder="Nama program" className="flex-1 border rounded px-2 py-1.5 text-sm" />
          <button disabled={pending} className="px-3 py-1.5 bg-batu-navy text-white rounded text-sm">Simpan</button>
          <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 border rounded text-sm">Batal</button>
        </form>
      )}
      <table className="w-full text-[12.5px]">
        <tbody>
          {list.map((p: any) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="p-2">{p.nama}</td>
              <td className="p-2 text-right w-32">
                <AksiBaris bisaUbah={bisaUbah} onEdit={() => setEditing(p)} onDelete={() => start(async () => { await hapusProgram(p.id); })} />
              </td>
            </tr>
          ))}
          {list.length === 0 && <tr><td colSpan={2} className="p-4 text-center text-slate-400">Belum ada Program untuk tahun ini.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Kegiatan ----------
function KegiatanTab({ list, programList, bisaUbah }: any) {
  const [editing, setEditing] = useState<any>(null);
  const [pending, start] = useTransition();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <Toolbar label={`Kegiatan (${list.length})`} onAdd={() => setEditing({})} bisaUbah={bisaUbah} />
      {editing && bisaUbah && (
        <form action={(fd) => start(async () => { if (editing.id) fd.set("id", editing.id); await simpanKegiatan(fd); setEditing(null); })}
          className="flex gap-2 mb-3 bg-batu-mist p-3 rounded-lg">
          <select name="program_id" defaultValue={editing.program_id} required className="border rounded px-2 py-1.5 text-sm">
            <option value="">Pilih Program</option>
            {programList.map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
          <input name="nama" defaultValue={editing.nama} required placeholder="Nama kegiatan" className="flex-1 border rounded px-2 py-1.5 text-sm" />
          <button disabled={pending} className="px-3 py-1.5 bg-batu-navy text-white rounded text-sm">Simpan</button>
          <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 border rounded text-sm">Batal</button>
        </form>
      )}
      <table className="w-full text-[12.5px]">
        <tbody>
          {list.map((k: any) => (
            <tr key={k.id} className="border-t border-slate-100">
              <td className="p-2 text-slate-400 w-64">{k.program?.nama}</td>
              <td className="p-2">{k.nama}</td>
              <td className="p-2 text-right w-32">
                <AksiBaris bisaUbah={bisaUbah} onEdit={() => setEditing(k)} onDelete={() => start(async () => { await hapusKegiatan(k.id); })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Sub Kegiatan ----------
function SubKegiatanTab({ list, kegiatanList, bisaUbah }: any) {
  const [editing, setEditing] = useState<any>(null);
  const [pending, start] = useTransition();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <Toolbar label={`Sub Kegiatan (${list.length})`} onAdd={() => setEditing({})} bisaUbah={bisaUbah} />
      {editing && bisaUbah && (
        <form action={(fd) => start(async () => { if (editing.id) fd.set("id", editing.id); await simpanSubKegiatan(fd); setEditing(null); })}
          className="flex gap-2 mb-3 bg-batu-mist p-3 rounded-lg">
          <select name="kegiatan_id" defaultValue={editing.kegiatan_id} required className="border rounded px-2 py-1.5 text-sm">
            <option value="">Pilih Kegiatan</option>
            {kegiatanList.map((k: any) => <option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <input name="nama" defaultValue={editing.nama} required placeholder="Nama sub kegiatan" className="flex-1 border rounded px-2 py-1.5 text-sm" />
          <button disabled={pending} className="px-3 py-1.5 bg-batu-navy text-white rounded text-sm">Simpan</button>
          <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 border rounded text-sm">Batal</button>
        </form>
      )}
      <table className="w-full text-[12.5px]">
        <tbody>
          {list.map((s: any) => (
            <tr key={s.id} className="border-t border-slate-100">
              <td className="p-2 text-slate-400 w-64">{s.kegiatan?.nama}</td>
              <td className="p-2">{s.nama}</td>
              <td className="p-2 text-right w-32">
                <AksiBaris bisaUbah={bisaUbah} onEdit={() => setEditing(s)} onDelete={() => start(async () => { await hapusSubKegiatan(s.id); })} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------- Kode Rekening ----------
function RekeningTab({ list, subKegiatanList, sumberDanaList, pegawaiList, tahunAktifId, bisaUbah }: any) {
  const [editing, setEditing] = useState<any>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const isNewRow = editing && !editing.id;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <Toolbar label={`Kode Rekening (${list.length})`} onAdd={() => setEditing({})} bisaUbah={bisaUbah} />
      {editing && bisaUbah && (
        <form action={(fd) => start(async () => {
            fd.set("tahun_id", tahunAktifId); if (editing.id) fd.set("id", editing.id);
            if (isNewRow) { fd.set("pagu_murni", "0"); fd.set("pagu_pergeseran", "0"); }
            const res = await simpanKodeRekening(fd);
            if (res?.error) setError(res.error); else { setEditing(null); setError(""); }
          })}
          className="grid grid-cols-3 gap-2 mb-3 bg-batu-mist p-3 rounded-lg">
          {isNewRow && (
            <div className="col-span-3 text-[11.5px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5">
              ✏️ Kode rekening baru (Perubahan) — Pagu Murni &amp; Pergeseran otomatis diisi 0, cukup isi Pagu Perubahan di bawah.
            </div>
          )}
          <input name="kode" defaultValue={editing.kode} required placeholder="4.01.01.2.02.0002.5.1.02.02.001.00080" className="col-span-3 border rounded px-2 py-1.5 text-sm font-mono" />
          <select name="sub_kegiatan_id" defaultValue={editing.sub_kegiatan_id} required className="border rounded px-2 py-1.5 text-sm">
            <option value="">Sub Kegiatan</option>
            {subKegiatanList.map((s: any) => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          <select name="sumber_dana_id" defaultValue={editing.sumber_dana_id} required className="border rounded px-2 py-1.5 text-sm">
            <option value="">Sumber Dana</option>
            {sumberDanaList.map((s: any) => <option key={s.id} value={s.id}>{s.kode}</option>)}
          </select>
          <select name="pptk_id" defaultValue={editing.pptk_id} required className="border rounded px-2 py-1.5 text-sm">
            <option value="">PPTK</option>
            {pegawaiList.filter((p: any) => p.role === "PPTK").map((p: any) => <option key={p.id} value={p.id}>{p.nama}</option>)}
          </select>
          <input name="belanja" defaultValue={editing.belanja} required placeholder="Uraian belanja" className="col-span-3 border rounded px-2 py-1.5 text-sm" />
          {!isNewRow && (
            <>
              <input name="pagu_murni" type="number" defaultValue={editing.pagu_murni} disabled placeholder="Pagu Murni" className="border rounded px-2 py-1.5 text-sm bg-slate-100 text-slate-500" title="Pagu Murni bersifat tetap sesuai DPA, tidak bisa diubah dari sini" />
              <input name="pagu_pergeseran" type="number" defaultValue={editing.pagu_pergeseran} disabled placeholder="Pagu Pergeseran" className="border rounded px-2 py-1.5 text-sm bg-slate-100 text-slate-500" title="Pagu Pergeseran bersifat tetap sesuai DPA, tidak bisa diubah dari sini" />
            </>
          )}
          <input name="pagu_perubahan" type="number" defaultValue={editing.pagu_perubahan} placeholder="Pagu Perubahan" className={`border rounded px-2 py-1.5 text-sm ${isNewRow ? "col-span-3" : ""}`} />
          {error && <div className="col-span-3 text-rose-600 text-[12px]">{error}</div>}
          <div className="col-span-3 flex gap-2">
            <button disabled={pending} className="px-3 py-1.5 bg-batu-navy text-white rounded text-sm">Simpan</button>
            <button type="button" onClick={() => { setEditing(null); setError(""); }} className="px-3 py-1.5 border rounded text-sm">Batal</button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead className="text-slate-400 text-[10.5px] uppercase">
            <tr><th className="text-left p-2">Kode</th><th className="text-left p-2">Belanja</th><th className="text-right p-2">Pagu Murni</th><th className="text-right p-2">Pagu Pergeseran</th><th className="text-right p-2">Pagu Perubahan</th><th className="p-2 w-24"></th></tr>
          </thead>
          <tbody>
            {list.map((r: any) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-2 font-mono text-[10.5px] text-slate-500">{r.kode}</td>
                <td className="p-2">{r.belanja}</td>
                <td className="p-2 text-right text-slate-400">{rupiah(r.pagu_murni)}</td>
                <td className="p-2 text-right text-slate-400">{rupiah(r.pagu_pergeseran)}</td>
                <td className="p-2 text-right font-medium">{rupiah(r.pagu_perubahan)}</td>
                <td className="p-2 text-right">
                  <AksiBaris bisaUbah={bisaUbah} onEdit={() => setEditing(r)} onDelete={() => start(async () => { await hapusKodeRekening(r.id); })} />
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-400">Belum ada Kode Rekening untuk tahun ini.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Pegawai ----------
function PegawaiTab({ list }: any) {
  const [editing, setEditing] = useState<any>(null);
  const [pending, start] = useTransition();
  const ROLES = ["Administrator", "KPA", "PPTK", "BPP", "Auditor", "Viewer"];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
      <Toolbar label={`Pegawai (${list.length})`} onAdd={() => setEditing({})} bisaUbah={true} />
      {editing && (
        <form action={(fd) => start(async () => { if (editing.id) fd.set("id", editing.id); await simpanPegawai(fd); setEditing(null); })}
          className="grid grid-cols-3 gap-2 mb-3 bg-batu-mist p-3 rounded-lg">
          <input name="nama" defaultValue={editing.nama} required placeholder="Nama lengkap" className="border rounded px-2 py-1.5 text-sm" />
          <input name="nip" defaultValue={editing.nip} required placeholder="NIP" className="border rounded px-2 py-1.5 text-sm" />
          <input name="username" defaultValue={editing.username} placeholder="Username login (opsional)" className="border rounded px-2 py-1.5 text-sm" />
          <select name="role" defaultValue={editing.role} required className="border rounded px-2 py-1.5 text-sm">
            <option value="">Role</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <input name="pangkat" defaultValue={editing.pangkat} placeholder="Pangkat/Golongan" className="border rounded px-2 py-1.5 text-sm" />
          <input name="jabatan" defaultValue={editing.jabatan} placeholder="Jabatan" className="border rounded px-2 py-1.5 text-sm" />
          <input name="no_sk" defaultValue={editing.no_sk} placeholder="Nomor SK" className="border rounded px-2 py-1.5 text-sm" />
          <div className="col-span-3 flex gap-2">
            <button disabled={pending} className="px-3 py-1.5 bg-batu-navy text-white rounded text-sm">Simpan</button>
            <button type="button" onClick={() => setEditing(null)} className="px-3 py-1.5 border rounded text-sm">Batal</button>
          </div>
        </form>
      )}
      <table className="w-full text-[12.5px]">
        <thead className="text-slate-400 text-[10.5px] uppercase"><tr><th className="text-left p-2">Nama</th><th className="text-left p-2">NIP</th><th className="text-left p-2">Username</th><th className="text-left p-2">Role</th><th className="text-left p-2">Status</th><th className="p-2 w-20"></th></tr></thead>
        <tbody>
          {list.map((p: any) => (
            <tr key={p.id} className="border-t border-slate-100">
              <td className="p-2">{p.nama}</td>
              <td className="p-2 text-slate-500">{p.nip}</td>
              <td className="p-2 text-slate-500">{p.username || <span className="text-slate-300">—</span>}</td>
              <td className="p-2"><span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10.5px]">{p.role}</span></td>
              <td className="p-2">{p.status_aktif ? "Aktif" : "Nonaktif"}</td>
              <td className="p-2 text-right"><button onClick={() => setEditing(p)} className="text-sky-600">Ubah</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
