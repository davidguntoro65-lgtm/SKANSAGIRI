import { useEffect, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Check, ClipboardList, FileDown, HeartHandshake, Info, LockKeyhole, Printer, ShieldCheck } from "lucide-react";
import { navigate } from "../utils/navigation";

const officialSources = [
  {
    title: "Permendikbudristek Nomor 48 Tahun 2023",
    href: "https://peraturan.bpk.go.id/Details/285711/permendikbudriset-no-48-tahun-2023",
  },
  {
    title: "PP Nomor 13 Tahun 2020",
    href: "https://peraturan.bpk.go.id/Details/132596/pp-no-13-tahun-2020",
  },
  {
    title: "UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi",
    href: "https://peraturan.go.id/id/uu-no-27-tahun-2022",
  },
];

const supportNeeds = [
  "Instruksi yang singkat, bertahap, atau diulang",
  "Bantuan membaca, menulis, atau berhitung",
  "Bantuan menjaga konsentrasi atau menyelesaikan tugas",
  "Cara komunikasi yang lebih sesuai",
  "Dukungan saat berinteraksi atau mengikuti kegiatan bersama",
  "Pendampingan pada kegiatan belajar tertentu",
  "Waktu tambahan untuk memahami atau mengerjakan tugas",
  "Penyesuaian ruang, alat, akses gerak, atau kebutuhan sensorik",
];

const learningAreas = [
  ["Kemampuan akademik/belajar", "Bagian yang sudah dikuasai dan yang masih perlu dibantu."],
  ["Komunikasi", "Cara anak menyampaikan kebutuhan atau memahami percakapan."],
  ["Sosial dan emosi", "Situasi yang terasa nyaman atau menantang bagi anak."],
  ["Kemandirian", "Kegiatan sehari-hari yang dilakukan mandiri atau dengan bantuan."],
  ["Konsentrasi dan perhatian", "Hal yang membantu anak fokus atau kembali fokus."],
  ["Motorik dan akses", "Gerak, alat bantu, posisi, atau akses yang membantu."],
  ["Perilaku dan sensorik", "Pemicu yang perlu diketahui serta hal yang menenangkan."],
];

