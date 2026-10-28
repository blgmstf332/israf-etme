
import { AlisverisEkrani } from '@/components/alisveris-ekrani';
import { BildirimYoneticisi } from '@/components/bildirim-yoneticisi';
import { IstatistikEkrani } from '@/components/istatistik-ekrani';
import { KarsilamaEkrani } from '@/components/karsilama-ekrani';
import { MiktarIslemiModal } from '@/components/miktar-islemi-modal';
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
  const [aramaMetni, setAramaMetni] = useState('');

  const [kategoriFiltresi, setKategoriFiltresi] =
  useState<Kategori | 'Tümü'>('Tümü');

  const [yalnizcaAcil, setYalnizcaAcil] = useState(false);
  const [istatistikAcik, setIstatistikAcik] = useState(false);
  const [alisverisAcik, setAlisverisAcik] = useState(false);
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

  // Son yapılan işlemleri önce göster.
  const sonIslemler = [...gecmis].reverse().slice(0, 10);

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
        <Text style={styles.title}>🌿 İsrafEtme</Text>

        <Text style={styles.subtitle}>
          Gıdalarını takip et, israfı önle!
        </Text>

        {/* YENİ: Stok ve işlem özeti */}
        <Text style={styles.sectionTitle}>Genel Durum</Text>

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
  style={styles.button}
  onPress={() => setIstatistikAcik(true)}
>
  <Text style={styles.buttonText}>
    📊 İstatistiklerimi Gör
  </Text>
</TouchableOpacity>
<TouchableOpacity
  style={styles.button}
  onPress={() => setAlisverisAcik(true)}
>
  <Text style={styles.buttonText}>
    🛒 Alışveriş Listem
  </Text>
</TouchableOpacity>
         <BildirimYoneticisi
          urunler={urunler}
          yuklendi={yuklendi}
/>
        <Text style={styles.sectionTitle}>Yeni Ürün Ekle</Text>

        <Text style={styles.label}>Ürün Adı</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: Süt"
          value={urunAdi}
          onChangeText={setUrunAdi}
        />

        <Text style={styles.label}>Son Tüketim Tarihi</Text>
        <TextInput
          style={styles.input}
          placeholder="GG.AA.YYYY"
          value={tarih}
          onChangeText={setTarih}
        />

        <Text style={styles.label}>Kategori</Text>
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

        <Text style={styles.label}>Miktar</Text>
        <TextInput
          style={styles.input}
          placeholder="Örn: 2 veya 2,5"
          keyboardType="decimal-pad"
          value={miktar}
          onChangeText={setMiktar}
        />

        <Text style={styles.label}>Birim</Text>
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
            !yuklendi && styles.disabledButton,
          ]}
          onPress={urunEkle}
          disabled={!yuklendi}
        >
          <Text style={styles.buttonText}>
            {yuklendi ? '+ Ürün Ekle' : 'Veriler yükleniyor...'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>
          Ürünlerim ({urunler.length})
        </Text>

        <Text style={styles.sortInfo}>
          ⏳ Son tüketim tarihine göre sıralandı
        </Text>
          {/* Ürün arama */}
<TextInput
  style={styles.input}
  placeholder="🔍 Ürün ara..."
  value={aramaMetni}
  onChangeText={setAramaMetni}
/>

{/* Kategori filtreleri */}
<Text style={styles.label}>Kategoriye Göre Filtrele</Text>

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
        kategoriFiltresi === item && styles.optionChipActive,
      ]}
      onPress={() => setKategoriFiltresi(item)}
    >
      <Text
        style={[
          styles.optionText,
          kategoriFiltresi === item && styles.optionTextActive,
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
    { alignSelf: 'flex-start', marginVertical: 8 },
    yalnizcaAcil && styles.optionChipActive,
  ]}
  onPress={() => setYalnizcaAcil(!yalnizcaAcil)}
>
  <Text
    style={[
      styles.optionText,
      yalnizcaAcil && styles.optionTextActive,
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
                style={[
                  styles.card,
                  {
                    backgroundColor: renkler.arkaPlan,
                    borderColor: renkler.kenar,
                  },
                ]}
              >
                {duzenlenenUrunId === urun.id ? (
                  <View style={styles.editForm}>
                    <Text style={styles.label}>Ürün Adı</Text>
                    <TextInput
                      style={styles.input}
                      value={duzenlemeAdi}
                      onChangeText={setDuzenlemeAdi}
                    />

                    <Text style={styles.label}>
                      Son Tüketim Tarihi
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={duzenlemeTarihi}
                      onChangeText={setDuzenlemeTarihi}
                      placeholder="GG.AA.YYYY"
                    />

                    <Text style={styles.label}>Kategori</Text>
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

                    <Text style={styles.label}>Miktar</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="decimal-pad"
                      value={duzenlemeMiktari}
                      onChangeText={setDuzenlemeMiktari}
                    />

                    <Text style={styles.label}>Birim</Text>
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
                        style={[styles.actionButton, styles.cancelButton]}
                        onPress={duzenlemeyiIptal}
                      >
                        <Text style={styles.cancelButtonText}>
                          İptal
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.saveButton]}
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
                      <Text style={styles.productName}>
                        {urun.ad}
                      </Text>

                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: renkler.etiket },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: renkler.metin },
                          ]}
                        >
                          {durum.etiket}
                        </Text>
                      </View>
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
                        style={[styles.actionButton, styles.consumedButton]}
                        onPress={() => urunTamamla(urun, 'tuketildi')}
                      >
                        <Text style={styles.consumedButtonText}>
                          ✓ Tüketildi
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.wastedButton]}
                        onPress={() => urunTamamla(urun, 'israf')}
                      >
                        <Text style={styles.wastedButtonText}>
                          İsraf Edildi
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.editButton]}
                        onPress={() => duzenlemeyiBaslat(urun)}
                      >
                        <Text style={styles.editButtonText}>
                          ✏️ Düzenle
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.actionButton, styles.deleteButton]}
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
        <Text style={styles.sectionTitle}>
          Son İşlemler ({gecmis.length})
        </Text>

        {gecmis.length === 0 ? (
          <Text style={styles.emptyText}>
            Henüz tüketim veya israf kaydı bulunmuyor.
          </Text>
        ) : (
          sonIslemler.map((kayit) => (
            <View
              key={kayit.kayitId}
              style={styles.historyCard}
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
            </View>
          ))
        )}
      </ScrollView>
<IstatistikEkrani
  visible={istatistikAcik}
  onClose={() => setIstatistikAcik(false)}
  urunler={urunler}
  gecmis={gecmis}
/>
<AlisverisEkrani
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
    padding: 20,
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
    borderRadius: 12,
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
});
