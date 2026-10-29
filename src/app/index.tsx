import { AlisverisEkrani } from '@/components/alisveris-ekrani';
import { AnaSayfaOzeti } from '@/components/ana-sayfa-ozeti';
import { BildirimYoneticisi } from '@/components/bildirim-yoneticisi';
import { IstatistikEkrani } from '@/components/istatistik-ekrani';
import { KarsilamaEkrani } from '@/components/karsilama-ekrani';
import { MiktarIslemiModal } from '@/components/miktar-islemi-modal';
import { SonTarihRozeti } from '@/components/son-tarih-rozeti';
import { UrunDetayEkrani } from '@/components/urun-detay-ekrani';
import { modernStyles } from '@/styles/modern-ui';
import {
  ALISVERIS_STORAGE_KEY,
  yedekDosyasiSec,
  yedekOlustur,
} from '@/utils/yedekleme';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Eski kayıtlar ve yeni kayıtlar için ayrı anahtarlar
const ESKI_STORAGE_KEY = 'israfetme_urunler_v1';
const STORAGE_KEY = 'israfetme_veriler_v2';
const KATEGORILER = [
  'Süt Ürünleri',
  'Sebze & Meyve',
  'Et & Balık',
  'Bakliyat & Tahıl',
  'İçecek',
  'Diğer',
] as const;
const BIRIMLER = ['Adet', 'kg', 'g', 'L', 'mL'] as const;
type Kategori = (typeof KATEGORILER)[number];
type Birim = (typeof BIRIMLER)[number];
type Urun = {
  id: string;
  ad: string;
  sonTarih: string;
  kategori: Kategori;
  miktar: number;
  birim: Birim;
  eklenmeTarihi?: string;
};
// YENİ: Bir ürünün nasıl değerlendirildiğini tutar.
type IslemTuru = 'tuketildi' | 'israf';
// YENİ: İşlem geçmişindeki kayıt
type GecmisKaydi = Urun & {
  kayitId: string;
  islem: IslemTuru;
  islemTarihi: string;
};
// YENİ: Uygulamanın kalıcı verileri
type UygulamaVerisi = {
  urunler: Urun[];
  gecmis: GecmisKaydi[];
};
type DurumTuru =
  | 'gecmis'
  | 'yaklasan'
  | 'normal'
  | 'gecersiz';
