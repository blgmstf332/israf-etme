
import Storage from 'expo-sqlite/kv-store';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Alışveriş listesinin SQLite kayıt anahtarı
const STORAGE_KEY = 'israfetme_alisveris_v1';

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

// Alışveriş listesindeki ürün
type AlisverisUrunu = {
  id: string;
  ad: string;
  miktar: number;
  birim: Birim;
  kategori: Kategori;
};

// Stoğa gönderilecek ürün
type StogaAktarilacakUrun = Omit<AlisverisUrunu, 'id'> & {
  sonTarih: string;
};

// Ana ekrandan alınan bilgiler
type Props = {
  visible: boolean;
  onClose: () => void;
  stokUrunleri: { ad: string }[];
  onStogaAktar: (urun: StogaAktarilacakUrun) => void;
};

function yeniId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// Miktar doğrulama: 2 veya 2,5 veya 2.5
function miktariDuzenle(giris: string): number | null {
  const metin = giris.trim().replace(',', '.');

  if (!/^\d+(\.\d+)?$/.test(metin)) {
    return null;
  }

  const sayi = Number(metin);

  return Number.isFinite(sayi) && sayi > 0 ? sayi : null;
}

function miktariGoster(miktar: number): string {
  return String(miktar).replace('.', ',');
}

// Tarihi YYYY-AA-GG biçimine dönüştürür.
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

  if (yil < 1000 || yil > 9999) return null;

  const kontrol = new Date(Date.UTC(yil, ay - 1, gun));

  if (
    kontrol.getUTCFullYear() !== yil ||
    kontrol.getUTCMonth() !== ay - 1 ||
    kontrol.getUTCDate() !== gun
  ) {
    return null;
  }

  return `${yil}-${String(ay).padStart(2, '0')}-${String(gun).padStart(2, '0')}`;
}

// Kayıtları güvenli şekilde okur.
function listeyiDuzenle(veri: unknown): AlisverisUrunu[] {
  if (!Array.isArray(veri)) {
    throw new Error('Alışveriş listesi geçersiz.');
  }

  return veri.map((ham: unknown) => {
    if (typeof ham !== 'object' || ham === null) {
      throw new Error('Alışveriş kaydı geçersiz.');
    }

    const kayit = ham as Record<string, unknown>;

    if (
      typeof kayit.id !== 'string' ||
      typeof kayit.ad !== 'string' ||
      typeof kayit.miktar !== 'number' ||
      !Number.isFinite(kayit.miktar) ||
      kayit.miktar <= 0 ||
      !KATEGORILER.some((k) => k === kayit.kategori) ||
      !BIRIMLER.some((b) => b === kayit.birim)
    ) {
      throw new Error('Eksik veya geçersiz alışveriş kaydı.');
    }

    return {
      id: kayit.id,
      ad: kayit.ad,
      miktar: kayit.miktar,
      kategori: kayit.kategori as Kategori,
      birim: kayit.birim as Birim,
    };
  });
}

// Türkçe büyük/küçük harf duyarlı olmayan karşılaştırma
function isimAnahtari(ad: string): string {
  return ad.trim().toLocaleLowerCase('tr-TR');
}

