import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type OlcuGrubu = 'adet' | 'agirlik' | 'hacim';
type IslemTuru = 'tuketildi' | 'israf';

// Geniş tipler yerine yalnızca detay ekranının ihtiyaç duyduğu alanlar.
export type DetayUrun = {
  id: string;
  ad: string;
  kategori: string;
  sonTarih: string;
  miktar: number;
  birim: string;
  eklenmeTarihi?: string;
};

export type DetayHareketi = DetayUrun & {
  kayitId: string;
  islem: IslemTuru;
  islemTarihi: string;
};

type Props = {
  visible: boolean;
  urunId: string | null;
  urun: DetayUrun | null;
  gecmis: DetayHareketi[];
  kalanGun: (tarih: string) => number | null;
  onClose: () => void;
};

type OlcuMiktarlari = {
  tuketildi: number;
  israf: number;
};

const GRUP_ADLARI: Record<OlcuGrubu, string> = {
  adet: 'Adet',
  agirlik: 'Ağırlık',
  hacim: 'Hacim',
};

function sayiGoster(sayi: number) {
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 6,
  }).format(sayi);
}

function miktarGoster(miktar: number, birim: string): string {
  return `${sayiGoster(miktar)} ${birim}`;
}

function standartOlcu(miktar: number, birim: string): {
  grup: OlcuGrubu;
  deger: number;
} | null {
  if (!Number.isFinite(miktar) || miktar <= 0) return null;

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

function olcuGoster(deger: number, grup: OlcuGrubu): string {
  if (grup === 'adet') return miktarGoster(deger, 'Adet');
  if (grup === 'agirlik') {
    return deger >= 1000
      ? miktarGoster(deger / 1000, 'kg')
      : miktarGoster(deger, 'g');
  }
  return deger >= 1000
    ? miktarGoster(deger / 1000, 'L')
    : miktarGoster(deger, 'mL');
}

function tarihGoster(tarih: string): string {
  const eslesme = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tarih);
  return eslesme
    ? `${eslesme[3]}.${eslesme[2]}.${eslesme[1]}`
    : 'Bilinmiyor';
}