function Section({
  number,
  title,
  description,
  icon,
  children,
}: {
  number: string;
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="abk-section rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex items-start gap-3 border-b border-slate-100 pb-4 sm:mb-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eaf2f8] text-[#315d7b]">{icon}</span>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#658099]">Bagian {number}</p>
          <h2 className="mt-1 text-lg font-extrabold tracking-tight text-[#173650] sm:text-xl">{title}</h2>
          {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  name,
  required = false,
  hint,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">
        {label}{required && <span className="ml-1 text-rose-600" aria-label="wajib diisi">*</span>}
      </span>
      {hint && <span className="mb-2 block text-xs leading-5 text-slate-500">{hint}</span>}
      <input
        className="abk-input w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#39739a] focus:ring-4 focus:ring-[#39739a]/10"
        name={name}
        type={type}
        required={required}
        data-testid={`input-${name}`}
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  hint,
  placeholder,
  rows = 3,
}: {
  label: string;
  name: string;
  hint?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-slate-700">{label}</span>
      {hint && <span className="mb-2 block text-xs leading-5 text-slate-500">{hint}</span>}
      <textarea
        className="abk-input w-full resize-y rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#39739a] focus:ring-4 focus:ring-[#39739a]/10"
        name={name}
        rows={rows}
        placeholder={placeholder}
        data-testid={`textarea-${name}`}
      />
    </label>
  );
}

function ChoiceRow({ name, question }: { name: string; question: string }) {
  return (
    <fieldset className="abk-choice-row rounded-xl border border-slate-200 bg-[#fbfcfd] p-4">
      <legend className="max-w-full px-1 text-sm font-bold leading-6 text-slate-800">{question}</legend>
      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
        {[
          ["yes", "Ya"],
          ["no", "Tidak"],
          ["unknown", "Belum tahu"],
        ].map(([value, label]) => (
          <label key={value} className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input className="h-4 w-4 accent-[#28658f]" type="radio" name={name} value={value} data-testid={`input-${name}-${value}`} />
            {label}
          </label>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="sr-only">Keterangan untuk {question}</span>
        <textarea
          className="abk-input w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#39739a] focus:ring-4 focus:ring-[#39739a]/10"
          name={`${name}Notes`}
          rows={2}
          placeholder="Keterangan tambahan (opsional)"
          data-testid={`textarea-${name}-notes`}
        />
      </label>
    </fieldset>
  );
}

export default function FormIsianABK() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Form Isian ABK | Pusat Form SMKN 1 Wonogiri";
    return () => { document.title = previousTitle; };
  }, []);

  const handlePrint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    window.print();
  };

  return (
    <main className="abk-print-page relative z-10 min-h-screen bg-[#f3f6f8] px-4 pb-16 pt-6 text-slate-900 sm:px-6 sm:pt-9">
      <div className="mx-auto max-w-4xl">
        <div className="abk-no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold text-[#325773] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39739a]"
            data-testid="button-back-home"
          >
            <ArrowLeft size={17} aria-hidden="true" /> Kembali ke beranda
          </button>
          <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-[#dce7ed] bg-white px-3 py-1.5 text-xs font-bold leading-5 text-[#4b677a]">
            <ShieldCheck size={14} className="shrink-0" aria-hidden="true" /> Isian tidak dikirim/disimpan otomatis; cetak sebelum menutup.
          </span>
        </div>

        <article className="abk-form-card overflow-hidden rounded-[26px] border border-[#dce5ea] bg-white shadow-[0_24px_70px_-42px_rgba(23,54,80,.4)]">
          <header className="relative overflow-hidden border-b border-[#e5edf1] bg-gradient-to-br from-[#f7fbfd] via-white to-[#edf5f8] px-5 py-7 sm:px-9 sm:py-9">
            <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-[#d9eaf2]/50 blur-2xl" aria-hidden="true" />
            <div className="relative">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d9e5eb] bg-white/80 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#526f83]">
                <ClipboardList size={13} aria-hidden="true" /> Pusat Form · SMKN 1 Wonogiri
              </div>
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-[#8b713e]">Form Isian ABK</p>
              <h1 className="mt-2 max-w-3xl text-2xl font-extrabold leading-tight tracking-[-.035em] text-[#153651] sm:text-4xl">
                Profil &amp; Kebutuhan Dukungan Peserta Didik
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Peserta didik dan orang tua/wali dapat mengisi bersama. Ceritakan hal yang membantu anak belajar dengan nyaman; bagian yang belum diketahui boleh dilewati dan tidak perlu menebak diagnosis.
              </p>
              <div className="abk-no-print mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[#456378]">
                <span className="rounded-full bg-white px-3 py-1.5">Sekitar 10–15 menit</span>
                <span className="rounded-full bg-white px-3 py-1.5">Pertanyaan yang tidak diketahui boleh dikosongkan</span>
                <span className="rounded-full bg-white px-3 py-1.5">Cetak atau simpan sebagai PDF</span>
              </div>
            </div>
          </header>

          <form className="space-y-5 p-4 sm:space-y-6 sm:p-8" onSubmit={handlePrint} aria-label="Form Isian ABK untuk peserta didik dan orang tua/wali">
            <div className="abk-note rounded-2xl border border-[#d8e8f1] bg-[#f1f8fb] p-4 sm:p-5">
              <div className="flex gap-3">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#326887]" aria-hidden="true" />
                <div>
                  <h2 className="text-sm font-extrabold text-[#214b66]">Formulir ini bukan alat diagnosis</h2>
                  <p className="mt-1 text-sm leading-6 text-[#466477]">
                    Isian membantu sekolah memahami kekuatan, kebutuhan, dan penyesuaian belajar yang mungkin bermanfaat. Dukungan dibicarakan bersama peserta didik, orang tua/wali, dan pihak layanan yang relevan.
                  </p>
                </div>
              </div>
            </div>

            <Section number="01" title="Identitas peserta didik" icon={<ClipboardList size={19} />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Nama lengkap peserta didik" name="studentName" required />
                <TextField label="Kelas/rombel (jika sudah diketahui)" name="studentClass" />
                <TextField label="Tempat lahir" name="birthPlace" />
                <TextField label="Tanggal lahir" name="birthDate" type="date" />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-700">Jenis kelamin (opsional)</span>
                  <select className="abk-input w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-[#39739a] focus:ring-4 focus:ring-[#39739a]/10" name="gender" defaultValue="" data-testid="select-gender">
                    <option value="">Pilih jika berkenan</option>
                    <option value="laki-laki">Laki-laki</option>
                    <option value="perempuan">Perempuan</option>
                    <option value="tidak-mengisi">Tidak ingin mengisi</option>
                  </select>
                </label>
              </div>
            </Section>

            <Section number="02" title="Informasi orang tua/wali" icon={<HeartHandshake size={19} />}>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="Nama orang tua/wali" name="guardianName" required />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-700">Hubungan dengan peserta didik<span className="ml-1 text-rose-600" aria-label="wajib diisi">*</span></span>
                  <select className="abk-input w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-[#39739a] focus:ring-4 focus:ring-[#39739a]/10" name="guardianRelationship" required defaultValue="" data-testid="select-guardian-relationship">
                    <option value="" disabled>Pilih hubungan</option>
                    <option>Ayah</option><option>Ibu</option><option>Wali</option><option>Lainnya</option>
                  </select>
                </label>
                <TextField label="Nomor telepon yang dapat dihubungi (opsional)" name="guardianPhone" type="tel" hint="Gunakan nomor yang nyaman dihubungi sekolah." />
                <TextField label="Kecamatan/kabupaten tempat tinggal (opsional)" name="guardianAddress" />
                <div className="sm:col-span-2">
                  <TextField label="Pekerjaan orang tua/wali (opsional)" name="guardianOccupation" />
                </div>
              </div>
            </Section>

            <Section
              number="03"
              title="Kebutuhan atau hasil identifikasi"
              description="Pilih hal yang ingin dibicarakan. Jika belum ada pemeriksaan, cukup pilih “Belum ada” atau “Belum tahu”."
              icon={<Info size={19} />}
            >
              <div className="grid gap-5">
                <fieldset>
                  <legend className="mb-2 text-sm font-bold text-slate-700">Hal yang ingin disampaikan ke sekolah (boleh pilih lebih dari satu)</legend>
                  <p className="mb-3 text-xs leading-5 text-slate-500">Pilihan ini bukan diagnosis. Pilih hanya yang sesuai dengan pengalaman anak.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      "Penglihatan",
                      "Pendengaran",
                      "Gerak atau akses fisik",
                      "Komunikasi atau bahasa",
                      "Belajar, membaca, menulis, atau berhitung",
                      "Konsentrasi atau perhatian",
                      "Interaksi sosial atau kebutuhan sensorik",
                      "Kesehatan yang berpengaruh saat belajar",
                      "Belum tahu / ingin berkonsultasi",
                      "Hal lain",
                    ].map((item, index) => (
                      <label key={item} className="flex min-h-11 cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-[#fbfcfd] px-3 py-2.5 text-sm leading-5 text-slate-700 transition hover:border-[#a8c0cf]">
                        <input className="mt-0.5 h-4 w-4 shrink-0 accent-[#28658f]" type="checkbox" name="supportType" value={`option-${index}`} data-testid={`input-support-type-${index}`} />
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold text-slate-700">Apakah anak pernah mendapat pemeriksaan/asesmen profesional?</span>
                    <select className="abk-input w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-[#39739a] focus:ring-4 focus:ring-[#39739a]/10" name="assessmentStatus" defaultValue="" data-testid="select-assessment-status">
                      <option value="">Pilih jika diketahui</option>
                      <option value="sudah">Sudah</option>
                      <option value="belum">Belum</option>
                      <option value="proses">Sedang dalam proses</option>
                      <option value="unknown">Belum tahu</option>
                    </select>
                  </label>
                  <TextField label="Kapan kebutuhan ini mulai diketahui? (opsional)" name="identifiedSince" hint="Perkiraan waktu atau usia anak juga boleh." />
                </div>
                <TextAreaField
                  label="Sumber informasi atau keterangan yang ingin dibagikan (opsional)"
                  name="assessmentNotes"
                  rows={3}
                  placeholder="Contoh: pengamatan keluarga, catatan guru, atau ringkasan rekomendasi profesional. Tidak perlu mencantumkan diagnosis rinci."
                />
              </div>
            </Section>

            <Section
              number="04"
              title="Gambaran dan kekuatan anak"
              description="Tuliskan contoh singkat bila berkenan. Cerita sehari-hari lebih membantu daripada istilah khusus."
              icon={<HeartHandshake size={19} />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {learningAreas.map(([label, hint]) => (
                  <TextAreaField
                    key={label}
                    label={label}
                    name={`profile-${label}`}
                    hint={hint}
                    rows={2}
                    placeholder="Yang sudah bisa, yang disukai, atau bantuan yang bermanfaat…"
                  />
                ))}
                <TextAreaField
                  label="Minat, bakat, atau keterampilan yang menonjol"
                  name="strengths"
                  rows={2}
                  placeholder="Contoh: menggambar, merakit, musik, olahraga…"
                />
                <TextAreaField
                  label="Hal atau aktivitas yang membuat anak bersemangat"
                  name="motivators"
                  rows={2}
                  placeholder="Apa yang biasanya membuat anak tertarik atau termotivasi?"
                />
              </div>
            </Section>

            <Section
              number="05"
              title="Hambatan dan dukungan yang mungkin membantu"
              description="Centang hal yang pernah dialami atau ingin didiskusikan. Tidak perlu mencentang semuanya."
              icon={<Check size={19} />}
            >
              <div className="grid gap-2 sm:grid-cols-2">
                {supportNeeds.map((item, index) => (
                  <label key={item} className="flex min-h-12 cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 bg-[#fbfcfd] px-3 py-3 text-sm leading-5 text-slate-700 transition hover:border-[#a8c0cf]">
                    <input className="mt-0.5 h-4 w-4 shrink-0 accent-[#28658f]" type="checkbox" name="learningSupport" value={`need-${index}`} data-testid={`input-learning-support-${index}`} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <TextAreaField
                  label="Kapan atau dalam situasi apa dukungan tersebut paling dibutuhkan? (opsional)"
                  name="supportContext"
                  rows={3}
                  placeholder="Contoh: saat menerima instruksi panjang, berpindah kelas, atau mengerjakan tugas tertulis."
                />
              </div>
            </Section>

            <Section
              number="06"
              title="Riwayat layanan dan hal penting di sekolah"
              description="Bagikan yang relevan untuk kegiatan belajar. Rincian kesehatan yang tidak dibutuhkan tidak perlu dituliskan."
              icon={<ShieldCheck size={19} />}
            >
              <div className="grid gap-3">
                <ChoiceRow name="previousTherapy" question="Apakah anak pernah menerima terapi atau pendampingan?" />
                <ChoiceRow name="previousEducationSupport" question="Apakah anak pernah menerima dukungan khusus di sekolah?" />
                <ChoiceRow name="currentSupport" question="Apakah anak sedang menerima layanan/pendampingan saat ini?" />
                <ChoiceRow name="healthAtSchool" question="Apakah ada kondisi kesehatan yang perlu diperhatikan selama belajar di sekolah?" />
                <ChoiceRow name="medicationAtSchool" question="Apakah anak memerlukan obat, alat bantu, atau respons khusus selama berada di sekolah?" />
              </div>
              <div className="mt-4">
                <TextAreaField
                  label="Informasi penting untuk keamanan dan kenyamanan anak (opsional)"
                  name="safetyNotes"
                  rows={3}
                  hint="Tuliskan hanya informasi yang perlu diketahui sekolah untuk memberi dukungan. Rincian obat atau dokumen medis dapat disampaikan langsung secara tertutup kepada petugas sekolah."
                />
              </div>
            </Section>

            <Section
              number="07"
              title="Harapan dan dukungan keluarga"
              description="Jawaban membantu sekolah merencanakan komunikasi dan dukungan yang sesuai."
              icon={<HeartHandshake size={19} />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextAreaField label="Apa harapan keluarga terhadap pengalaman belajar anak?" name="familyExpectation" rows={3} />
                <TextAreaField label="Perkembangan apa yang paling ingin didukung?" name="developmentHope" rows={3} />
                <TextAreaField label="Apa kekhawatiran keluarga tentang pembelajaran di sekolah?" name="familyConcern" rows={3} />
                <TextAreaField label="Dukungan apa yang dapat diberikan keluarga?" name="familySupport" rows={3} />
              </div>
            </Section>

            <section className="abk-consent rounded-2xl border border-[#dce5ea] bg-[#f8fafb] p-5 sm:p-7" aria-labelledby="abk-consent-title">
              <div className="flex items-start gap-3">
                <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-[#526f83]" aria-hidden="true" />
                <div>
                  <h2 id="abk-consent-title" className="text-lg font-extrabold text-[#173650]">Persetujuan dan cara menggunakan formulir</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Isian dapat memuat data pribadi anak dan informasi kesehatan. Formulir di situs ini tidak mengirim, mengunggah, atau menyimpan jawaban secara otomatis. Setelah selesai, cetak atau simpan sebagai PDF dari perangkat Anda, lalu sampaikan langsung melalui saluran resmi sekolah. Mohon jaga file agar tidak dibagikan ke ruang publik.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Dengan persetujuan di bawah, orang tua/wali menyatakan bahwa informasi diberikan untuk membantu sekolah membicarakan kebutuhan dukungan belajar peserta didik. Rincian layanan dan penanganan data setelah diserahkan mengikuti prosedur resmi sekolah.
                  </p>
                </div>
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-[#d4e0e7] bg-white p-4 text-sm leading-6 text-slate-800">
                <input className="mt-1 h-4 w-4 shrink-0 accent-[#28658f]" type="checkbox" name="guardianConsent" value="agreed" required data-testid="input-guardian-consent" />
                <span>
                  Saya adalah orang tua/wali peserta didik dan memahami penjelasan di atas. Saya menyetujui agar informasi dalam formulir ini disampaikan kepada sekolah untuk membahas dukungan pendidikan anak.
                  <span className="ml-1 font-bold text-rose-600" aria-label="wajib dicentang">*</span>
                </span>
              </label>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <TextField label="Tempat" name="signaturePlace" />
                <TextField label="Tanggal pengisian" name="signatureDate" type="date" />
              </div>
              <div className="mt-8 grid gap-10 sm:grid-cols-2">
                <div className="min-h-24 border-b border-slate-400 pb-2 text-center text-xs text-slate-500">
                  Mengetahui,<br />Peserta didik (bila memungkinkan)
                </div>
                <div className="min-h-24 border-b border-slate-400 pb-2 text-center text-xs text-slate-500">
                  Orang tua/wali
                </div>
              </div>
            </section>

            <div className="abk-references rounded-2xl border border-[#eadfca] bg-[#fbf8f0] p-4 text-sm leading-6 text-[#685838]">
              <p className="font-extrabold">Rujukan penyusunan</p>
              <p className="mt-1">Pertanyaan ini disusun sebagai bahan awal konsultasi keluarga dan sekolah, dengan memperhatikan aturan tentang akomodasi yang layak bagi peserta didik penyandang disabilitas serta pelindungan data pribadi.</p>
              <ul className="mt-2 flex flex-col gap-1">
                {officialSources.map(source => (
                  <li key={source.href}>
                    <a className="font-semibold underline underline-offset-2 hover:text-[#3e5365]" href={source.href} target="_blank" rel="noopener noreferrer" data-testid={`link-law-${officialSources.indexOf(source)}`}>
                      {source.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="abk-no-print flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">Isian wajib: nama peserta didik, nama dan hubungan orang tua/wali, serta persetujuan.</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="reset"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39739a]"
                  data-testid="button-reset-form"
                >
                  Kosongkan formulir
                </button>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1f5c82] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#174866] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39739a]"
                  data-testid="button-print-form"
                >
                  <Printer size={16} aria-hidden="true" /> Cetak / simpan PDF <FileDown size={15} aria-hidden="true" />
                </button>
              </div>
            </div>
          </form>
        </article>

        <footer className="abk-no-print mx-auto mt-5 max-w-3xl text-center text-xs leading-5 text-slate-500">
          Simpan formulir yang sudah terisi dengan hati-hati. Untuk bantuan pengisian, hubungi sekolah melalui saluran resmi.
        </footer>
      </div>
    </main>
  );
}