const DURUM_RENKLERI = {
  gecmis: {
    arkaPlan: '#FFF0EF',
    kenar: '#F5C4C0',
    metin: '#B42318',
    etiket: '#FDE0DD',
  },
  yaklasan: {
    arkaPlan: '#FFF5E6',
    kenar: '#F4D1A2',
    metin: '#A56112',
    etiket: '#FFE5BC',
  },
  normal: {
    arkaPlan: '#EDF8EE',
    kenar: '#B9DEC3',
    metin: '#247A43',
    etiket: '#D7EFDC',
  },
  gecersiz: {
    arkaPlan: '#F2F2F2',
    kenar: '#CCCCCC',
    metin: '#666666',
    etiket: '#E5E5E5',
  },
};
// Benzersiz kayıt kimliği oluşturur.
function yeniId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
// Girilen tarihi YYYY-AA-GG biçimine çevirir.
function tarihiDuzenle(giris: string): string | null {
  const parcalar = giris.trim().split(/\D+/);
  if (parcalar.length !== 3) return null;
  let gunMetni: string;
  let ayMetni: string;
  let yilMetni: string;
  if (parcalar[0].length === 4) {
    [yilMetni, ayMetni, gunMetni] = parcalar;
  } else {
    [gunMetni, ayMetni, yilMetni] = parcalar;
  }
  if (
    gunMetni.length < 1 ||
    gunMetni.length > 2 ||
    ayMetni.length < 1 ||
    ayMetni.length > 2 ||
    yilMetni.length !== 4
  ) {
    return null;
  }
  const gun = Number(gunMetni);
  const ay = Number(ayMetni);
  const yil = Number(yilMetni);
  const kontrol = new Date(Date.UTC(yil, ay - 1, gun));
  if (
    yil < 1000 ||
    kontrol.getUTCFullYear() !== yil ||
    kontrol.getUTCMonth() !== ay - 1 ||
    kontrol.getUTCDate() !== gun
  ) {
    return null;
  }
  return `${yil}-${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`;
}
function tarihiGoster(tarih: string): string {
  return tarih.split('-').reverse().join('.');
}
// Son tüketim tarihine kalan gün sayısı
function kalanGun(tarih: string): number | null {
  const eslesme = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tarih);
  if (!eslesme) return null;
  const yil = Number(eslesme[1]);
  const ay = Number(eslesme[2]);
  const gun = Number(eslesme[3]);
  const hedef = new Date(Date.UTC(yil, ay - 1, gun));
  if (
    hedef.getUTCFullYear() !== yil ||
    hedef.getUTCMonth() !== ay - 1 ||
    hedef.getUTCDate() !== gun
  ) {
    return null;
  }
  const bugun = new Date();
  const bugunUTC = Date.UTC(
    bugun.getFullYear(),
    bugun.getMonth(),
    bugun.getDate()
  );
  return Math.round(
    (hedef.getTime() - bugunUTC) / (24 * 60 * 60 * 1000)
  );
}
// Tarih durumunu belirler.
function durumBilgisi(tarih: string): {
  metin: string;
  tur: DurumTuru;
  etiket: string;
} {
  const gun = kalanGun(tarih);
  if (gun === null) {
    return {
      metin: 'Geçersiz tarih',
      tur: 'gecersiz',
      etiket: 'Kontrol gerekli',
    };
  }
  if (gun < 0) {
    return {
      metin: `Son tüketim tarihi ${Math.abs(gun)} gün önce geçti`,
      tur: 'gecmis',
      etiket: 'Tarihi geçmiş',
    };
  }
  if (gun === 0) {
    return {
      metin: 'Bugün son gün!',
      tur: 'yaklasan',
      etiket: 'Bugün son gün',
    };
  }
  if (gun <= 3) {
    return {
      metin: `${gun} gün kaldı`,
      tur: 'yaklasan',
      etiket: 'Yaklaşıyor',
    };
  }
  return {
    metin: `${gun} gün kaldı`,
    tur: 'normal',
    etiket: 'Süresi var',
  };
}
// Kullanıcının girdiği miktarı doğrular.
function miktariDuzenle(giris: string): number | null {
  const metin = giris.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(metin)) {
    return null;
  }
  const sayi = Number(metin);
  if (!Number.isFinite(sayi) || sayi <= 0) {
    return null;
  }
  return sayi;
}
function miktariGoster(miktar: number): string {
  return String(miktar).replace('.', ',');
}
// İşlem tarihini Türkçe gösterir.
function islemTarihiniGoster(tarih: string): string {
  const tarihNesnesi = new Date(tarih);
  if (Number.isNaN(tarihNesnesi.getTime())) {
    return 'Bilinmiyor';
  }
  return tarihNesnesi.toLocaleDateString('tr-TR');
}
// Eski ve yeni ürünleri ortak veri tipine dönüştürür.
function kayitlariDuzenle(veri: unknown): Urun[] {
  if (!Array.isArray(veri)) {
    throw new Error('Ürün listesi geçersiz.');
  }
  return veri.map((kayit: unknown) => {
    if (typeof kayit !== 'object' || kayit === null) {
      throw new Error('Ürün kaydı geçersiz.');
    }
    const urun = kayit as Record<string, unknown>;
    if (
      typeof urun.id !== 'string' ||
      typeof urun.ad !== 'string' ||
      typeof urun.sonTarih !== 'string'
    ) {
      throw new Error('Eksik ürün bilgisi.');
    }
    const kategori =
      KATEGORILER.find((item) => item === urun.kategori)
      ?? 'Diğer';
    const birim =
      BIRIMLER.find((item) => item === urun.birim)
      ?? 'Adet';
    const miktar =
      typeof urun.miktar === 'number' &&
      Number.isFinite(urun.miktar) &&
      urun.miktar > 0
        ? urun.miktar
        : 1;
    return {
      id: urun.id,
      ad: urun.ad,
      sonTarih: urun.sonTarih,
      kategori,
      miktar,
      birim,
      eklenmeTarihi:
        typeof urun.eklenmeTarihi === 'string' &&
        Number.isFinite(Date.parse(urun.eklenmeTarihi))
          ? urun.eklenmeTarihi
          : undefined,
    };
  });
}
// YENİ: İşlem geçmişindeki kayıtları doğrular.
function gecmisiDuzenle(veri: unknown): GecmisKaydi[] {
  if (!Array.isArray(veri)) {
    throw new Error('İşlem geçmişi geçersiz.');
  }
  return veri.map((kayit: unknown) => {
    if (typeof kayit !== 'object' || kayit === null) {
      throw new Error('Geçmiş kaydı geçersiz.');
    }
    const nesne = kayit as Record<string, unknown>;
    const urun = kayitlariDuzenle([kayit])[0];
    if (
      typeof nesne.kayitId !== 'string' ||
      typeof nesne.islemTarihi !== 'string' ||
      (nesne.islem !== 'tuketildi' &&
        nesne.islem !== 'israf')
    ) {
      throw new Error('İşlem geçmişi bilgisi eksik.');
    }
    return {
      ...urun,
      kayitId: nesne.kayitId,
      islem: nesne.islem,
      islemTarihi: nesne.islemTarihi,
    };
  });
}
// YENİ: Kaydedilen uygulama verisini doğrular.
function verileriDuzenle(veri: unknown): UygulamaVerisi {
  if (
    typeof veri !== 'object' ||
    veri === null ||
    Array.isArray(veri)
  ) {
    throw new Error('Uygulama verisi geçersiz.');
  }
  const kayit = veri as Record<string, unknown>;
  return {
    urunler: kayitlariDuzenle(kayit.urunler),
    gecmis: gecmisiDuzenle(kayit.gecmis),
  };
}
export default function HomeScreen() {
  // Ürün ekleme alanları
  const [urunAdi, setUrunAdi] = useState('');
  const [tarih, setTarih] = useState('');
  const [kategori, setKategori] = useState<Kategori>('Diğer');
  const [miktar, setMiktar] = useState('1');
  const [birim, setBirim] = useState<Birim>('Adet');
  // YENİ: Stok ve işlem geçmişi birlikte tutuluyor.
  const [veriler, setVeriler] = useState<UygulamaVerisi>({
    urunler: [],
    gecmis: [],
  });
  const [yuklendi, setYuklendi] = useState(false);
  const [seciliIslem, setSeciliIslem] = useState<{
  urunId: string;
  islem: IslemTuru;
} | null>(null);
  const [detayUrunId, setDetayUrunId] = useState<string | null>(null);
  // 20. AŞAMA: İşlem geçmişi filtreleri
const [gecmisArama, setGecmisArama] = useState('');

const [gecmisFiltresi, setGecmisFiltresi] =
  useState<'Tümü' | IslemTuru>('Tümü');
  // 21. AŞAMA: İşlem geçmişi için tarih filtresi
const [gecmisTarihFiltresi, setGecmisTarihFiltresi] =
  useState<'Tümü' | 'Son 7 Gün' | 'Son 30 Gün' | 'Bu Ay'>('Tümü');

const [tumGecmisiGoster, setTumGecmisiGoster] =
  useState(false);
  const [aramaMetni, setAramaMetni] = useState('');
  const [kategoriFiltresi, setKategoriFiltresi] =
  useState<Kategori | 'Tümü'>('Tümü');
  const [yalnizcaAcil, setYalnizcaAcil] = useState(false);
  const [istatistikAcik, setIstatistikAcik] = useState(false);
  const [alisverisAcik, setAlisverisAcik] = useState(false);
  // 22. AŞAMA: Yedekleme işlemleri
const [yedeklemeMesgul, setYedeklemeMesgul] = useState(false);

// Geri yüklemeden sonra alışveriş ekranını yeniden oluşturur.
const [alisverisRevizyonu, setAlisverisRevizyonu] =
  useState(0);
  const [yuklemeHatasi, setYuklemeHatasi] = useState(false);
  // Kayıt işlemlerinin sırasını korur.
  const kayitSirasi = useRef<Promise<void>>(Promise.resolve());
  // Düzenleme alanları
  const [duzenlenenUrunId, setDuzenlenenUrunId] =
    useState<string | null>(null);
  const [duzenlemeAdi, setDuzenlemeAdi] = useState('');
  const [duzenlemeTarihi, setDuzenlemeTarihi] = useState('');
  const [duzenlemeKategorisi, setDuzenlemeKategorisi] =
    useState<Kategori>('Diğer');
  const [duzenlemeMiktari, setDuzenlemeMiktari] = useState('1');
  const [duzenlemeBirimi, setDuzenlemeBirimi] =
    useState<Birim>('Adet');
  const urunler = veriler.urunler;
  const gecmis = veriler.gecmis;
  // Uygulama açıldığında verileri oku.
  useEffect(() => {
    let aktif = true;
    async function verileriYukle() {
      try {
        const yeniKayit = await Storage.getItem(STORAGE_KEY);
        if (!aktif) return;
        if (yeniKayit !== null) {
          // Yeni veri yapısı zaten mevcut.
          const veri: unknown = JSON.parse(yeniKayit);
          setVeriler(verileriDuzenle(veri));
        } else {
          // İlk geçiş: Eski ürün listesini koru.
          const eskiKayit =
            await Storage.getItem(ESKI_STORAGE_KEY);
          if (!aktif) return;
          const eskiUrunler =
            eskiKayit !== null
              ? kayitlariDuzenle(JSON.parse(eskiKayit))
              : [];
          setVeriler({
            urunler: eskiUrunler,
            gecmis: [],
          });
        }
        setYuklendi(true);
      } catch (hata) {
        if (!aktif) return;
        console.error('Veriler yüklenemedi:', hata);
        setYuklemeHatasi(true);
        Alert.alert(
          'Veri hatası',
          'Kayıtlı veriler okunamadı. Uygulamayı yeniden başlat.'
        );
      }
    }
    verileriYukle();
    return () => {
      aktif = false;
    };
  }, []);
  // Stok ve geçmiş değişikliklerini SQLite'a kaydet.
  useEffect(() => {
    if (!yuklendi) return;
    const kaydedilecekVeri = JSON.stringify(veriler);
    // Hızlı ardışık işlemlerde yazmaları sıraya al.
    kayitSirasi.current = kayitSirasi.current
      .catch(() => {})
      .then(() =>
        Storage.setItem(STORAGE_KEY, kaydedilecekVeri)
      );
    kayitSirasi.current.catch((hata) => {
      console.error('Veriler kaydedilemedi:', hata);
      Alert.alert('Hata', 'Değişiklikler kaydedilemedi.');
    });
  }, [veriler, yuklendi]);
  // Ürünleri son tüketim tarihine göre sırala.
    const siraliUrunler = [...urunler].sort((a, b) => {
    const gunA = kalanGun(a.sonTarih);
    const gunB = kalanGun(b.sonTarih);
    if (gunA === null && gunB === null) {
      return a.ad.localeCompare(b.ad, 'tr');
    }
    if (gunA === null) return 1;
    if (gunB === null) return -1;
    return gunA - gunB || a.ad.localeCompare(b.ad, 'tr');
  });
  const gorunenUrunler = siraliUrunler.filter((urun) => {
  const aramaUyuyor = urun.ad
    .toLocaleLowerCase('tr-TR')
    .includes(aramaMetni.trim().toLocaleLowerCase('tr-TR'));
  const kategoriUyuyor =
    kategoriFiltresi === 'Tümü' ||
    urun.kategori === kategoriFiltresi;
  const gun = kalanGun(urun.sonTarih);
  const acilUyuyor =
    !yalnizcaAcil ||
    (gun !== null && gun <= 3);
  return aramaUyuyor && kategoriUyuyor && acilUyuyor;
});
  // YENİ: Basit işlem sayaçları
  const tuketilenSayisi = gecmis.filter(
    (kayit) => kayit.islem === 'tuketildi'
  ).length;
  const israfSayisi = gecmis.filter(
    (kayit) => kayit.islem === 'israf'
  ).length;
  // 21. AŞAMA: Arama, işlem türü ve tarih filtreleme
const filtrelenmisGecmis = [...gecmis]
  .filter((kayit) => {

    // 1. Ürün adına göre arama
    const aramaUyuyor = kayit.ad
      .toLocaleLowerCase('tr-TR')
      .includes(
        gecmisArama.trim().toLocaleLowerCase('tr-TR')
      );

    // 2. Tüketildi / İsraf Edildi filtresi
    const islemUyuyor =
      gecmisFiltresi === 'Tümü' ||
      kayit.islem === gecmisFiltresi;

    // 3. Tarih filtresi
    let tarihUyuyor = true;

    if (gecmisTarihFiltresi !== 'Tümü') {
      const simdi = new Date();
      const islemTarihi = new Date(kayit.islemTarihi);

      // Bugünün gece 00:00 başlangıcı
      const baslangic = new Date(
        simdi.getFullYear(),
        simdi.getMonth(),
        simdi.getDate()
      );

      if (gecmisTarihFiltresi === 'Son 7 Gün') {
        baslangic.setDate(baslangic.getDate() - 6);
      } else if (gecmisTarihFiltresi === 'Son 30 Gün') {
        baslangic.setDate(baslangic.getDate() - 29);
      } else if (gecmisTarihFiltresi === 'Bu Ay') {
        baslangic.setDate(1);
      }

      tarihUyuyor =
        !Number.isNaN(islemTarihi.getTime()) &&
        islemTarihi >= baslangic &&
        islemTarihi <= simdi;
    }

    // Üç koşulun da sağlanması gerekiyor.
    return aramaUyuyor && islemUyuyor && tarihUyuyor;
  })
  .sort(
    (a, b) =>
      new Date(b.islemTarihi).getTime() -
      new Date(a.islemTarihi).getTime()
  );

// Kullanıcının tercihine göre 10 kayıt veya tümünü göster.
const sonIslemler = tumGecmisiGoster
  ? filtrelenmisGecmis
  : filtrelenmisGecmis.slice(0, 10);
// 22. AŞAMA: Yedek oluşturma
const yedegiPaylas = async () => {
  if (!yuklendi || yuklemeHatasi || yedeklemeMesgul) {
    return;
  }

  setYedeklemeMesgul(true);

  try {
    // Önce bekleyen SQLite yazmalarının bitmesini bekle.
    await kayitSirasi.current;

    await yedekOlustur(veriler);
  } catch (hata) {
    console.error('Yedekleme hatası:', hata);

    Alert.alert(
      'Yedekleme başarısız',
      'Yedek dosyası oluşturulamadı veya paylaşılamadı.'
    );
  } finally {
    setYedeklemeMesgul(false);
  }
};

// Doğrulanan yedeği uygulamaya uygular.
const yedekVerileriniUygula = async (
  yeniVeriler: UygulamaVerisi,
  yeniAlisverisKaydi: string | null
) => {
  setYedeklemeMesgul(true);

  try {
    // Önce önceki stok yazmalarının tamamlanmasını bekle.
    await kayitSirasi.current;

    // Başarısız olursa geri alabilmek için eski kayıtları sakla.
    const eskiStokKaydi = await Storage.getItem(STORAGE_KEY);
    const eskiAlisverisKaydi = await Storage.getItem(
      ALISVERIS_STORAGE_KEY
    );

    // Null veriyi anahtar silme, diğerlerini yazma olarak uygula.
    const kaydiYaz = async (
      anahtar: string,
      deger: string | null
    ) => {
      if (deger === null) {
        await Storage.removeItem(anahtar);
      } else {
        await Storage.setItem(anahtar, deger);
      }
    };

    try {
      // İlk olarak kalıcı verileri güncelle.
      await kaydiYaz(
        STORAGE_KEY,
        JSON.stringify(yeniVeriler)
      );

      await kaydiYaz(
        ALISVERIS_STORAGE_KEY,
        yeniAlisverisKaydi
      );
    } catch (yazmaHatasi) {
      // Yazma yarıda kalırsa eski verileri geri yüklemeyi dene.
      const geriAlma = await Promise.allSettled([
        kaydiYaz(STORAGE_KEY, eskiStokKaydi),
        kaydiYaz(ALISVERIS_STORAGE_KEY, eskiAlisverisKaydi),
      ]);

      const geriAlmaHatasi = geriAlma.some(
        (sonuc) => sonuc.status === 'rejected'
      );

      if (geriAlmaHatasi) {
        throw new Error(
          'Geri yükleme ve eski kayıtları geri alma işlemi başarısız.'
        );
      }

      throw yazmaHatasi;
    }

    // Kalıcı kayıtlar başarılıysa ekranı da güncelle.
    setVeriler(yeniVeriler);

    // Alışveriş ekranını yeniden oluşturarak yeni kayıtları okut.
    setAlisverisAcik(false);
    setAlisverisRevizyonu((onceki) => onceki + 1);

    // Açık ürün detayları ve işlem pencerelerini kapat.
    setDetayUrunId(null);
    setSeciliIslem(null);

    Alert.alert(
      'Geri yükleme başarılı',
      'Stok, işlem geçmişi ve alışveriş kayıtları geri yüklendi.'
    );
  } catch (hata) {
    console.error('Geri yükleme hatası:', hata);

    const mesaj =
      hata instanceof Error
        ? hata.message
        : 'Beklenmeyen bir hata oluştu.';

    Alert.alert('Geri yükleme başarısız', mesaj);
  } finally {
    setYedeklemeMesgul(false);
  }
};

// Kullanıcının seçtiği dosyayı doğrula ve onay iste.
const yedektenGeriYukle = async () => {
  if (!yuklendi || yuklemeHatasi || yedeklemeMesgul) {
    return;
  }

  setYedeklemeMesgul(true);

  try {
    const secilenYedek = await yedekDosyasiSec();

    if (secilenYedek === null) return;

    // Mevcut doğrulama fonksiyonumuzu yeniden kullanıyoruz.
    const dogrulananVeriler = verileriDuzenle(
      secilenYedek.stokVeGecmis
    );

    const mesaj =
      'Bu işlem mevcut stok, işlem geçmişi ve ' +
      'alışveriş listesi kayıtlarının üzerine yazacak.\n\n' +
      'Yedekteki ürün sayısı: ' +
      dogrulananVeriler.urunler.length + '\n' +
      'Yedekteki işlem sayısı: ' +
      dogrulananVeriler.gecmis.length + '\n\n' +
      'Devam etmek istiyor musun?';

    Alert.alert(
      'Yedeği Geri Yükle',
      mesaj,
      [
        {
          text: 'Vazgeç',
          style: 'cancel',
        },
        {
          text: 'Geri Yükle',
          style: 'destructive',
          onPress: () => {
            void yedekVerileriniUygula(
              dogrulananVeriler,
              secilenYedek.alisverisKaydi
            );
          },
        },
      ],
      { cancelable: false }
    );
  } catch (hata) {
    console.error('Yedek dosyası hatası:', hata);

    const mesaj =
      hata instanceof Error
        ? hata.message
        : 'Yedek dosyası okunamadı.';

    Alert.alert('Geçersiz yedek', mesaj);
  } finally {
    setYedeklemeMesgul(false);
  }
};
  // 21. AŞAMA: Filtrelenmiş işlem geçmişini CSV olarak paylaş.
const gecmisiCsvPaylas = async () => {
  if (filtrelenmisGecmis.length === 0) {
    Alert.alert(
      'Kayıt bulunamadı',
      'Dışa aktarılacak işlem bulunmuyor.'
    );
    return;
  }

  try {
    const paylasimVar = await Sharing.isAvailableAsync();

    if (!paylasimVar) {
      Alert.alert(
        'Paylaşım kullanılamıyor',
        'Bu cihazda dosya paylaşımı desteklenmiyor.'
      );
      return;
    }

    // CSV alanlarını güvenli ve düzgün biçimde hazırla.
    const csvHucre = (deger: string | number) => {
      const metin = String(deger);

      // Excel'de ürün adlarının formül olarak çalışmasını engelle.
      const guvenliMetin = /^[\s]*[=+\-@]/.test(metin)
        ? "'" + metin
        : metin;

      return '"' + guvenliMetin.replace(/"/g, '""') + '"';
    };

    const basliklar = [
      'Ürün Adı',
      'İşlem Türü',
      'Miktar',
      'Birim',
      'Kategori',
      'İşlem Tarihi',
    ];

    const satirlar = filtrelenmisGecmis.map((kayit) => {
      const bilgiler = [
        kayit.ad,
        kayit.islem === 'tuketildi'
          ? 'Tüketildi'
          : 'İsraf Edildi',
        miktariGoster(kayit.miktar),
        kayit.birim,
        kayit.kategori,
        islemTarihiniGoster(kayit.islemTarihi),
      ];

      return bilgiler.map(csvHucre).join(';');
    });

    // UTF-8 BOM, Türkçe karakterlerin Excel'de doğru
    // görüntülenmesine yardımcı olur.
    const csvIcerigi =
      '\uFEFF' +
      [
        basliklar.map(csvHucre).join(';'),
        ...satirlar,
      ].join('\r\n');

    const dosya = new File(
      Paths.cache,
      `israfetme-gecmis-${Date.now()}.csv`
    );

    dosya.create();
    await dosya.write(csvIcerigi);

    await Sharing.shareAsync(dosya.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'İsrafEtme İşlem Geçmişi',
    });
  } catch (hata) {
    console.error('CSV paylaşım hatası:', hata);

    Alert.alert(
      'Hata',
      'İşlem geçmişi dışa aktarılamadı.'
    );
  }
};
  // Yeni ürün ekle.
  const urunEkle = () => {
    if (!yuklendi) return;
    const temizAd = urunAdi.trim();
    const duzenliTarih = tarihiDuzenle(tarih);
    const duzenliMiktar = miktariDuzenle(miktar);
    if (!temizAd || duzenliTarih === null) {
      Alert.alert(
        'Hatalı bilgi',
        'Ürün adını ve geçerli bir tarih gir. Örnek: 25.10.2026'
      );
      return;
    }
    if (duzenliMiktar === null) {
      Alert.alert(
        'Hatalı miktar',
        'Lütfen doğru formatta miktar giriniz. Örnek: 2 veya 2,5'
      );
      return;
    }
    const yeniUrun: Urun = {
      id: yeniId(),
      ad: temizAd,
      sonTarih: duzenliTarih,
      kategori,
      miktar: duzenliMiktar,
      birim,
      eklenmeTarihi: new Date().toISOString(),
    };
    setVeriler((onceki) => ({
      ...onceki,
      urunler: [...onceki.urunler, yeniUrun],
    }));
    setUrunAdi('');
    setTarih('');
    setKategori('Diğer');
    setMiktar('1');
    setBirim('Adet');
  };

  // Ürün silme: İşlem geçmişine eklemez.
  const urunSil = (urunId: string) => {
    Alert.alert(
      'Ürünü Sil',
      'Bu ürün kaydı geçmişe eklenmeden silinecek. Emin misin?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            setVeriler((onceki) => ({
              ...onceki,
              urunler: onceki.urunler.filter(
                (urun) => urun.id !== urunId
              ),
            }));
          },
        },
      ]
    );
  };
  // YENİ: Ürünü tüketildi veya israf edildi olarak kaydet.
 // Kullanıcı Tüketildi veya İsraf Edildi butonuna basınca