function tarihSaatGoster(iso: string): string {
  const zaman = new Date(iso);
  if (Number.isNaN(zaman.getTime())) return 'Bilinmiyor';
  return zaman.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sonTarihDurumu(gun: number | null): string {
  if (gun === null) return 'Tarih doğrulanamadı';
  if (gun < 0) return `${Math.abs(gun)} gün önce geçti`;
  if (gun === 0) return 'Bugün son gün';
  return `${gun} gün kaldı`;
}

export function UrunDetayEkrani({
  visible,
  urunId,
  urun,
  gecmis,
  kalanGun,
  onClose,
}: Props) {
  // id ile eşleştiriyoruz: aynı adla eklenen iki ürünün geçmişi karışmaz.
  const hareketler = urunId === null
    ? []
    : gecmis
        .filter((kayit) => kayit.id === urunId)
        .sort(
          (a, b) =>
            new Date(b.islemTarihi).getTime() -
            new Date(a.islemTarihi).getTime()
        );

  // Tamamen bitmiş ürünler için son geçmiş kaydını referans al.
  const bilgi = urun ?? hareketler[0] ?? null;
  const olcuToplamlari: Record<OlcuGrubu, OlcuMiktarlari> = {
    adet: { tuketildi: 0, israf: 0 },
    agirlik: { tuketildi: 0, israf: 0 },
    hacim: { tuketildi: 0, israf: 0 },
  };

  for (const kayit of hareketler) {
    const olcu = standartOlcu(kayit.miktar, kayit.birim);
    if (olcu === null) continue;
    olcuToplamlari[olcu.grup][kayit.islem] += olcu.deger;
  }

  const gruplar = (['adet', 'agirlik', 'hacim'] as const).filter(
    (grup) =>
      olcuToplamlari[grup].tuketildi > 0 ||
      olcuToplamlari[grup].israf > 0
  );
  const gun = bilgi === null ? null : kalanGun(bilgi.sonTarih);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Ürün detaylarını kapat"
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ürün Detayları</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {bilgi === null ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>
                Ürün veya hareket kaydı bulunamadı.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.hero}>
                <Text style={styles.heroLabel}>ÜRÜN BİLGİLERİ</Text>
                <Text style={styles.heroTitle}>{bilgi.ad}</Text>
                <Text style={styles.heroSubtitle}>{bilgi.kategori}</Text>
                <View style={styles.separator} />
                <Text style={styles.heroLabel}>GÜNCEL STOK</Text>
                <Text style={styles.heroQuantity}>
                  {miktarGoster(urun?.miktar ?? 0, urun?.birim ?? bilgi.birim)}
                </Text>
                <Text style={styles.heroNote}>
                  {urun === null ? 'Bu ürün artık aktif stokta bulunmuyor.' : 'Aktif stokta bulunan miktar'}
                </Text>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>📅 Ürün Bilgileri</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Son tüketim tarihi</Text>
                  <Text style={styles.infoValue}>{tarihGoster(bilgi.sonTarih)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Tarih durumu</Text>
                  <Text style={[
                    styles.infoValue,
                    gun !== null && gun < 0 ? styles.dangerText : null,
                  ]}>
                    {sonTarihDurumu(gun)}
                  </Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Eklenme tarihi</Text>
                  <Text style={styles.infoValue}>
                    {bilgi.eklenmeTarihi
                      ? tarihSaatGoster(bilgi.eklenmeTarihi)
                      : 'Eski kayıtta bulunmuyor'}
                  </Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>📊 Toplam Stok Hareketleri</Text>
              {gruplar.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.emptyText}>
                    Bu ürün için henüz tüketim veya israf işlemi yok.
                  </Text>
                </View>
              ) : (
                gruplar.map((grup) => (
                  <View key={grup} style={styles.card}>
                    <Text style={styles.groupTitle}>{GRUP_ADLARI[grup]}</Text>
                    <View style={styles.totalsRow}>
                      <View style={styles.totalBox}>
                        <Text style={styles.consumedLabel}>Tüketilen</Text>
                        <Text style={styles.totalNumber}>
                          {olcuGoster(olcuToplamlari[grup].tuketildi, grup)}
                        </Text>
                      </View>
                      <View style={styles.totalBox}>
                        <Text style={styles.wastedLabel}>İsraf edilen</Text>
                        <Text style={styles.totalNumber}>
                          {olcuGoster(olcuToplamlari[grup].israf, grup)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))
              )}

              <Text style={styles.sectionTitle}>
                🧾 İşlem Geçmişi ({hareketler.length})
              </Text>
              {hareketler.length === 0 ? (
                <View style={styles.card}>
                  <Text style={styles.emptyText}>
                    Henüz işlem yapılmamış.
                  </Text>
                </View>
              ) : (
                hareketler.map((kayit) => (
                  <View key={kayit.kayitId} style={styles.movementCard}>
                    <View style={styles.movementHeader}>
                      <Text style={styles.movementType}>
                        {kayit.islem === 'tuketildi' ? '✓ Tüketildi' : '🗑 İsraf edildi'}
                      </Text>
                      <Text style={[
                        styles.movementAmount,
                        kayit.islem === 'tuketildi'
                          ? styles.consumedText
                          : styles.dangerText,
                      ]}>
                        −{miktarGoster(kayit.miktar, kayit.birim)}
                      </Text>
                    </View>
                    <Text style={styles.movementDate}>
                      {tarihSaatGoster(kayit.islemTarihi)}
                    </Text>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FAF5' },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E1EAE3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  backButton: { paddingVertical: 4 },
  backText: { color: '#247A43', fontWeight: '700', fontSize: 15 },
  headerTitle: { color: '#213B2B', fontWeight: '800', fontSize: 19 },
  content: { padding: 16, paddingBottom: 40, gap: 14 },
  hero: {
    backgroundColor: '#123C2D',
    borderRadius: 20,
    padding: 20,
    gap: 7,
  },
  heroLabel: { color: '#BFE7CE', fontSize: 11, fontWeight: '700' },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  heroSubtitle: { fontSize: 14, color: '#D4E8DD' },
  separator: {
    marginVertical: 10,
    height: 1,
    backgroundColor: '#41735A',
  },
  heroQuantity: { fontSize: 30, fontWeight: '800', color: '#FFFFFF' },
  heroNote: { color: '#D4E8DD', fontSize: 12, lineHeight: 18 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EAE3',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#213B2B' },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#213B2B',
    marginTop: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoLabel: { fontSize: 13, color: '#647268', flex: 1 },
  infoValue: {
    fontSize: 13,
    color: '#293B30',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  groupTitle: { fontSize: 15, fontWeight: '700', color: '#254534' },
  totalsRow: { flexDirection: 'row', gap: 10 },
  totalBox: {
    flex: 1,
    backgroundColor: '#F5F9F5',
    padding: 12,
    borderRadius: 11,
    gap: 8,
  },
  consumedLabel: { fontSize: 12, color: '#247A43', fontWeight: '700' },
  wastedLabel: { fontSize: 12, color: '#B42318', fontWeight: '700' },
  totalNumber: { fontSize: 17, color: '#1C3426', fontWeight: '800' },
  movementCard: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1EAE3',
    borderRadius: 14,
    gap: 7,
  },
  movementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  movementType: { fontSize: 14, color: '#263F2E', fontWeight: '700' },
  movementAmount: { fontSize: 16, fontWeight: '800', flexShrink: 1 },
  movementDate: { fontSize: 12, color: '#7B8B80' },
  consumedText: { color: '#247A43' },
  dangerText: { color: '#B42318' },
  emptyText: { fontSize: 14, color: '#647268', lineHeight: 21 },
});
