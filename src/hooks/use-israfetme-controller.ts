// Bu dosyanın iş mantığı, 26A sonrası çalışan index.tsx dosyasından taşındı.
// Kalıcı veriler UygulamaContext içinde ortak tutulur.
import { useState } from 'react';
import { Alert } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useUygulama } from '@/context/uygulama-context';
import { barkoddanUrunBul } from '@/services/barkod-servisi';
import {
  ALISVERIS_STORAGE_KEY,
  yedekDosyasiSec,
  yedekOlustur,
} from '@/utils/yedekleme';
import {
  STORAGE_KEY,
  kalanGun,
  yeniId,
  tarihiDuzenle,
  tarihiGoster,
  miktariDuzenle,
  miktariGoster,
  islemTarihiniGoster,
  verileriDuzenle,
  type Birim,
  type Kategori,
  type IslemTuru,
  type Urun,
  type GecmisKaydi,
  type UygulamaVerisi,
} from '@/utils/urun-veri-modeli';

export function useIsrafetmeController() {
  const {
  veriler,
  setVeriler,
  yuklendi,
  yuklemeHatasi,
  kayitSirasi,
  alisverisRevizyonu,
  setAlisverisRevizyonu,
} = useUygulama();
  // Ürün ekleme alanları
  const [urunAdi, setUrunAdi] = useState('');
  // 24. AŞAMA: Barkod okuma
const [barkodAcik, setBarkodAcik] = useState(false);
const [barkodAraniyor, setBarkodAraniyor] =
  useState(false);
const [sonOkunanBarkod, setSonOkunanBarkod] =
  useState('');
  const [tarih, setTarih] = useState('');
  const [kategori, setKategori] = useState<Kategori>('Diğer');
  const [miktar, setMiktar] = useState('1');
  const [birim, setBirim] = useState<Birim>('Adet');
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
const [alisverisAcik, setAlisverisAcik] = useState(false);
// 22. AŞAMA: Yedekleme işlemleri
const [yedeklemeMesgul, setYedeklemeMesgul] = useState(false);

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
// 24. AŞAMA: Okunan barkoddan ürün adını bul.
const barkodIsle = async (barkod: string) => {
  if (barkodAraniyor) return;

  // Kamera ekranını kapat.
  setBarkodAcik(false);
  setBarkodAraniyor(true);
  setSonOkunanBarkod(barkod);

  try {
    const bulunanUrun = await barkoddanUrunBul(barkod);

    if (bulunanUrun === null) {
      Alert.alert(
        'Ürün Bulunamadı',
        'Barkod okundu ancak ürün adı veri tabanında bulunamadı. ' +
        'Ürün adını manuel girebilirsin.\n\n' +
        'Barkod: ' + barkod
      );
      return;
    }

    // Mevcut ürün ekleme formuna ürün adını yaz.
    setUrunAdi(bulunanUrun.ad);

    Alert.alert(
      'Ürün Bulundu',
      bulunanUrun.ad +
        '\n\nSon tüketim tarihini ve miktarı kontrol ederek ürünü ekleyebilirsin.'
    );
  } catch (hata) {
    console.error('Barkod sorgulama hatası:', hata);

    Alert.alert(
      'Bağlantı Hatası',
      'Ürün bilgisi alınamadı. İnternet bağlantını kontrol et ' +
      'veya ürün adını manuel gir.'
    );
  } finally {
    setBarkodAraniyor(false);
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

  return {
    veriler,
    setVeriler,
    yuklendi,
    yuklemeHatasi,
    alisverisRevizyonu,
    setAlisverisRevizyonu,
    urunAdi,
    setUrunAdi,
    barkodAcik,
    setBarkodAcik,
    barkodAraniyor,
    sonOkunanBarkod,
    tarih,
    setTarih,
    kategori,
    setKategori,
    miktar,
    setMiktar,
    birim,
    setBirim,
    seciliIslem,
    setSeciliIslem,
    detayUrunId,
    setDetayUrunId,
    gecmisArama,
    setGecmisArama,
    gecmisFiltresi,
    setGecmisFiltresi,
    gecmisTarihFiltresi,
    setGecmisTarihFiltresi,
    tumGecmisiGoster,
    setTumGecmisiGoster,
    aramaMetni,
    setAramaMetni,
    kategoriFiltresi,
    setKategoriFiltresi,
    yalnizcaAcil,
    setYalnizcaAcil,
    alisverisAcik,
    setAlisverisAcik,
    yedeklemeMesgul,
    duzenlenenUrunId,
    duzenlemeAdi,
    setDuzenlemeAdi,
    duzenlemeTarihi,
    setDuzenlemeTarihi,
    duzenlemeKategorisi,
    setDuzenlemeKategorisi,
    duzenlemeMiktari,
    setDuzenlemeMiktari,
    duzenlemeBirimi,
    setDuzenlemeBirimi,
    urunler,
    gecmis,
    gorunenUrunler,
    tuketilenSayisi,
    israfSayisi,
    filtrelenmisGecmis,
    sonIslemler,
    yedegiPaylas,
    yedektenGeriYukle,
    gecmisiCsvPaylas,
    barkodIsle,
    urunEkle,
    urunSil,
    urunTamamla,
    miktarIsleminiKaydet,
    duzenlemeyiBaslat,
    duzenlemeyiIptal,
    duzenlemeyiKaydet,
  };
}