// miktar giriş penceresini aç.
const urunTamamla = (urun: Urun, islem: IslemTuru) => {
  setSeciliIslem({
    urunId: urun.id,
    islem,
  });
};
// Kullanıcının belirttiği miktarı stoktan düş ve geçmişe kaydet.
const miktarIsleminiKaydet = (islenenMiktar: number) => {
  if (seciliIslem === null) return;
  const secim = seciliIslem;
  const kayitId = yeniId();
  const islemTarihi = new Date().toISOString();
  setVeriler((onceki) => {
    const aktifUrun = onceki.urunler.find(
      (urun) => urun.id === secim.urunId
    );
    // Ürün silinmişse veya miktar geçersizse işlem yapma.
    if (
      !aktifUrun ||
      !Number.isFinite(islenenMiktar) ||
      islenenMiktar <= 0 ||
      islenenMiktar > aktifUrun.miktar
    ) {
      return onceki;
    }
    // Ondalıklı sayı hesaplarındaki küçük farkları gider.
    // Örn: 0,3 - 0,1 = 0,2
    const kalanMiktar =
      Math.round(
        (aktifUrun.miktar - islenenMiktar) * 1000000
      ) / 1000000;
    // İşlem geçmişine yalnızca işlenen miktarı kaydet.
    const yeniGecmisKaydi: GecmisKaydi = {
      ...aktifUrun,
      miktar: islenenMiktar,
      kayitId,
      islem: secim.islem,
      islemTarihi,
    };
    // Ürün tamamen bittiyse stoktan kaldır.
    // Kısmen kullanıldıysa kalan miktarı güncelle.
    const guncelUrunler =
      kalanMiktar <= 0
        ? onceki.urunler.filter(
            (urun) => urun.id !== aktifUrun.id
          )
        : onceki.urunler.map((urun) =>
            urun.id === aktifUrun.id
              ? { ...urun, miktar: kalanMiktar }
              : urun
          );
    return {
      urunler: guncelUrunler,
      gecmis: [
        ...onceki.gecmis,
        yeniGecmisKaydi,
      ],
    };
  });
  // İşlem tamamlandıktan sonra miktar penceresini kapat.
  setSeciliIslem(null);
  if (duzenlenenUrunId === secim.urunId) {
    duzenlemeyiIptal();
  }
};
  // Düzenleme alanını aç.
  const duzenlemeyiBaslat = (urun: Urun) => {
    setDuzenlenenUrunId(urun.id);
    setDuzenlemeAdi(urun.ad);
    setDuzenlemeTarihi(tarihiGoster(urun.sonTarih));
    setDuzenlemeKategorisi(urun.kategori);
    setDuzenlemeMiktari(miktariGoster(urun.miktar));
    setDuzenlemeBirimi(urun.birim);
  };
  // Düzenlemeyi iptal et.
  const duzenlemeyiIptal = () => {
    setDuzenlenenUrunId(null);
    setDuzenlemeAdi('');
    setDuzenlemeTarihi('');
    setDuzenlemeKategorisi('Diğer');
    setDuzenlemeMiktari('1');
    setDuzenlemeBirimi('Adet');
  };
  // Düzenlemeyi kaydet.
  const duzenlemeyiKaydet = () => {
    if (!yuklendi || duzenlenenUrunId === null) return;
    const temizAd = duzenlemeAdi.trim();
    const yeniTarih = tarihiDuzenle(duzenlemeTarihi);
    const yeniMiktar = miktariDuzenle(duzenlemeMiktari);
    if (!temizAd || yeniTarih === null) {
      Alert.alert(
        'Hatalı bilgi',
        'Geçerli bir ürün adı ve tarih gir.'
      );
      return;
    }
    if (yeniMiktar === null) {
      Alert.alert(
        'Hatalı miktar',
        'Lütfen doğru formatta miktar giriniz. Örnek: 2 veya 2,5'
      );
      return;
    }
    setVeriler((onceki) => ({
      ...onceki,
      urunler: onceki.urunler.map((urun) =>
        urun.id === duzenlenenUrunId
          ? {
              ...urun,
              ad: temizAd,
              sonTarih: yeniTarih,
              kategori: duzenlemeKategorisi,
              miktar: yeniMiktar,
              birim: duzenlemeBirimi,
            }
          : urun
      ),
    }));
    duzenlemeyiIptal();
  };
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AnaSayfaOzeti
  urunler={urunler}
  gecmis={gecmis}
  kalanGun={kalanGun}
