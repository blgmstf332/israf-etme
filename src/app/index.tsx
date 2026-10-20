
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useState } from 'react';
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

import { KarsilamaEkrani } from '@/components/karsilama-ekrani';

const STORAGE_KEY = 'israfetme_urunler_v1';

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

// YENİ: Tarih durumlarının tipleri
type DurumTuru =
  | 'gecmis'
  | 'yaklasan'
  | 'normal'
  | 'gecersiz';

// YENİ: Duruma göre renkler
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

// Kullanıcının tarih girişini standart biçime dönüştürür.
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

// Tarihe kalan gün sayısını hesaplar.
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

// YENİ: Tarihe göre metin ve durum oluşturur.
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

// Miktar doğrulama
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

// Eski ürün kayıtlarını yeni veri yapısına uyarlar.
function kayitlariDuzenle(veri: unknown): Urun[] {
  if (!Array.isArray(veri)) {
    throw new Error('Kayıtlı ürün listesi geçersiz.');
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
      throw new Error('Ürün bilgilerinde eksik alan var.');
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

export default function HomeScreen() {
  // Ürün ekleme
  const [urunAdi, setUrunAdi] = useState('');
  const [tarih, setTarih] = useState('');
  const [kategori, setKategori] = useState<Kategori>('Diğer');
  const [miktar, setMiktar] = useState('1');
  const [birim, setBirim] = useState<Birim>('Adet');

  // Ürün listesi
  const [urunler, setUrunler] = useState<Urun[]>([]);
  const [yuklendi, setYuklendi] = useState(false);

  // Ürün düzenleme
  const [duzenlenenUrunId, setDuzenlenenUrunId] =
    useState<string | null>(null);

  const [duzenlemeAdi, setDuzenlemeAdi] = useState('');
  const [duzenlemeTarihi, setDuzenlemeTarihi] = useState('');
  const [duzenlemeKategorisi, setDuzenlemeKategorisi] =
    useState<Kategori>('Diğer');
  const [duzenlemeMiktari, setDuzenlemeMiktari] = useState('1');
  const [duzenlemeBirimi, setDuzenlemeBirimi] =
    useState<Birim>('Adet');

  // SQLite'dan kayıtları yükle.
  useEffect(() => {
    let aktif = true;

    async function urunleriYukle() {
      try {
        const kayit = await Storage.getItem(STORAGE_KEY);

        if (!aktif) return;

        if (kayit !== null) {
          const veri: unknown = JSON.parse(kayit);
          setUrunler(kayitlariDuzenle(veri));
        }

        setYuklendi(true);
      } catch (hata) {
        if (!aktif) return;

        console.error('Ürünler yüklenemedi:', hata);
        Alert.alert(
          'Hata',
          'Kayıtlı ürünler okunamadı. Uygulamayı yeniden başlat.'
        );
      }
    }

    urunleriYukle();

    return () => {
      aktif = false;
    };
  }, []);

  // Ürün değişikliklerini SQLite'a kaydet.
  useEffect(() => {
    if (!yuklendi) return;

    async function urunleriKaydet() {
      try {
        await Storage.setItem(
          STORAGE_KEY,
          JSON.stringify(urunler)
        );
      } catch (hata) {
        console.error('Ürünler kaydedilemedi:', hata);
        Alert.alert('Hata', 'Ürünler kaydedilemedi.');
      }
    }

    urunleriKaydet();
  }, [urunler, yuklendi]);

  // YENİ: Ürünleri son tüketim tarihine göre sırala.
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

  // Yeni ürün ekleme
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
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ad: temizAd,
      sonTarih: duzenliTarih,
      kategori,
      miktar: duzenliMiktar,
      birim,
    };

    setUrunler((oncekiUrunler) => [
      ...oncekiUrunler,
      yeniUrun,
    ]);

    setUrunAdi('');
    setTarih('');
    setKategori('Diğer');
    setMiktar('1');
    setBirim('Adet');
  };

  // Ürün silme
  const urunSil = (urunId: string) => {
    Alert.alert(
      'Ürünü Sil',
      'Bu ürünü silmek istediğine emin misin?',
      [
        {
          text: 'İptal',
          style: 'cancel',
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            setUrunler((oncekiUrunler) =>
              oncekiUrunler.filter(
                (urun) => urun.id !== urunId
              )
            );
          },
        },
      ]
    );
  };

  // Düzenlemeyi başlat
  const duzenlemeyiBaslat = (urun: Urun) => {
    setDuzenlenenUrunId(urun.id);
    setDuzenlemeAdi(urun.ad);
    setDuzenlemeTarihi(tarihiGoster(urun.sonTarih));
    setDuzenlemeKategorisi(urun.kategori);
    setDuzenlemeMiktari(String(urun.miktar).replace('.', ','));
    setDuzenlemeBirimi(urun.birim);
  };

  // Düzenlemeyi iptal et
  const duzenlemeyiIptal = () => {
    setDuzenlenenUrunId(null);
    setDuzenlemeAdi('');
    setDuzenlemeTarihi('');
    setDuzenlemeKategorisi('Diğer');
    setDuzenlemeMiktari('1');
    setDuzenlemeBirimi('Adet');
  };

  // Düzenlemeyi kaydet
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

    setUrunler((oncekiUrunler) =>
      oncekiUrunler.map((urun) =>
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
      )
    );

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

        <Text style={styles.sectionTitle}>
          Yeni Ürün Ekle
        </Text>

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

        {!yuklendi ? (
          <Text style={styles.emptyText}>
            Kayıtlı ürünler yükleniyor...
          </Text>
        ) : urunler.length === 0 ? (
          <Text style={styles.emptyText}>
            Henüz ürün eklemedin.
          </Text>
        ) : (
          siraliUrunler.map((urun) => {
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
                  // Düzenleme formu
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
                  // YENİ: Renkli ürün kartı
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
      </ScrollView>

      <KarsilamaEkrani />
    </SafeAreaView>
  );
}

// Ekran tasarımı
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FAF5',
  },
  content: {
    padding: 20,
    gap: 12,
    paddingBottom: 40,
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
  // YENİ: Ürün adı ve durum etiketi yan yana
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
  // YENİ: Renkli durum etiketi
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    flexShrink: 0,
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
});
