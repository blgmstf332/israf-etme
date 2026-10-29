
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Storage from 'expo-sqlite/kv-store';

// Alışveriş ekranımızın kullandığı kayıt anahtarı.
export const ALISVERIS_STORAGE_KEY = 'israfetme_alisveris_v1';

// Yalnızca kendi uygulamamızın yedeklerini kabul edeceğiz.
const YEDEK_TIPI = 'israfetme-tam-yedek';
const YEDEK_SURUMU = 1;
const MAKSIMUM_DOSYA_BOYUTU = 5 * 1024 * 1024;

export type YedekIcerigi = {
  stokVeGecmis: unknown;
  alisverisKaydi: string | null;
};

// Alışveriş kaydını orijinal biçimiyle saklıyoruz.
// Böylece mevcut alışveriş veri yapısını değiştirmiyoruz.
function alisverisKaydiniDogrula(kayit: string | null) {
  if (kayit === null) return;

  const veri: unknown = JSON.parse(kayit);

  if (
    typeof veri !== 'object' ||
    veri === null ||
    Array.isArray(veri) === false &&
      Object.getPrototypeOf(veri) !== Object.prototype
  ) {
    throw new Error('Alışveriş listesi verisi geçersiz.');
  }
}

// 1. Yedek dosyası oluştur ve paylaş.
export async function yedekOlustur(
  stokVeGecmis: unknown
): Promise<void> {
  const paylasimVar = await Sharing.isAvailableAsync();

  if (!paylasimVar) {
    throw new Error('Bu cihazda dosya paylaşımı kullanılamıyor.');
  }

  const alisverisKaydi = await Storage.getItem(
    ALISVERIS_STORAGE_KEY
  );

  alisverisKaydiniDogrula(alisverisKaydi);

  const yedek = {
    tip: YEDEK_TIPI,
    surum: YEDEK_SURUMU,
    olusturulmaTarihi: new Date().toISOString(),
    stokVeGecmis,
    alisverisKaydi,
  };

  const icerik = JSON.stringify(yedek, null, 2);

  const dosya = new File(
    Paths.cache,
    `israfetme-yedek-${Date.now()}.json`
  );

  dosya.create();
  await dosya.write(icerik);

  await Sharing.shareAsync(dosya.uri, {
    mimeType: 'application/json',
    dialogTitle: 'İsrafEtme Yedeğini Kaydet',
  });
}

// 2. Telefondan yedek seç ve içeriğini oku.
export async function yedekDosyasiSec():
  Promise<YedekIcerigi | null> {

  const sonuc = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });

  // Kullanıcı dosya seçmekten vazgeçti.
  if (sonuc.canceled) return null;

  const secilen = sonuc.assets[0];

  if (
    secilen.size !== undefined &&
    secilen.size > MAKSIMUM_DOSYA_BOYUTU
  ) {
    throw new Error('Yedek dosyası 5 MB sınırını aşıyor.');
  }

  if (!secilen.name.toLowerCase().endsWith('.json')) {
    throw new Error('Lütfen bir JSON yedek dosyası seç.');
  }

  const dosya = new File(secilen.uri);
  const icerik = await dosya.text();

  if (icerik.length > MAKSIMUM_DOSYA_BOYUTU) {
    throw new Error('Yedek dosyası çok büyük.');
  }

  const okunan: unknown = JSON.parse(icerik);

  if (
    typeof okunan !== 'object' ||
    okunan === null ||
    Array.isArray(okunan)
  ) {
    throw new Error('Dosya geçerli bir yedek değil.');
  }

  const yedek = okunan as Record<string, unknown>;

  if (
    yedek.tip !== YEDEK_TIPI ||
    yedek.surum !== YEDEK_SURUMU
  ) {
    throw new Error(
      'Bu dosya desteklenen bir İsrafEtme yedeği değil.'
    );
  }

  const alisverisKaydi = yedek.alisverisKaydi;

  if (
    alisverisKaydi !== null &&
    typeof alisverisKaydi !== 'string'
  ) {
    throw new Error('Alışveriş listesi alanı geçersiz.');
  }

  alisverisKaydiniDogrula(alisverisKaydi);

  return {
    stokVeGecmis: yedek.stokVeGecmis,
    alisverisKaydi,
  };
}