/>
        {/* YENİ: Stok ve işlem özeti */}
        <Text style={[styles.sectionTitle, modernStyles.bolumBasligi]}>Genel Durum</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {urunler.length}
            </Text>
            <Text style={styles.summaryLabel}>Stokta</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, styles.greenText]}>
              {tuketilenSayisi}
            </Text>
            <Text style={styles.summaryLabel}>Tüketilen</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, styles.redText]}>
              {israfSayisi}
            </Text>
            <Text style={styles.summaryLabel}>İsraf</Text>
          </View>
        </View>
<TouchableOpacity
  style={[styles.button, modernStyles.anaButon]}
  onPress={() => setIstatistikAcik(true)}
>
  <Text style={[styles.buttonText, modernStyles.anaButonYazisi]}>
    📊 İstatistiklerimi Gör
  </Text>
</TouchableOpacity>
<TouchableOpacity
  style={[styles.button, modernStyles.anaButon]}
  onPress={() => setAlisverisAcik(true)}
>
  <Text style={[styles.buttonText, modernStyles.anaButonYazisi]}>
    🛒 Alışveriş Listem
  </Text>
</TouchableOpacity>
         <BildirimYoneticisi
          urunler={urunler}
          yuklendi={yuklendi}
/>
        <Text style={[styles.sectionTitle, modernStyles.bolumBasligi]}>Yeni Ürün Ekle</Text>
        <Text style={[styles.label, modernStyles.etiket]}>Ürün Adı</Text>
        <TextInput
      style={[styles.input, modernStyles.input]}      
          placeholder="Örn: Süt"
          value={urunAdi}
          onChangeText={setUrunAdi}
        />
        <Text style={[styles.label, modernStyles.etiket]}>Son Tüketim Tarihi</Text>
        <TextInput
          style={[styles.input, modernStyles.input]}
          placeholder="GG.AA.YYYY"
          value={tarih}
          onChangeText={setTarih}
        />
        <Text style={[styles.label, modernStyles.etiket]}>Kategori</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.optionsRow}
        >
          {KATEGORILER.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.optionChip,
                modernStyles.filtre,
                kategori === item && styles.optionChipActive,
              ]}
              onPress={() => setKategori(item)}
            >
              <Text
                style={[
                  styles.optionText,
                  kategori === item && styles.optionTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={[styles.label, modernStyles.etiket]}>Miktar</Text>
        <TextInput
          style={[styles.input, modernStyles.input]}
          placeholder="Örn: 2 veya 2,5"
          keyboardType="decimal-pad"
          value={miktar}
          onChangeText={setMiktar}
        />
        <Text style={[styles.label, modernStyles.etiket]}>Birim</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.optionsRow}
        >
          {BIRIMLER.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.optionChip,
                modernStyles.filtre,
                birim === item && styles.optionChipActive,
              ]}
              onPress={() => setBirim(item)}
            >
              <Text
                style={[
                  styles.optionText,
                  birim === item && styles.optionTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[
            styles.button,
            modernStyles.anaButon,
            !yuklendi && styles.disabledButton,
          ]}
          onPress={urunEkle}
          disabled={!yuklendi}
        >
          <Text style={[styles.buttonText, modernStyles.anaButonYazisi]}>
            {yuklendi ? '+ Ürün Ekle' : 'Veriler yükleniyor...'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.sectionTitle, modernStyles.bolumBasligi]}>
          Ürünlerim ({urunler.length})
        </Text>
        <Text style={styles.sortInfo}>
          ⏳ Son tüketim tarihine göre sıralandı
        </Text>
          {/* Ürün arama */}
