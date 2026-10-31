import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUygulama } from '@/context/uygulama-context';
import {
  durumBilgisi,
  islemTarihiniGoster,
  kalanGun,
  miktariGoster,
  tarihiGoster,
} from '@/utils/urun-veri-modeli';

export default function UrunDetaySayfasi() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { veriler, yuklendi } = useUygulama();

  const stokUrunu = veriler.urunler.find((urun) => urun.id === id);
  const hareketler = veriler.gecmis
    .filter((kayit) => kayit.id === id)
    .sort(
      (a, b) =>
        new Date(b.islemTarihi).getTime() -
        new Date(a.islemTarihi).getTime()
    );

  // Stoktan tamamen kaldırılan ürünler geçmiş kayıtlarından da açılabilir.
  const urun = stokUrunu ?? hareketler[0] ?? null;
  const durum = urun ? durumBilgisi(urun.sonTarih) : null;
  const gun = urun ? kalanGun(urun.sonTarih) : null;
  const tuketim = hareketler.filter((h) => h.islem === 'tuketildi');
  const israf = hareketler.filter((h) => h.islem === 'israf');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topbar}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Önceki sayfaya dön"
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹ Geri</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Ürün Detayları</Text>
      </View>

      {!yuklendi ? (
        <View style={styles.center}>
          <Text style={styles.muted}>Ürün bilgileri yükleniyor...</Text>
        </View>
      ) : !urun ? (
        <View style={styles.center}>
          <Text style={styles.notFound}>Ürün kaydı bulunamadı</Text>
          <Text style={styles.muted}>
            Ürün silinmiş veya kayıtları değiştirilmiş olabilir.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Text style={styles.heroEyebrow}>
              {stokUrunu ? '📦 Stokta mevcut' : '📋 Stokta bulunmuyor'}
            </Text>
            <Text style={styles.heroTitle}>{urun.ad}</Text>
            <Text style={styles.heroSubtitle}>{urun.kategori}</Text>
          </View>

          <Text style={styles.section}>Ürün Bilgileri</Text>
          <View style={styles.card}>
            <InfoRow
              label="Stok miktarı"
              value={stokUrunu
                ? `${miktariGoster(stokUrunu.miktar)} ${stokUrunu.birim}`
                : 'Stokta yok'}
            />
            <View style={styles.divider} />
            <InfoRow
              label="Son tüketim tarihi"
              value={tarihiGoster(urun.sonTarih)}
            />
            <View style={styles.divider} />
            <InfoRow label="Kategori" value={urun.kategori} />
            {urun.eklenmeTarihi && (
              <>
                <View style={styles.divider} />
                <InfoRow
                  label="Eklenme tarihi"
                  value={islemTarihiniGoster(urun.eklenmeTarihi)}
                />
              </>
            )}
          </View>

          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {durum?.metin ?? 'Durum bilinmiyor'}
              {gun !== null && gun > 0 ? ` · ${gun} gün` : ''}
            </Text>
          </View>

          <Text style={styles.section}>Stok Hareketleri</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{tuketim.length}</Text>
              <Text style={styles.summaryLabel}>Tüketim işlemi</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryNumber}>{israf.length}</Text>
              <Text style={styles.summaryLabel}>İsraf işlemi</Text>
            </View>
          </View>

          {hareketler.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.muted}>Bu ürün için henüz bir stok hareketi yok.</Text>
            </View>
          ) : (
            hareketler.map((hareket) => (
              <View key={hareket.kayitId} style={styles.movementCard}>
                <View style={styles.movementRow}>
                  <Text style={styles.movementTitle}>
                    {hareket.islem === 'tuketildi'
                      ? '✓ Tüketildi'
                      : '🗑 İsraf Edildi'}
                  </Text>
                  <Text style={styles.movementAmount}>
                    {miktariGoster(hareket.miktar)} {hareket.birim}
                  </Text>
                </View>
                <Text style={styles.movementDate}>
                  {islemTarihiniGoster(hareket.islemTarihi)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FAF5' },
  topbar: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#DFE9E1',
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backButton: { paddingVertical: 4 },
  backText: { fontSize: 17, color: '#247A43', fontWeight: '700' },
  pageTitle: { fontSize: 18, color: '#183D2A', fontWeight: '800' },
  content: { padding: 18, paddingBottom: 35, gap: 14 },
  hero: { backgroundColor: '#173C2C', borderRadius: 18, padding: 22, gap: 6 },
  heroEyebrow: { color: '#C7EDD6', fontSize: 13 },
  heroTitle: { color: '#FFFFFF', fontWeight: '800', fontSize: 23 },
  heroSubtitle: { color: '#D3ECDB', fontSize: 14 },
  section: { fontWeight: '800', fontSize: 17, color: '#23432B', marginTop: 10 },
  card: { backgroundColor: '#FFFFFF', padding: 17, borderRadius: 14, gap: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 18 },
  infoLabel: { fontSize: 13, color: '#66776C', flex: 1 },
  infoValue: { fontSize: 14, color: '#253D2D', fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#EBF0ED' },
  notice: { backgroundColor: '#E4F1E8', padding: 13, borderRadius: 11 },
  noticeText: { color: '#286442', fontSize: 13, fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 17 },
  summaryNumber: { fontSize: 23, fontWeight: '800', color: '#247A43' },
  summaryLabel: { fontSize: 12, color: '#657368', marginTop: 3 },
  movementCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, gap: 8 },
  movementRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  movementTitle: { fontSize: 14, fontWeight: '700', color: '#294534' },
  movementAmount: { fontSize: 14, fontWeight: '800', color: '#247A43' },
  movementDate: { fontSize: 12, color: '#76857A' },
  muted: { fontSize: 14, color: '#748277', lineHeight: 21 },
  center: { flex: 1, padding: 26, justifyContent: 'center', alignItems: 'center', gap: 10 },
  notFound: { color: '#365741', fontSize: 19, fontWeight: '700' },
});
