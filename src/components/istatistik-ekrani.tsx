
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Ana ekrandan gelen ürünlerin veri yapısı
type UrunVerisi = {
  id: string;
  ad: string;
  sonTarih: string;
  kategori: string;
  miktar: number;
  birim: string;
};

// İşlem geçmişi veri yapısı
type GecmisVerisi = UrunVerisi & {
  kayitId: string;
  islem: 'tuketildi' | 'israf';
  islemTarihi: string;
};

// Bileşenin dışarıdan alacağı bilgiler
type Props = {
  visible: boolean;
  onClose: () => void;
  urunler: UrunVerisi[];
  gecmis: GecmisVerisi[];
};

// Tek bir istatistik kutusu
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
      <Text style={[styles.summaryNumber, { color: renk }]}>
        {sayi}
      </Text>
      <Text style={styles.summaryLabel}>{baslik}</Text>
    </View>
  );
}

// Ana istatistik ekranı
export function IstatistikEkrani({
  visible,
  onClose,
  urunler,
  gecmis,
}: Props) {

  // Tüketilen ürün kayıtlarının sayısı
  const tuketilenSayisi = gecmis.filter(
    (kayit) => kayit.islem === 'tuketildi'
  ).length;

  // İsraf edilen ürün kayıtlarının sayısı
  const israfSayisi = gecmis.filter(
    (kayit) => kayit.islem === 'israf'
  ).length;

  const tamamlananSayisi = gecmis.length;

  // Tamamlanan kayıtlar içindeki israf yüzdesi
  const israfOrani =
    tamamlananSayisi === 0
      ? 0
      : Math.round(
          (israfSayisi / tamamlananSayisi) * 100
        );

  // Son 7 güne ait işlemleri bul
  const simdi = Date.now();
  const yediGunOnce =
    simdi - 7 * 24 * 60 * 60 * 1000;

  const sonYediGun = gecmis.filter((kayit) => {
    const zaman = new Date(kayit.islemTarihi).getTime();

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

  // Kategorilere göre sonuçları grupla
  const kategoriHaritasi = new Map<
    string,
    {
      kategori: string;
      tuketilen: number;
      israf: number;
    }
  >();

  gecmis.forEach((kayit) => {
    const kategori = kayit.kategori || 'Diğer';

    if (!kategoriHaritasi.has(kategori)) {
      kategoriHaritasi.set(kategori, {
        kategori,
        tuketilen: 0,
        israf: 0,
      });
    }

    const bilgi = kategoriHaritasi.get(kategori)!;

    if (kayit.islem === 'israf') {
      bilgi.israf += 1;
    } else {
      bilgi.tuketilen += 1;
    }
  });

  // En çok israf yapılan kategoriler önce gelsin
  const kategoriIstatistikleri = Array.from(
    kategoriHaritasi.values()
  ).sort(
    (a, b) =>
      b.israf - a.israf ||
      a.kategori.localeCompare(b.kategori, 'tr')
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>

        {/* Üst başlık ve geri butonu */}
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
            Tüketim ve israf alışkanlıklarını takip et.
          </Text>

          {/* Genel durum */}
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

          {/* İsraf oranı */}
          <View style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.cardTitle}>
                İsraf Oranı
              </Text>

              <Text style={styles.percentage}>
                %{israfOrani}
              </Text>
            </View>

            {tamamlananSayisi > 0 ? (
              <>
                <View style={styles.progressBar}>
                  {tuketilenSayisi > 0 && (
                    <View
                      style={[
                        styles.greenBar,
                        { flex: tuketilenSayisi },
                      ]}
                    />
                  )}

                  {israfSayisi > 0 && (
                    <View
                      style={[
                        styles.redBar,
                        { flex: israfSayisi },
                      ]}
                    />
                  )}
                </View>

                <View style={styles.legendRow}>
                  <Text style={styles.legendGreen}>
                    ● Tüketilen: {tuketilenSayisi}
                  </Text>

                  <Text style={styles.legendRed}>
                    ● İsraf: {israfSayisi}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>
                Henüz tüketim veya israf kaydı bulunmuyor.
              </Text>
            )}

            <Text style={styles.explanation}>
              Oran, tamamlanan ürün kayıtları üzerinden
              hesaplanır. Miktar veya ağırlık oranı değildir.
            </Text>
          </View>

          {/* Kategori istatistikleri */}
          <Text style={styles.sectionTitle}>
            Kategori Bazında İsraf
          </Text>

          {kategoriIstatistikleri.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>
                Kategori analizi için henüz yeterli
                işlem kaydı bulunmuyor.
              </Text>
            </View>
          ) : (
            kategoriIstatistikleri.map((bilgi) => {
              const toplam =
                bilgi.tuketilen + bilgi.israf;

              const oran = Math.round(
                (bilgi.israf / toplam) * 100
              );

              return (
                <View
                  key={bilgi.kategori}
                  style={styles.card}
                >
                  <View style={styles.titleRow}>
                    <Text style={styles.categoryName}>
                      {bilgi.kategori}
                    </Text>

                    <Text style={styles.categoryPercent}>
                      %{oran}
                    </Text>
                  </View>

                  <View style={styles.categoryProgress}>
                    {oran > 0 && (
                      <View
                        style={[
                          styles.categoryProgressFill,
                          {
                            width:
                              `${oran}%` as `${number}%`,
                          },
                        ]}
                      />
                    )}
                  </View>

                  <Text style={styles.categoryDetail}>
                    {bilgi.tuketilen} tüketilen ·
                    {' '}{bilgi.israf} israf
                  </Text>
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
                  Tüketilen kayıt
                </Text>
              </View>

              <View style={styles.weekItem}>
                <Text style={styles.weekRed}>
                  {haftalikIsraf}
                </Text>
                <Text style={styles.weekLabel}>
                  İsraf kaydı
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.footer}>
            🌿 Küçük adımlarla büyük israfı önleyebiliriz.
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3EBE4',
    gap: 18,
  },
  backButton: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: 16,
    color: '#247A43',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#222222',
  },
  content: {
    padding: 20,
    paddingBottom: 45,
    gap: 15,
  },
  title: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#247A43',
  },
  subtitle: {
    fontSize: 15,
    color: '#777777',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 12,
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
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 27,
    fontWeight: 'bold',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#777777',
    marginTop: 7,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E3EBE4',
    gap: 13,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333333',
  },
  percentage: {
    fontSize: 27,
    fontWeight: 'bold',
    color: '#B42318',
  },
  progressBar: {
    flexDirection: 'row',
    height: 15,
    borderRadius: 12,
    backgroundColor: '#E9ECE9',
    overflow: 'hidden',
  },
  greenBar: {
    backgroundColor: '#29965A',
  },
  redBar: {
    backgroundColor: '#D94A45',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  legendGreen: {
    fontSize: 12,
    color: '#247A43',
  },
  legendRed: {
    fontSize: 12,
    color: '#B42318',
  },
  explanation: {
    fontSize: 12,
    lineHeight: 18,
    color: '#777777',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flexShrink: 1,
  },
  categoryPercent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B42318',
  },
  categoryProgress: {
    backgroundColor: '#E9ECE9',
    height: 11,
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    backgroundColor: '#D94A45',
    height: '100%',
    borderRadius: 8,
  },
  categoryDetail: {
    fontSize: 13,
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
    gap: 7,
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
    lineHeight: 21,
    color: '#777777',
    textAlign: 'center',
    paddingVertical: 8,
  },
  footer: {
    color: '#247A43',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 10,
  },
});
