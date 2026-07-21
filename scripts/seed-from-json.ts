// scripts/seed-from-json.ts
// Migrates existing data/ JSON files into the PostgreSQL database.
// Safe to run multiple times (upserts, skips if data already present).
// Run: npx tsx scripts/seed-from-json.ts

import "dotenv/config";
import path from "path";
import fs from "fs";
import { db } from "../src/db";

const DATA_DIR = path.join(process.cwd(), "data");

function readJson(filename: string): any | null {
  const p = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

async function upsertSetting(key: string, value: any) {
  await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  console.log(`✓ Setting '${key}' seeded.`);
}

async function main() {
  console.log("Memulai seed dari JSON files ke database...\n");

  // Config objects & collections (replace the DB defaults with file contents if files exist)
  const collectionKeys: [string, string][] = [
    ["competencies", "competencies.json"],
    ["milestones", "milestones.json"],
    ["gallery", "gallery.json"],
    ["alumni", "alumni.json"],
    ["news", "news.json"],
    ["partners", "partners.json"],
    ["branding", "branding.json"],
    ["kepala-sekolah", "kepala-sekolah.json"],
    ["manajemen-sekolah", "manajemen-sekolah.json"],
    ["visi-misi", "visi-misi.json"],
    ["social-media", "social-media.json"],
    ["about", "about.json"],
  ];

  for (const [key, filename] of collectionKeys) {
    const data = readJson(filename);
    if (data !== null) {
      await upsertSetting(key, data);
    } else {
      console.log(`  (skip) ${filename} tidak ditemukan`);
    }
  }

  // Admin credentials from admin-credentials.json
  const adminCreds = readJson("admin-credentials.json");
  if (adminCreds?.username && adminCreds?.password) {
    await db.adminCredential.upsert({
      where: { id: 1 },
      update: { username: adminCreds.username, password: adminCreds.password },
      create: { id: 1, username: adminCreds.username, password: adminCreds.password },
    });
    console.log(`✓ AdminCredential seeded.`);
  } else {
    console.log(`  (skip) admin-credentials.json tidak ditemukan atau tidak valid`);
  }

  // Tracer entries
  const tracerData = readJson("tracer.json");
  if (Array.isArray(tracerData) && tracerData.length > 0) {
    let count = 0;
    for (const entry of tracerData) {
      const { id, createdAt, ...rest } = entry;
      const entryId = id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      await db.tracerEntry.upsert({
        where: { id: entryId },
        update: { data: rest },
        create: { id: entryId, data: rest, ...(createdAt ? { createdAt: new Date(createdAt) } : {}) },
      }).catch(() => {});
      count++;
    }
    console.log(`✓ TracerEntry: ${count} entries seeded.`);
  }

  // Contact messages
  const contactData = readJson("contact-messages.json");
  if (Array.isArray(contactData) && contactData.length > 0) {
    let count = 0;
    for (const msg of contactData) {
      await db.contactMessage.upsert({
        where: { id: msg.id },
        update: {},
        create: {
          id: msg.id,
          nama: msg.nama || "",
          email: msg.email || "",
          noHp: msg.noHp || "",
          keperluan: msg.keperluan || "",
          pesan: msg.pesan || "",
          waktu: msg.waktu ? new Date(msg.waktu) : new Date(),
          dibaca: msg.dibaca ?? false,
        },
      }).catch(() => {});
      count++;
    }
    console.log(`✓ ContactMessage: ${count} messages seeded.`);
  }

  // Aduan publik
  const aduanData = readJson("aduan-publik.json");
  if (Array.isArray(aduanData) && aduanData.length > 0) {
    let count = 0;
    for (const a of aduanData) {
      await db.aduanPublik.upsert({
        where: { id: a.id },
        update: {},
        create: {
          id: a.id,
          namaLengkap: a.namaLengkap || "",
          noHp: a.noHp || "",
          alamat: a.alamat || "",
          judul: a.judul || "",
          isi: a.isi || "",
          tanggal: a.tanggal || "",
          lokasi: a.lokasi || "",
          kategori: a.kategori || "",
          anonim: a.anonim ?? false,
          rahasia: a.rahasia ?? false,
          status: a.status || "BARU",
          catatan: a.catatan || "",
          ...(a.createdAt ? { createdAt: new Date(a.createdAt) } : {}),
          ...(a.updatedAt ? { updatedAt: new Date(a.updatedAt) } : {}),
        },
      }).catch(() => {});
      count++;
    }
    console.log(`✓ AduanPublik: ${count} entries seeded.`);
  }

  // Suara Skansagiri articles
  const suaraData = readJson("suara-skansagiri.json");
  if (Array.isArray(suaraData) && suaraData.length > 0) {
    let count = 0;
    for (const k of suaraData) {
      await db.karyaSiswa.upsert({
        where: { id: k.id },
        update: {},
        create: {
          id: k.id,
          title: k.title,
          slug: k.slug,
          content: k.content,
          excerpt: k.excerpt,
          category: k.category,
          status: k.status || "REVIEW",
          feedback: k.feedback || null,
          views: k.views || 0,
          likes: k.likes || 0,
          authorName: k.authorName,
          authorClass: k.authorClass,
          authorJurusan: k.authorJurusan || "",
          tags: Array.isArray(k.tags) ? k.tags : [],
          ...(k.createdAt ? { createdAt: new Date(k.createdAt) } : {}),
          ...(k.publishedAt ? { publishedAt: new Date(k.publishedAt) } : {}),
        },
      }).catch((e: any) => console.error(`  ! KaryaSiswa ${k.id}:`, e.message));
      count++;
    }
    console.log(`✓ KaryaSiswa: ${count} articles seeded.`);
  }

  // Komentar suara
  const komentarData = readJson("suara-komentar.json");
  if (Array.isArray(komentarData) && komentarData.length > 0) {
    let count = 0;
    for (const k of komentarData) {
      await db.komentarSuara.upsert({
        where: { id: k.id },
        update: {},
        create: {
          id: k.id,
          artikelId: k.artikelId,
          artikelTitle: k.artikelTitle || "",
          authorName: k.authorName,
          authorClass: k.authorClass || "",
          content: k.content,
          status: k.status || "PENDING",
          ...(k.createdAt ? { createdAt: new Date(k.createdAt) } : {}),
        },
      }).catch(() => {});
      count++;
    }
    console.log(`✓ KomentarSuara: ${count} comments seeded.`);
  }

  console.log("\nSeed selesai!");
  await db.$disconnect();
}

main().catch(e => {
  console.error("Seed error:", e);
  process.exit(1);
});
