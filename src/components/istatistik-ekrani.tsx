
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type UrunVerisi = {
  id: string;
  ad: string;
  sonTarih: string;
  kategori: string;
  miktar: number;
  birim: string;
};

type GecmisVerisi = UrunVerisi & {
  kayitId: string;
  islem: 'tuketildi' | 'israf';
  islemTarihi: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  urunler: UrunVerisi[];
  gecmis: GecmisVerisi[];
};

// Farklı ölçü birimlerini birbirine karıştırmıyoruz.
type OlcuGrubu = 'adet' | 'agirlik' | 'hacim';

type MiktarToplami = {
  tuketilen: number;
  israf: number;
};

type KategoriMiktari = MiktarToplami & {
  kategori: string;
  grup: OlcuGrubu;
};

const OLCU_GRUPLARI: OlcuGrubu[] = [
  'adet',
  'agirlik',
  'hacim',
];

const GRUP_ADLARI: Record<OlcuGrubu, string> = {
  adet: 'Adet',
  agirlik: 'Ağırlık',
  hacim: 'Hacim',
};

// Sayıları Türkçe biçimde göster.
// Örnek: 1.5 -> 1,5
function sayiGoster(
  sayi: number,
  basamak = 3
): string {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: basamak,
  }).format(sayi);
}

// Birimleri ortak ölçüye dönüştür.
// kg -> g
// L -> mL
function olcuyuDonustur(
  miktar: number,
  birim: string
): { grup: OlcuGrubu; deger: number } | null {
  if (!Number.isFinite(miktar) || miktar <= 0) {
    return null;
  }

  switch (birim) {
    case 'Adet':
      return { grup: 'adet', deger: miktar };

    case 'g':
      return { grup: 'agirlik', deger: miktar };

    case 'kg':
      return { grup: 'agirlik', deger: miktar * 1000 };

    case 'mL':
      return { grup: 'hacim', deger: miktar };

    case 'L':
      return { grup: 'hacim', deger: miktar * 1000 };

    default:
      return null;
  }
}

// Sonucu kullanıcıya okunabilir birimle göster.
function miktarGoster(
  deger: number,
  grup: OlcuGrubu
): string {
  if (grup === 'adet') {
    return `${sayiGoster(deger)} Adet`;
  }

  if (grup === 'agirlik') {
    if (deger >= 1000) {
      return `${sayiGoster(deger / 1000)} kg`;
    }

    return `${sayiGoster(deger)} g`;
  }

  if (deger >= 1000) {
    return `${sayiGoster(deger / 1000)} L`;
  }

  return `${sayiGoster(deger)} mL`;
}

// Tüketilen + israf edilen miktar içindeki israf payı
function israfYuzdesi(
  tuketilen: number,
  israf: number
): number | null {
  const toplam = tuketilen + israf;

  if (toplam <= 0) return null;

  return Math.round((israf / toplam) * 10000) / 100;
}

// Yeşil-kırmızı oran çubuğu
function OranCubugu({
  tuketilen,
  israf,
}: MiktarToplami) {
  return (
    <View style={styles.progressBar}>
      {tuketilen > 0 && (
        <View
          style={[
            styles.greenBar,
            { flex: tuketilen },
          ]}
        />
      )}

      {israf > 0 && (
        <View
          style={[
            styles.redBar,
            { flex: israf },
          ]}
        />
      )}
    </View>
  );
}

// Küçük özet kartı
function OzetKutusu({
  baslik,
  sayi,
  renk,
}: {
  baslik: string;
  sayi: number;
  renk: string;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text
        style={[
          styles.summaryNumber,
          { color: renk },
        ]}
      >
        {sayi}
      </Text>

      <Text style={styles.summaryLabel}>
        {baslik}
      </Text>
    </View>
  );
}

