
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

type UrunBilgisi = {
  id: string;
  ad: string;
  sonTarih: string;
};

type GecmisBilgisi = {
  islem: 'tuketildi' | 'israf';
};

type Props = {
  urunler: UrunBilgisi[];
  gecmis: GecmisBilgisi[];
  kalanGun: (tarih: string) => number | null;
};

export function AnaSayfaOzeti({
  urunler,
  gecmis,
  kalanGun,
}: Props) {
  // Her ürünün son tüketim tarihine kaç gün kaldığını bul.
  const durumlar = urunler.map((urun) => ({
    urun,
    gun: kalanGun(urun.sonTarih),
  }));

  const yaklasan = durumlar.filter(
    (item) =>
      item.gun !== null &&
      item.gun >= 0 &&
      item.gun <= 3
  ).length;

  const gecen = durumlar.filter(
    (item) => item.gun !== null && item.gun < 0
  ).length;

  const guvenli = durumlar.filter(
    (item) => item.gun !== null && item.gun > 3
  ).length;

  const israfSayisi = gecmis.filter(
    (kayit) => kayit.islem === 'israf'
  ).length;

  const guvenliOran =
    urunler.length > 0
      ? Math.round((guvenli / urunler.length) * 100)
      : 0;

  // Süresi geçmiş veya yaklaşan ilk üç ürünü göster.
  const dikkatGerektirenler = durumlar
    .filter(
      (item) => item.gun !== null && item.gun <= 3
    )
    .sort((a, b) => (a.gun ?? 0) - (b.gun ?? 0))
    .slice(0, 3);

  return (
    <View style={styles.container}>
      {/* Üst karşılama kartı */}
      <View style={styles.hero}>
        <View style={styles.decorativeCircle} />

        <Text style={styles.brand}>
          🌿 İsrafEtme
        </Text>

        <Text style={styles.heroTitle}>
          Gıdanı koru,{'\n'}israfı azalt.
        </Text>

        <Text style={styles.heroSubtitle}>
          Stok durumunu tek bakışta gör ve
          son tüketim tarihlerini takip et.
        </Text>

        <View style={styles.progressCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.progressLabel}>
              Stok güvenliği
            </Text>

            <Text style={styles.progressPercent}>
              %{guvenliOran}
            </Text>
          </View>

          <View style={styles.progressBackground}>
            <View
              style={[
                styles.progressFill,
                { width: `${guvenliOran}%` },
              ]}
            />
          </View>

          <Text style={styles.progressNote}>
            {urunler.length === 0
              ? 'Henüz stokta ürün bulunmuyor.'
              : `${guvenli} ürünün son tüketim tarihine 4 günden fazla var.`}
          </Text>
        </View>
      </View>

      {/* Dört istatistik kartı */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>📦</Text>
          <Text style={styles.statNumber}>
            {urunler.length}
          </Text>
          <Text style={styles.statLabel}>
            Stoktaki Ürün
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⏰</Text>
          <Text
            style={[
              styles.statNumber,
              styles.orange,
            ]}
          >
            {yaklasan}
          </Text>
          <Text style={styles.statLabel}>
            Yaklaşan Tarih
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>⚠️</Text>
          <Text
            style={[
              styles.statNumber,
              styles.red,
            ]}
          >
            {gecen}
          </Text>
          <Text style={styles.statLabel}>
            Süresi Geçmiş
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🗑️</Text>
          <Text style={styles.statNumber}>
            {israfSayisi}
          </Text>
          <Text style={styles.statLabel}>
            İsraf İşlemi
          </Text>
        </View>
      </View>

      {/* Acil ürün özeti */}
      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>
          ⚠️ Dikkat Gerektiren Ürünler
        </Text>

        {dikkatGerektirenler.length === 0 ? (
          <Text style={styles.emptyText}>
            Şu anda son tüketim tarihi yaklaşan
            veya geçmiş ürün bulunmuyor.
          </Text>
        ) : (
          dikkatGerektirenler.map((item) => {
            const gun = item.gun ?? 0;

            const durum =
              gun < 0
                ? `${Math.abs(gun)} gün geçti`
                : gun === 0
                  ? 'Bugün son gün'
                  : `${gun} gün kaldı`;

            return (
              <View
                key={item.urun.id}
                style={styles.warningRow}
              >
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>
                    {item.urun.ad}
                  </Text>

                  <Text style={styles.productDate}>
                    {item.urun.sonTarih
                      .split('-')
                      .reverse()
                      .join('.')}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    gun < 0
                      ? styles.expiredBadge
                      : styles.urgentBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      gun < 0
                        ? styles.expiredText
                        : styles.urgentText,
                    ]}
                  >
                    {durum}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
    marginBottom: 22,
  },
  hero: {
    backgroundColor: '#123C2D',
    padding: 22,
    borderRadius: 22,
    overflow: 'hidden',
    gap: 12,
  },
  decorativeCircle: {
    position: 'absolute',
    top: -65,
    right: -45,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 35,
    borderColor: '#245843',
  },
  brand: {
    color: '#BEE8CA',
    fontSize: 14,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '800',
    lineHeight: 35,
  },
  heroSubtitle: {
    color: '#D0E7D9',
    fontSize: 14,
    lineHeight: 22,
  },
  progressCard: {
    backgroundColor: '#255742',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginTop: 5,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabel: {
    color: '#E7F5EC',
    fontSize: 13,
  },
  progressPercent: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: 'bold',
  },
  progressBackground: {
    height: 9,
    borderRadius: 10,
    backgroundColor: '#477765',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#A8E2BB',
    borderRadius: 10,
  },
  progressNote: {
    color: '#D0E7D9',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2ECE5',
    borderRadius: 16,
    padding: 17,
    gap: 7,
  },
  statIcon: {
    fontSize: 22,
  },
  statNumber: {
    fontSize: 30,
    fontWeight: '800',
    color: '#226343',
  },
  statLabel: {
    fontSize: 12,
    color: '#647268',
    fontWeight: '600',
  },
  orange: {
    color: '#C18123',
  },
  red: {
    color: '#C34842',
  },
  warningCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2ECE5',
    padding: 17,
    gap: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#273C30',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F2F0',
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#263C2D',
  },
  productDate: {
    fontSize: 12,
    color: '#7A877E',
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
  },
  urgentBadge: {
    backgroundColor: '#FFF3DB',
  },
  expiredBadge: {
    backgroundColor: '#FFE6E3',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  urgentText: {
    color: '#A96D14',
  },
  expiredText: {
    color: '#B63B35',
  },
  emptyText: {
    color: '#607368',
    fontSize: 13,
    lineHeight: 21,
  },
});
