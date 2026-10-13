# Panduan UAT LOCAL dari Laptop + HP (LAN)

Tujuan: laptop membuka `http://localhost:3000`, HP membuka `http://<IP-LAN>:3000`, dan **QR kartu berisi URL yang dapat diakses HP**.

## 1. Dapatkan IP LAN laptop

```cmd
ipconfig
```

Cari `IPv4 Address` pada adapter **Wi‑Fi** atau **Ethernet** (bukan `vEthernet (WSL)`).
Contoh pada mesin ini: **192.168.1.5**. Pastikan laptop & HP berada di jaringan Wi‑Fi yang sama.

> IP LAN bisa berubah (DHCP). Selalu cek ulang dengan `ipconfig` sebelum UAT, lalu pastikan
> `PUBLIC_APP_URL` di `.env` memakai IP yang sama.

## 2. Set PUBLIC_APP_URL

Di `.env`:

```
PUBLIC_APP_URL=http://192.168.1.5:3000
```

`PUBLIC_APP_URL` dipakai untuk membangun **QR URL** dan **NFC URL**:
`{PUBLIC_APP_URL}/r/{public_token}` — jadi QR pasti mengarah ke alamat yang bisa dibuka HP.
(Jika dibiarkan kosong, sistem memakai `APP_BASE_URL`, yaitu `localhost` yang **tidak** bisa dibuka HP.)

Restart `npm run dev` setelah mengubah `.env`.

## 3. Jalankan Next.js agar bisa diakses HP

`next dev` pada Next 15 sudah listen di `0.0.0.0` (semua adapter) secara default. Bukti di terminal:

```
- Local:   http://localhost:3000
- Network: http://192.168.1.5:3000
```

Jika ingin eksplisit:

```cmd
npx next dev -H 0.0.0.0 -p 3000
```

## 4. Firewall Windows (wajib agar HP bisa akses)

Saat pertama kali Node.js listen, Windows biasanya menampilkan prompt → pilih **Allow** untuk
**Private networks**. Jika tidak muncul atau koneksi dari HP diblokir, buat rule inbound (butuh admin):

```cmd
netsh advfirewall firewall add rule name="Virai Review Card Dev 3000" dir=in action=allow protocol=TCP localport=3000 profile=private
```

Cek rule:

```cmd
netsh advfirewall firewall show rule name="Virai Review Card Dev 3000"
```

Hapus rule bila tidak dipakai lagi:

```cmd
netsh advfirewall firewall delete rule name="Virai Review Card Dev 3000"
```

## 5. Verifikasi dari laptop sebelum uji di HP

```cmd
curl http://localhost:3000/api/health
curl http://192.168.1.5:3000/api/health
```

Keduanya harus mengembalikan `{"status":"ok","checks":{"database":"up","redis":"up"}}`.

## 6. Uji dari HP

1. Buka `http://192.168.1.5:3000/login` di browser HP → login admin.
2. Buka detail kartu → **Download/scan QR** → QR berisi `http://192.168.1.5:3000/r/{token}`.
3. Simulasi customer: buka QR/NFC URL dari HP → harus langsung ke Google Review (kartu ACTIVE).

## Catatan

- **NFC**: tidak ada hardware writer di aplikasi. Copy **NFC URL** dari dashboard, lalu tulis ke tag
  memakai aplikasi seperti NFC Tools / NXP TagWriter (URL sama dengan QR, hanya beda `?s=nfc`).
- **Tombol Copy** pada halaman ber-`http://` (bukan localhost) memakai fallback `execCommand`, karena
  Clipboard API hanya tersedia di secure context. Tetap berfungsi di HP.
- Worker & Baileys Gateway berjalan di laptop; HP hanya membuka situs web.
- `GOOGLE_PLACES_API_KEY` **tidak wajib**. Aktivasi (web maupun WhatsApp) memakai jalur gratis:
  link Google Maps diproses langsung menjadi Place ID + URL review.
  Key Places hanya dipakai sebagai fallback bila link tidak bisa diparse.