<TextInput
  style={[styles.input, modernStyles.input]}
  placeholder="🔍 Ürün ara..."
  value={aramaMetni}
  onChangeText={setAramaMetni}
/>
{/* Kategori filtreleri */}
<Text style={[styles.label, modernStyles.etiket]}>Kategoriye Göre Filtrele</Text>
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.optionsRow}
>
  {(['Tümü', ...KATEGORILER] as const).map((item) => (
    <TouchableOpacity
      key={item}
      style={[
        styles.optionChip,
        modernStyles.filtre,
        kategoriFiltresi === item && modernStyles.filtreSecili,
      ]}
      onPress={() => setKategoriFiltresi(item)}
    >
      <Text
        style={[
          styles.optionText,
          modernStyles.filtreYazisi,
          kategoriFiltresi === item && modernStyles.filtreSeciliYazisi,
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
{/* Acil ürün filtresi */}
<TouchableOpacity
  style={[
    styles.optionChip,
    modernStyles.filtre,
    { alignSelf: 'flex-start', marginVertical: 8 },
    yalnizcaAcil && modernStyles.filtreSecili,
  ]}
  onPress={() => setYalnizcaAcil(!yalnizcaAcil)}
>
  <Text
    style={[
      styles.optionText,
      modernStyles.filtreYazisi,
      yalnizcaAcil && modernStyles.filtreSeciliYazisi,
    ]}
  >
    {yalnizcaAcil
      ? '✓ Acil Ürünler'
      : '⚠️ Yalnızca Acil Ürünler'}
  </Text>
</TouchableOpacity>
<Text style={styles.sortInfo}>
  Gösterilen: {gorunenUrunler.length} / {urunler.length} ürün
</Text>
        {!yuklendi ? (
          <Text style={styles.emptyText}>
            {yuklemeHatasi
              ? 'Veriler okunamadı. Uygulamayı yeniden başlat.'
              : 'Kayıtlı ürünler yükleniyor...'}
          </Text>
        ) : urunler.length === 0 ? (
  <Text style={styles.emptyText}>
    Henüz stokta ürün bulunmuyor.
  </Text>
) : gorunenUrunler.length === 0 ? (
  <Text style={styles.emptyText}>
    Aramana uygun ürün bulunamadı.
  </Text>
) : (
          gorunenUrunler.map((urun) => {
            const durum = durumBilgisi(urun.sonTarih);
            const renkler = DURUM_RENKLERI[durum.tur];
            return (
              <View
  key={urun.id}
  style={[styles.card, modernStyles.urunKarti]}
>
                {duzenlenenUrunId === urun.id ? (
                  <View style={styles.editForm}>
                    <Text style={[styles.label, modernStyles.etiket]}>Ürün Adı</Text>
                    <TextInput
                      style={[styles.input, modernStyles.input]}
                      value={duzenlemeAdi}
                      onChangeText={setDuzenlemeAdi}
                    />
                    <Text style={[styles.label, modernStyles.etiket]}>
                      Son Tüketim Tarihi
                    </Text>
                    <TextInput
                      style={[styles.input, modernStyles.input]}
                      value={duzenlemeTarihi}
                      onChangeText={setDuzenlemeTarihi}
                      placeholder="GG.AA.YYYY"
                    />
                    <Text style={[styles.label, modernStyles.etiket]}>Kategori</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionsRow}
                    >
                      {KATEGORILER.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.optionChip,
                            modernStyles.filtre,
                            duzenlemeKategorisi === item &&
                              styles.optionChipActive,
                          ]}
                          onPress={() => setDuzenlemeKategorisi(item)}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              duzenlemeKategorisi === item &&
                                styles.optionTextActive,
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <Text style={[styles.label, modernStyles.etiket]}>Miktar</Text>
                    <TextInput
                      style={[styles.input, modernStyles.input]}
                      keyboardType="decimal-pad"
                      value={duzenlemeMiktari}
                      onChangeText={setDuzenlemeMiktari}
                    />
                    <Text style={[styles.label, modernStyles.etiket]}>Birim</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionsRow}
                    >
                      {BIRIMLER.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.optionChip,
                            modernStyles.filtre,
                            duzenlemeBirimi === item &&
                              styles.optionChipActive,
                          ]}
                          onPress={() => setDuzenlemeBirimi(item)}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              duzenlemeBirimi === item &&
                                styles.optionTextActive,
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.cancelButton]}
                        onPress={duzenlemeyiIptal}
                      >
                        <Text style={styles.cancelButtonText}>
                          İptal
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.saveButton]}
                        onPress={duzenlemeyiKaydet}
                      >
                        <Text style={styles.saveButtonText}>
                          Kaydet
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.productName, modernStyles.urunAdi]}>
                        {urun.ad}
                      </Text>
                      <SonTarihRozeti gun={kalanGun(urun.sonTarih)} />
                    </View>
                    <Text style={styles.categoryText}>
                      {urun.kategori}
                    </Text>
                    <Text style={styles.quantityText}>
                      Miktar: {miktariGoster(urun.miktar)} {urun.birim}
                    </Text>
                    <Text style={styles.date}>
                      Son tüketim: {tarihiGoster(urun.sonTarih)}
                    </Text>
                    <TouchableOpacity
                      style={styles.detailButton}
                      onPress={() => setDetayUrunId(urun.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${urun.ad} ürün detayları ve stok hareketleri`}
                    >
                      <Text style={styles.detailButtonText}>
                        📋 Detaylar ve Stok Hareketleri  ›
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.warning,
                        { color: renkler.metin },
                      ]}
                    >
                      {durum.metin}
                    </Text>
                    {/* YENİ: Tüketim ve israf butonları */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.consumedButton]}
                        onPress={() => urunTamamla(urun, 'tuketildi')}
                      >
                        <Text style={styles.consumedButtonText}>
                          ✓ Tüketildi
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.wastedButton]}
                        onPress={() => urunTamamla(urun, 'israf')}
                      >
                        <Text style={styles.wastedButtonText}>
                          İsraf Edildi
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.editButton]}
                        onPress={() => duzenlemeyiBaslat(urun)}
                      >
                        <Text style={styles.editButtonText}>
                          ✏️ Düzenle
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.deleteButton]}
                        onPress={() => urunSil(urun.id)}
                      >
                        <Text style={styles.deleteButtonText}>
                          🗑 Sil
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            );
          })
        )}
        {/* YENİ: İşlem geçmişi */}
        <Text style={[styles.sectionTitle, modernStyles.bolumBasligi]}>
          Son İşlemler ({gecmis.length})
        </Text>
        {/* 20. AŞAMA: İşlem geçmişinde ürün arama */}
<TextInput
  style={[styles.input, modernStyles.input]}
  placeholder="🔍 Geçmişte ürün ara..."
  value={gecmisArama}
  onChangeText={setGecmisArama}
/>

{/* İşlem türüne göre filtreleme */}
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.optionsRow}
>
  {(['Tümü', 'tuketildi', 'israf'] as const).map((filtre) => (
    <TouchableOpacity
      key={filtre}
      style={[
        styles.optionChip,
        gecmisFiltresi === filtre && styles.optionChipActive,
      ]}
      onPress={() => setGecmisFiltresi(filtre)}
    >
      <Text
        style={[
          styles.optionText,
          gecmisFiltresi === filtre && styles.optionTextActive,
        ]}
      >
        {filtre === 'Tümü'
          ? 'Tümü'
          : filtre === 'tuketildi'
            ? '✓ Tüketildi'
            : '🗑 İsraf Edildi'}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
{/* 21. AŞAMA: Tarihe göre filtreleme */}
<Text style={[styles.label, modernStyles.etiket]}>
  📅 İşlem Tarihine Göre Filtrele
</Text>

<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.optionsRow}
>
  {(['Tümü', 'Son 7 Gün', 'Son 30 Gün', 'Bu Ay'] as const).map(
    (filtre) => (
      <TouchableOpacity
        key={filtre}
        style={[
          styles.optionChip,
          modernStyles.filtre,
          gecmisTarihFiltresi === filtre &&
            modernStyles.filtreSecili,
        ]}
        onPress={() => setGecmisTarihFiltresi(filtre)}
      >
        <Text
          style={[
            styles.optionText,
            modernStyles.filtreYazisi,
            gecmisTarihFiltresi === filtre &&
              modernStyles.filtreSeciliYazisi,
          ]}
        >
          {filtre}
        </Text>
      </TouchableOpacity>
    )
  )}
</ScrollView>

<Text style={styles.sortInfo}>
  Filtreye uygun {filtrelenmisGecmis.length} işlem bulundu.
</Text>
        {sonIslemler.length === 0 ? (
  <Text style={styles.emptyText}>
    {gecmis.length === 0
      ? 'Henüz tüketim veya israf kaydı bulunmuyor.'
      : 'Aramana uygun işlem bulunamadı.'}
  </Text>
) : (
          sonIslemler.map((kayit) => (
            <TouchableOpacity
              key={kayit.kayitId}
              style={styles.historyCard}
              onPress={() => setDetayUrunId(kayit.id)}
              accessibilityRole="button"
              accessibilityLabel={`${kayit.ad} ürününün işlem geçmişini aç`}
            >
              <View style={styles.historyHeader}>
                <Text style={styles.historyName}>
                  {kayit.ad}
                </Text>
                <Text
                  style={[
                    styles.historyStatus,
                    {
                      color:
                        kayit.islem === 'tuketildi'
                          ? '#247A43'
                          : '#B42318',
                    },
                  ]}
                >
                  {kayit.islem === 'tuketildi'
                    ? '✓ Tüketildi'
                    : 'İsraf Edildi'}
                </Text>
              </View>
              <Text style={styles.historyDetail}>
                {miktariGoster(kayit.miktar)} {kayit.birim}
                {' · '}
                {kayit.kategori}
              </Text>
              <Text style={styles.historyDetail}>
                İşlem tarihi: {islemTarihiniGoster(kayit.islemTarihi)}
              </Text>
              <Text style={styles.historyLink}>Hareketleri görüntüle ›</Text>
            </TouchableOpacity>
          ))
        )}
        {/* 20. AŞAMA: Tüm geçmişi göster / İlk 10'a dön */}
{filtrelenmisGecmis.length > 10 && (
  <TouchableOpacity
    style={[styles.button, modernStyles.anaButon]}
    onPress={() =>
      setTumGecmisiGoster((onceki) => !onceki)
    }
  >
    <Text
      style={[
        styles.buttonText,
        modernStyles.anaButonYazisi,
      ]}
    >
      {tumGecmisiGoster
        ? '↑ İlk 10 İşlemi Göster'
        : `↓ Tüm Geçmişi Göster (${filtrelenmisGecmis.length} kayıt)`}
    </Text>
  </TouchableOpacity>
)}
{/* 21. AŞAMA: CSV dışa aktarma butonu */}
<TouchableOpacity
  style={[
    styles.button,
    modernStyles.anaButon,
    {
      backgroundColor: '#225A43',
      marginTop: 10,
    },
  ]}
  onPress={gecmisiCsvPaylas}
>
  <Text
    style={[
      styles.buttonText,
      modernStyles.anaButonYazisi,
    ]}
  >
    📄 Geçmişi CSV Olarak Paylaş
  </Text>
</TouchableOpacity>
{/* 22. AŞAMA: Yedekleme ve geri yükleme */}
<View
  style={{
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DCE9E0',
    borderRadius: 18,
    padding: 16,
    marginTop: 20,
    gap: 10,
  }}
>
  <Text style={[styles.sectionTitle, modernStyles.bolumBasligi]}>
    💾 Verilerimi Yönet
  </Text>

  <Text style={styles.sortInfo}>
    Ürünlerini, işlem geçmişini ve alışveriş
    listesini yedekleyebilir veya geri yükleyebilirsin.
  </Text>

  <TouchableOpacity
    style={[
      styles.button,
      modernStyles.anaButon,
    ]}
    onPress={yedegiPaylas}
    disabled={!yuklendi || yedeklemeMesgul}
  >
    <Text style={modernStyles.anaButonYazisi}>
      📥 Yedek Oluştur
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.button,
      modernStyles.anaButon,
      { backgroundColor: '#315D78' },
    ]}
    onPress={yedektenGeriYukle}
    disabled={!yuklendi || yedeklemeMesgul}
  >
    <Text style={modernStyles.anaButonYazisi}>
      📤 Yedekten Geri Yükle
    </Text>
  </TouchableOpacity>
</View>
      </ScrollView>
<IstatistikEkrani
  visible={istatistikAcik}
  onClose={() => setIstatistikAcik(false)}
  urunler={urunler}
  gecmis={gecmis}
/>
<AlisverisEkrani
  key={alisverisRevizyonu}
  visible={alisverisAcik}
  onClose={() => setAlisverisAcik(false)}
  stokUrunleri={urunler}
  onStogaAktar={(urun) => {
    setVeriler((onceki) => ({
      ...onceki,
      urunler: [
        ...onceki.urunler,
        {
          id: yeniId(),
          ...urun,
          eklenmeTarihi: new Date().toISOString(),
        },
      ],
    }));
  }}
/>
        <MiktarIslemiModal
  urun={
    seciliIslem
      ? urunler.find(
          (urun) => urun.id === seciliIslem.urunId
        ) ?? null
      : null
  }
  islem={seciliIslem?.islem ?? null}
  onClose={() => setSeciliIslem(null)}
  onConfirm={miktarIsleminiKaydet}
/>
      <UrunDetayEkrani
        visible={detayUrunId !== null}
        urunId={detayUrunId}
        urun={urunler.find((urun) => urun.id === detayUrunId) ?? null}
        gecmis={gecmis}
        kalanGun={kalanGun}
        onClose={() => setDetayUrunId(null)}
      />
      <KarsilamaEkrani />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FAF5',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    paddingBottom: 45,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#247A43',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 15,
    marginBottom: 5,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    fontSize: 16,
    color: '#222222',
  },
  optionsRow: {
    gap: 8,
    paddingVertical: 3,
  },
  optionChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D5DDD5',
  },
  optionChipActive: {
    backgroundColor: '#247A43',
    borderColor: '#247A43',
  },
  optionText: {
    color: '#444444',
    fontSize: 14,
  },
  optionTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#247A43',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: {
    backgroundColor: '#9BBDA5',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  sortInfo: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 6,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  productName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#222222',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoryText: {
    fontSize: 14,
    color: '#247A43',
    fontWeight: '600',
  },
  quantityText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  date: {
    fontSize: 14,
    color: '#666666',
  },
  warning: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#777777',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 15,
  },
  editForm: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#E3F0FF',
  },
  editButtonText: {
    color: '#1565C0',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FDE8E8',
  },
  deleteButtonText: {
    color: '#C62828',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#EAEAEA',
  },
  cancelButtonText: {
    color: '#444444',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#247A43',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // YENİ: Genel durum sayaçları
  summaryRow: {
    flexDirection: 'row',
    gap: 9,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3EBE4',
  },
  summaryNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 5,
  },
  greenText: {
    color: '#247A43',
  },
  redText: {
    color: '#B42318',
  },
  // YENİ: Tüketim ve israf butonları
  consumedButton: {
    backgroundColor: '#247A43',
  },
  consumedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  wastedButton: {
    backgroundColor: '#FDE0DD',
  },
  wastedButtonText: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // YENİ: İşlem geçmişi kartları
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3EBE4',
    borderRadius: 12,
    padding: 15,
    gap: 7,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  historyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222222',
    flexShrink: 1,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyDetail: {
    fontSize: 13,
    color: '#666666',
  },
  historyLink: {
    color: '#247A43',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  detailButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9E6D1',
    backgroundColor: '#EFF8F1',
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  detailButtonText: {
    fontSize: 13,
    color: '#20693B',
    fontWeight: '700',
  },
});
