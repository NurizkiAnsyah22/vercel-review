# Printing Workflow — QR Unik per Kartu

Model final: **setiap kartu punya QR-nya sendiri** (tidak ada lagi "QR master" identik).

Alasannya: QR identik tidak bisa membedakan kartu, sehingga tujuan review per kartu mustahil.
Dengan QR unik per kartu, **satu QR yang sama** dipakai untuk dua tahap:

| Status kartu | Scan QR (atau tap NFC) | Hasil |
|---|---|---|
| `UNACTIVATED` | `{PUBLIC_APP_URL}/r/{public_token}` | Halaman **aktivasi** kartu tersebut (buyer isi Nama Toko, Google Maps, WhatsApp — tanpa mengetik kode) |
| `PENDING` | idem | Halaman aktivasi + catatan bahwa aktivasi sebelumnya belum selesai |
| `ACTIVE` | idem | **302 → Google Review URL toko kartu tersebut** |
| `SUSPENDED` | idem | Halaman "kartu tidak aktif" (tidak redirect ke Google) |

NFC pada kartu memakai URL yang sama, jadi QR dan NFC selalu searah.

## 1. Alur produksi

1. Admin → **Printing** → *Generate Batch Kartu*.
   Setiap kartu otomatis mendapat: **Card ID**, **Kode Aktivasi** (fallback), **NFC Token**, dan **QR unik** (langsung dibuat, tidak perlu menunggu aktivasi).
2. Admin → **Print Sheet** → cetak A4 atau **Save as PDF**. Satu file itu sudah berisi:
   - QR unik kartu (payload `…/r/{public_token}`)
   - Card ID
   - Kode Aktivasi (fallback)
   - NFC URL
3. Kirim **satu file** tersebut ke percetakan → cetak → potong → tempel QR pada kartu dengan Card ID yang sesuai.
4. Tulis NFC tag kartu dengan NFC URL kartu tersebut (sekali saja, sebelum dijual).

## 2. Data produksi (CSV)

`/api/admin/export/cards` (tombol di halaman Printing):

```
Card ID,Activation Code,NFC Token,QR URL
CARD-000001,VRC-7K4P-92MA,A8x91Kbbbbbbbbbb11,https://review.virai.id/r/A8x91Kbbbbbbbbbb11
```

Pakai CSV bila percetakan ingin membuat QR sendiri dari data.

## 3. Spesifikasi cetak QR

- Ukuran minimal **20×20 mm**, modul minimal **0,6 mm**
- Error correction **M**
- Quiet zone (area kosong) minimal **4 modul** di semua sisi, tanpa desain gelap
- Jangan menimpa QR dengan laminasi berkilau/mengganggu

## 4. Aset QR

- Disimpan per kartu: `{STORAGE_DIR}/qr/{public_token}.png` (1024px) dan `.svg`
- Dibuat **saat batch kartu dibuat**; bisa dibuat ulang dari admin (tombol **Regenerate QR**) atau otomatis saat print sheet/CSV diunduh
- Disajikan oleh `GET /api/qr/{token}?format=png|svg`
- Isi QR selalu URL Virai (`/r/{token}`), **bukan** URL Google langsung

## 5. Aktivasi (fallback)

Kalau QR kartu rusak/tidak terbaca:

1. Buyer buka `{PUBLIC_APP_URL}/activate`
2. Masukkan **Kode Aktivasi** yang tercetak di kartu
3. Lanjutkan seperti biasa (isi data toko) → kartu ACTIVE

Jalur ini juga yang dipakai untuk kartu lama yang sudah beredar.