export function AlisverisEkrani({
  visible,
  onClose,
  stokUrunleri,
  onStogaAktar,
}: Props) {
  const [liste, setListe] = useState<AlisverisUrunu[]>([]);
  const [yuklendi, setYuklendi] = useState(false);
  const [yuklemeHatasi, setYuklemeHatasi] = useState(false);

  // Yeni ürün formu
  const [ad, setAd] = useState('');
  const [miktar, setMiktar] = useState('1');
  const [birim, setBirim] = useState<Birim>('Adet');
  const [kategori, setKategori] = useState<Kategori>('Diğer');

  // Satın alınan ürünün son tüketim tarihi formu
  const [aktarilacakId, setAktarilacakId] =
    useState<string | null>(null);
  const [sonTarih, setSonTarih] = useState('');

  // Hızlı işlemlerde aynı ürünü iki kez aktarmayı önler.
  const aktarilanIdler = useRef<Set<string>>(new Set());

  // SQLite yazma işlemlerinin sıralı gerçekleşmesini sağlar.
  const kayitSirasi = useRef<Promise<void>>(Promise.resolve());

  // Alışveriş listesini cihazdan yükle.
  useEffect(() => {
    let aktif = true;

    async function listeyiYukle() {
      try {
        const kayit = await Storage.getItem(STORAGE_KEY);

        if (!aktif) return;

        if (kayit !== null) {
          const okunan: unknown = JSON.parse(kayit);
          setListe(listeyiDuzenle(okunan));
        }

        setYuklendi(true);
      } catch (hata) {
        if (!aktif) return;

        console.error('Alışveriş listesi okunamadı:', hata);
        setYuklemeHatasi(true);

        Alert.alert(
          'Veri hatası',
          'Alışveriş listesi okunamadı. Uygulamayı yeniden başlat.'
        );
      }
    }

    listeyiYukle();

    return () => {
      aktif = false;
    };
  }, []);

  // Alışveriş listesindeki değişiklikleri SQLite'a kaydet.
  useEffect(() => {
    if (!yuklendi) return;

    const kaydedilecek = JSON.stringify(liste);

    kayitSirasi.current = kayitSirasi.current
      .catch(() => {})
      .then(() => Storage.setItem(STORAGE_KEY, kaydedilecek));

    kayitSirasi.current.catch((hata) => {
      console.error('Alışveriş listesi kaydedilemedi:', hata);
      Alert.alert(
        'Kayıt hatası',
        'Alışveriş listesindeki değişiklik kaydedilemedi.'
      );
    });
  }, [liste, yuklendi]);

  // Alışveriş listesine yeni ürün ekle.
  const urunEkle = () => {
    if (!yuklendi) return;

    const temizAd = ad.trim();
    const duzenliMiktar = miktariDuzenle(miktar);

    if (!temizAd) {
      Alert.alert('Eksik bilgi', 'Lütfen ürün adı gir.');
      return;
    }

    if (duzenliMiktar === null) {
      Alert.alert(
        'Hatalı miktar',
        'Lütfen doğru formatta miktar giriniz. Örnek: 2 veya 2,5'
      );
      return;
    }

    // Aynı isimle ikinci bir alışveriş kaydı oluşturma.
    const ayniUrun = liste.some(
      (urun) => isimAnahtari(urun.ad) === isimAnahtari(temizAd)
    );

    if (ayniUrun) {
      Alert.alert(
        'Ürün zaten listede',
        'Bu isimle bir ürün zaten alışveriş listende bulunuyor.'
      );
      return;
    }

    const yeniUrun: AlisverisUrunu = {
      id: yeniId(),
      ad: temizAd,
      miktar: duzenliMiktar,
      birim,
      kategori,
    };

    setListe((onceki) => [...onceki, yeniUrun]);

    setAd('');
    setMiktar('1');
    setBirim('Adet');
    setKategori('Diğer');
  };

  // Yanlış eklenen ürünleri listeden kaldır.
  const urunSil = (urun: AlisverisUrunu) => {
    Alert.alert(
      'Listeden Kaldır',
      `${urun.ad} alışveriş listesinden kaldırılsın mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: () => {
            setListe((onceki) =>
              onceki.filter((item) => item.id !== urun.id)
            );

            if (aktarilacakId === urun.id) {
              setAktarilacakId(null);
              setSonTarih('');
            }
          },
        },
      ]
    );
  };

  // Satın aldım butonunun tarih alanını aç.
  const satinAlmayiBaslat = (urunId: string) => {
    if (aktarilacakId === urunId) {
      setAktarilacakId(null);
    } else {
      setAktarilacakId(urunId);
    }

    setSonTarih('');
  };

  // Ürünü alışveriş listesinden ana stoğa aktar.
  const stogaAktar = (urun: AlisverisUrunu) => {
    if (!yuklendi) return;

    const duzenliTarih = tarihiDuzenle(sonTarih);

    if (duzenliTarih === null) {
      Alert.alert(
        'Geçersiz tarih',
        'Lütfen son tüketim tarihini gir. Örnek: 25.10.2026'
      );
      return;
    }

    if (aktarilanIdler.current.has(urun.id)) return;

    aktarilanIdler.current.add(urun.id);

    try {
      // Yeni ürün ana ekranın stok listesine gönderilir.
      onStogaAktar({
        ad: urun.ad,
        miktar: urun.miktar,
        birim: urun.birim,
        kategori: urun.kategori,
        sonTarih: duzenliTarih,
      });

      // Stok listesine gönderilen ürünü alışverişten çıkar.
      setListe((onceki) =>
        onceki.filter((item) => item.id !== urun.id)
      );

      setAktarilacakId(null);
      setSonTarih('');

      Alert.alert(
        'Stoğa eklendi',
        `${urun.ad} stok listene aktarıldı.`
      );
    } catch (hata) {
      aktarilanIdler.current.delete(urun.id);

      console.error('Ürün stoğa aktarılamadı:', hata);
      Alert.alert('Hata', 'Ürün stoğa aktarılamadı.');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Alışveriş Listem
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>🛒 Alışveriş Planım</Text>

          <Text style={styles.subtitle}>
            İhtiyacın olan ürünleri planla, satın aldıklarını
            doğrudan stoğuna ekle.
          </Text>

          <View style={styles.countBox}>
            <Text style={styles.countNumber}>
              {liste.length}
            </Text>
            <Text style={styles.countLabel}>
              Alınacak ürün
            </Text>
          </View>

          <Text style={styles.sectionTitle}>
            Listeye Ürün Ekle
          </Text>

          <Text style={styles.label}>Ürün Adı</Text>
          <TextInput
            style={styles.input}
            placeholder="Örn: Süt"
            value={ad}
            onChangeText={setAd}
            maxLength={80}
          />

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
                  styles.chip,
                  birim === item && styles.chipActive,
                ]}
                onPress={() => setBirim(item)}
              >
                <Text
                  style={[
                    styles.chipText,
                    birim === item && styles.chipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

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
                  styles.chip,
                  kategori === item && styles.chipActive,
                ]}
                onPress={() => setKategori(item)}
              >
                <Text
                  style={[
                    styles.chipText,
                    kategori === item && styles.chipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.addButton,
              !yuklendi && styles.disabledButton,
            ]}
            onPress={urunEkle}
            disabled={!yuklendi}
          >
            <Text style={styles.addButtonText}>
              + Alışveriş Listesine Ekle
            </Text>
          </TouchableOpacity>

          <Text style={styles.sectionTitle}>
            Alınacak Ürünler ({liste.length})
          </Text>

          {!yuklendi ? (
            <Text style={styles.emptyText}>
              {yuklemeHatasi
                ? 'Liste okunamadı. Uygulamayı yeniden başlat.'
                : 'Alışveriş listesi yükleniyor...'}
            </Text>
          ) : liste.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>
                🧺 Alışveriş listen boş
              </Text>
              <Text style={styles.emptyText}>
                İhtiyacın olan ürünleri yukarıdan ekleyebilirsin.
              </Text>
            </View>
          ) : (
            liste.map((urun) => {
              const stoktaSayisi = stokUrunleri.filter(
                (item) =>
                  isimAnahtari(item.ad) === isimAnahtari(urun.ad)
              ).length;

              return (
                <View key={urun.id} style={styles.productCard}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productName}>
                      {urun.ad}
                    </Text>

                    <Text style={styles.productQuantity}>
                      {miktariGoster(urun.miktar)} {urun.birim}
                    </Text>
                  </View>

                  <Text style={styles.categoryText}>
                    {urun.kategori}
                  </Text>

                  {stoktaSayisi > 0 && (
                    <Text style={styles.stockWarning}>
                      ℹ️ Stokta aynı isimli {stoktaSayisi} ürün kaydı var.
                    </Text>
                  )}

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.purchasedButton,
                      ]}
                      onPress={() => satinAlmayiBaslat(urun.id)}
                    >
                      <Text style={styles.purchasedText}>
                        ✓ Satın Aldım
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.deleteButton,
                      ]}
                      onPress={() => urunSil(urun)}
                    >
                      <Text style={styles.deleteText}>
                        Sil
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {aktarilacakId === urun.id && (
                    <View style={styles.transferBox}>
                      <Text style={styles.transferTitle}>
                        Stoğa Aktar
                      </Text>

                      <Text style={styles.transferDescription}>
                        Satın aldığın ürünün son tüketim tarihini gir.
                      </Text>

                      <TextInput
                        style={styles.input}
                        placeholder="GG.AA.YYYY"
                        value={sonTarih}
                        onChangeText={setSonTarih}
                      />

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.cancelButton,
                          ]}
                          onPress={() => {
                            setAktarilacakId(null);
                            setSonTarih('');
                          }}
                        >
                          <Text style={styles.cancelText}>
                            İptal
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.transferButton,
                          ]}
                          onPress={() => stogaAktar(urun)}
                        >
                          <Text style={styles.transferText}>
                            Stoğa Ekle
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}

          <Text style={styles.footer}>
            🌿 Önce planla, sonra al. Gereksiz alışverişi azalt.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FAF5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderBottomWidth: 1,
    borderBottomColor: '#E1EBE3',
  },
  backText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#247A43',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#222222',
  },
  content: {
    padding: 20,
    paddingBottom: 45,
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#247A43',
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#666666',
  },
  countBox: {
    backgroundColor: '#E5F4E9',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  countNumber: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#247A43',
  },
  countLabel: {
    fontSize: 14,
    color: '#39734A',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 15,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8E0D8',
    borderRadius: 10,
    padding: 14,
    color: '#222222',
    fontSize: 16,
  },
  optionsRow: {
    gap: 8,
    paddingVertical: 3,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D5DDD5',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: '#247A43',
    borderColor: '#247A43',
  },
  chipText: {
    fontSize: 14,
    color: '#444444',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#247A43',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#A5C2AB',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EBE3',
    borderRadius: 12,
    padding: 22,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#333333',
    fontSize: 17,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#777777',
    textAlign: 'center',
    lineHeight: 21,
    fontSize: 14,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DAE6DC',
    borderRadius: 12,
    padding: 16,
    gap: 9,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222222',
    flexShrink: 1,
  },
  productQuantity: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#247A43',
  },
  categoryText: {
    fontSize: 14,
    color: '#666666',
  },
  stockWarning: {
    fontSize: 13,
    lineHeight: 20,
    color: '#9A6413',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 5,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 9,
  },
  purchasedButton: {
    backgroundColor: '#E2F4E7',
  },
  purchasedText: {
    color: '#247A43',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FCE5E3',
    flex: 0.45,
  },
  deleteText: {
    color: '#B42318',
    fontWeight: 'bold',
  },
  transferBox: {
    backgroundColor: '#F2F9F3',
    padding: 13,
    borderRadius: 10,
    gap: 10,
    marginTop: 7,
  },
  transferTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#247A43',
  },
  transferDescription: {
    fontSize: 13,
    color: '#666666',
  },
  cancelButton: {
    backgroundColor: '#E6E6E6',
  },
  cancelText: {
    color: '#444444',
    fontWeight: 'bold',
  },
  transferButton: {
    backgroundColor: '#247A43',
  },
  transferText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  footer: {
    textAlign: 'center',
    color: '#247A43',
    fontSize: 13,
    marginTop: 16,
  },
});