export function IstatistikEkrani({
  visible,
  onClose,
  urunler,
  gecmis,
}: Props) {
  // 1. İşlem sayıları
  const tuketilenSayisi = gecmis.filter(
    (kayit) => kayit.islem === 'tuketildi'
  ).length;

  const israfSayisi = gecmis.filter(
    (kayit) => kayit.islem === 'israf'
  ).length;

  const kayitSayisi = gecmis.length;

  const kayitOrani = israfYuzdesi(
    tuketilenSayisi,
    israfSayisi
  );

  // 2. Ölçü grubuna göre miktar toplamları
  const miktarToplamlari: Record<
    OlcuGrubu,
    MiktarToplami
  > = {
    adet: { tuketilen: 0, israf: 0 },
    agirlik: { tuketilen: 0, israf: 0 },
    hacim: { tuketilen: 0, israf: 0 },
  };

  // 3. Kategori ve ölçü grubuna göre miktarlar
  const kategoriMiktarHaritasi =
    new Map<string, KategoriMiktari>();

  // Eski kategori bazlı işlem sayısı istatistikleri
  const kategoriSayimHaritasi = new Map<
    string,
    MiktarToplami
  >();

  for (const kayit of gecmis) {
    const kategori = kayit.kategori || 'Diğer';
    const israfMi = kayit.islem === 'israf';

    // İşlem sayısını kaydet.
    const sayim = kategoriSayimHaritasi.get(kategori)
      ?? { tuketilen: 0, israf: 0 };

    if (israfMi) {
      sayim.israf += 1;
    } else {
      sayim.tuketilen += 1;
    }

    kategoriSayimHaritasi.set(kategori, sayim);

    // Miktarı uygun standart birime dönüştür.
    const olcu = olcuyuDonustur(
      kayit.miktar,
      kayit.birim
    );

    if (olcu === null) continue;

    // Genel miktar toplamlarını güncelle.
    if (israfMi) {
      miktarToplamlari[olcu.grup].israf += olcu.deger;
    } else {
      miktarToplamlari[olcu.grup].tuketilen += olcu.deger;
    }

    // Her kategori ve ölçü grubu ayrı saklanır.
    const anahtar = `${kategori}|${olcu.grup}`;

    const mevcut = kategoriMiktarHaritasi.get(anahtar)
      ?? {
        kategori,
        grup: olcu.grup,
        tuketilen: 0,
        israf: 0,
      };

    if (israfMi) {
      mevcut.israf += olcu.deger;
    } else {
      mevcut.tuketilen += olcu.deger;
    }

    kategoriMiktarHaritasi.set(anahtar, mevcut);
  }

  const kategoriSayimlari = Array.from(
    kategoriSayimHaritasi.entries()
  ).sort((a, b) => a[0].localeCompare(b[0], 'tr'));

  const kategoriMiktarlari = Array.from(
    kategoriMiktarHaritasi.values()
  ).sort((a, b) => {
    const kategoriFarki =
      a.kategori.localeCompare(b.kategori, 'tr');

    if (kategoriFarki !== 0) return kategoriFarki;

    return (
      OLCU_GRUPLARI.indexOf(a.grup) -
      OLCU_GRUPLARI.indexOf(b.grup)
    );
  });

  // 4. Son 7 günün işlem sayıları
  const simdi = Date.now();
  const yediGunOnce = simdi - 7 * 24 * 60 * 60 * 1000;

  const sonYediGun = gecmis.filter((kayit) => {
    const zaman = new Date(
      kayit.islemTarihi
    ).getTime();

    return (
      Number.isFinite(zaman) &&
      zaman >= yediGunOnce &&
      zaman <= simdi
    );
  });

  const haftalikTuketilen = sonYediGun.filter(
    (kayit) => kayit.islem === 'tuketildi'
  ).length;

  const haftalikIsraf = sonYediGun.filter(
    (kayit) => kayit.islem === 'israf'
  ).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>

        {/* Üst menü */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ← Geri
            </Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            İstatistikler
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
        >
          <Text style={styles.title}>
            📊 İsraf Analizim
          </Text>

          <Text style={styles.subtitle}>
            Ne kadar tükettiğini ve ne kadar israf
            ettiğini incele.
          </Text>

          {/* Genel Durum */}
          <Text style={styles.sectionTitle}>
            Genel Durum
          </Text>

          <View style={styles.summaryRow}>
            <OzetKutusu
              baslik="Stokta"
              sayi={urunler.length}
              renk="#333333"
            />

            <OzetKutusu
              baslik="Tüketilen"
              sayi={tuketilenSayisi}
              renk="#247A43"
            />

            <OzetKutusu
              baslik="İsraf"
              sayi={israfSayisi}
              renk="#B42318"
            />
          </View>

          {/* İşlem sayısına göre israf oranı */}
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>
                İşlem Sayısına Göre İsraf
              </Text>

              <Text style={styles.percentage}>
                {kayitOrani === null
                  ? '—'
                  : `%${sayiGoster(kayitOrani, 2)}`}
              </Text>
            </View>

            {kayitSayisi > 0 ? (
              <>
                <OranCubugu
                  tuketilen={tuketilenSayisi}
                  israf={israfSayisi}
                />

                <Text style={styles.detail}>
                  {tuketilenSayisi} tüketim işlemi ·
                  {' '}{israfSayisi} israf işlemi
                </Text>
              </>
            ) : (
              <Text style={styles.emptyText}>
                Henüz işlem geçmişi bulunmuyor.
              </Text>
            )}

            <Text style={styles.note}>
              Bu oran miktara değil, işlem sayısına göre
              hesaplanır.
            </Text>
          </View>

          {/* YENİ: Miktar bazlı israf */}
          <Text style={styles.sectionTitle}>
            Miktar Bazlı İsraf
          </Text>

          <Text style={styles.sectionDescription}>
            Adet, ağırlık ve hacim ayrı hesaplanır.
            Stokta bekleyen ürünler bu oranlara dahil değildir.
          </Text>

          {OLCU_GRUPLARI.map((grup) => {
            const toplamlar = miktarToplamlari[grup];

            const oran = israfYuzdesi(
              toplamlar.tuketilen,
              toplamlar.israf
            );

            return (
              <View key={grup} style={styles.card}>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle}>
                    {GRUP_ADLARI[grup]}
                  </Text>

                  <Text style={styles.percentage}>
                    {oran === null
                      ? '—'
                      : `%${sayiGoster(oran, 2)}`}
                  </Text>
                </View>

                <View style={styles.amountRow}>
                  <View style={styles.amountBox}>
                    <Text style={styles.greenLabel}>
                      Tüketilen
                    </Text>

                    <Text style={styles.amountValue}>
                      {miktarGoster(
                        toplamlar.tuketilen,
                        grup
                      )}
                    </Text>
                  </View>

                  <View style={styles.amountBox}>
                    <Text style={styles.redLabel}>
                      İsraf
                    </Text>

                    <Text style={styles.amountValue}>
                      {miktarGoster(
                        toplamlar.israf,
                        grup
                      )}
                    </Text>
                  </View>
                </View>

                <OranCubugu
                  tuketilen={toplamlar.tuketilen}
                  israf={toplamlar.israf}
                />

                <Text style={styles.note}>
                  {oran === null
                    ? 'Bu ölçü grubunda henüz işlem yok.'
                    : 'İşlenen toplam miktar içindeki israf payı.'}
                </Text>
              </View>
            );
          })}

          {/* Mevcut kategori bazlı kayıt sayıları */}
          <Text style={styles.sectionTitle}>
            Kategori Bazında İşlem Sayısı
          </Text>

          {kategoriSayimlari.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>
                Henüz kategori istatistiği yok.
              </Text>
            </View>
          ) : (
            kategoriSayimlari.map(([kategori, sayim]) => {
              const oran = israfYuzdesi(
                sayim.tuketilen,
                sayim.israf
              );

              return (
                <View key={kategori} style={styles.card}>
                  <View style={styles.titleRow}>
                    <Text style={styles.categoryName}>
                      {kategori}
                    </Text>

                    <Text style={styles.categoryPercent}>
                      %{sayiGoster(oran ?? 0, 2)}
                    </Text>
                  </View>

                  <OranCubugu
                    tuketilen={sayim.tuketilen}
                    israf={sayim.israf}
                  />

                  <Text style={styles.detail}>
                    {sayim.tuketilen} tüketim ·
                    {' '}{sayim.israf} israf işlemi
                  </Text>
                </View>
              );
            })
          )}

          {/* YENİ: Kategori bazlı gerçek miktarlar */}
          <Text style={styles.sectionTitle}>
            Kategori Bazında Miktarlar
          </Text>

          {kategoriMiktarlari.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>
                Henüz miktar istatistiği bulunmuyor.
              </Text>
            </View>
          ) : (
            kategoriMiktarlari.map((bilgi) => {
              const oran = israfYuzdesi(
                bilgi.tuketilen,
                bilgi.israf
              );

              return (
                <View
                  key={`${bilgi.kategori}-${bilgi.grup}`}
                  style={styles.card}
                >
                  <View style={styles.titleRow}>
                    <Text style={styles.categoryName}>
                      {bilgi.kategori}
                    </Text>

                    <Text style={styles.categoryPercent}>
                      %{sayiGoster(oran ?? 0, 2)}
                    </Text>
                  </View>

                  <Text style={styles.unitLabel}>
                    {GRUP_ADLARI[bilgi.grup]}
                  </Text>

                  <View style={styles.amountRow}>
                    <View style={styles.amountBox}>
                      <Text style={styles.greenLabel}>
                        Tüketilen
                      </Text>

                      <Text style={styles.amountValue}>
                        {miktarGoster(
                          bilgi.tuketilen,
                          bilgi.grup
                        )}
                      </Text>
                    </View>

                    <View style={styles.amountBox}>
                      <Text style={styles.redLabel}>
                        İsraf
                      </Text>

                      <Text style={styles.amountValue}>
                        {miktarGoster(
                          bilgi.israf,
                          bilgi.grup
                        )}
                      </Text>
                    </View>
                  </View>

                  <OranCubugu
                    tuketilen={bilgi.tuketilen}
                    israf={bilgi.israf}
                  />
                </View>
              );
            })
          )}

          {/* Son 7 gün */}
          <Text style={styles.sectionTitle}>
            Son 7 Gün
          </Text>

          <View style={styles.card}>
            <View style={styles.weekRow}>
              <View style={styles.weekItem}>
                <Text style={styles.weekGreen}>
                  {haftalikTuketilen}
                </Text>

                <Text style={styles.weekLabel}>
                  Tüketim işlemi
                </Text>
              </View>

              <View style={styles.weekItem}>
                <Text style={styles.weekRed}>
                  {haftalikIsraf}
                </Text>

                <Text style={styles.weekLabel}>
                  İsraf işlemi
                </Text>
              </View>
            </View>

            <Text style={styles.note}>
              Son 168 saat içindeki işlem kayıtları.
            </Text>
          </View>

          <Text style={styles.footer}>
            🌿 Ölç, takip et, israfı azalt.
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
    gap: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EBE4',
  },
  backButton: {
    paddingVertical: 4,
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
    gap: 14,
  },
  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#247A43',
  },
  subtitle: {
    fontSize: 15,
    color: '#777777',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 15,
  },
  sectionDescription: {
    fontSize: 13,
    lineHeight: 20,
    color: '#777777',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 9,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3EBE4',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#777777',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3EBE4',
    borderRadius: 12,
    padding: 17,
    gap: 13,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 9,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    flexShrink: 1,
  },
  percentage: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#B42318',
  },
  progressBar: {
    flexDirection: 'row',
    height: 13,
    borderRadius: 10,
    backgroundColor: '#EBEEEC',
    overflow: 'hidden',
  },
  greenBar: {
    backgroundColor: '#29965A',
  },
  redBar: {
    backgroundColor: '#D94A45',
  },
  amountRow: {
    flexDirection: 'row',
    gap: 10,
  },
  amountBox: {
    flex: 1,
    backgroundColor: '#F6F8F6',
    borderRadius: 10,
    padding: 12,
    gap: 7,
  },
  amountValue: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222222',
  },
  greenLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#247A43',
  },
  redLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#B42318',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    flexShrink: 1,
  },
  categoryPercent: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#B42318',
  },
  unitLabel: {
    fontSize: 12,
    color: '#777777',
  },
  detail: {
    fontSize: 13,
    color: '#666666',
  },
  note: {
    fontSize: 12,
    lineHeight: 18,
    color: '#777777',
  },
  weekRow: {
    flexDirection: 'row',
    gap: 12,
  },
  weekItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    gap: 6,
  },
  weekGreen: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#247A43',
  },
  weekRed: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#B42318',
  },
  weekLabel: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#777777',
    textAlign: 'center',
    paddingVertical: 8,
    lineHeight: 20,
  },
  footer: {
    fontSize: 13,
    color: '#247A43',
    textAlign: 'center',
    marginTop: 12,
  },
});
