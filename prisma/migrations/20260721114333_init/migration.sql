-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AdminCredential" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "AdminCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "TracerEntry" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TracerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "noHp" TEXT NOT NULL DEFAULT '',
    "keperluan" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dibaca" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AduanPublik" (
    "id" TEXT NOT NULL,
    "namaLengkap" TEXT NOT NULL,
    "noHp" TEXT NOT NULL DEFAULT '',
    "alamat" TEXT NOT NULL DEFAULT '',
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "tanggal" TEXT NOT NULL,
    "lokasi" TEXT NOT NULL,
    "kategori" TEXT NOT NULL,
    "anonim" BOOLEAN NOT NULL DEFAULT false,
    "rahasia" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'BARU',
    "catatan" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AduanPublik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KaryaSiswa" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REVIEW',
    "feedback" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "authorName" TEXT NOT NULL,
    "authorClass" TEXT NOT NULL,
    "authorJurusan" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "KaryaSiswa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KomentarSuara" (
    "id" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "artikelTitle" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorClass" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KomentarSuara_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KaryaSiswa_slug_key" ON "KaryaSiswa"("slug");

-- AddForeignKey
ALTER TABLE "KomentarSuara" ADD CONSTRAINT "KomentarSuara_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "KaryaSiswa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
