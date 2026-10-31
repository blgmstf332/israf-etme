import { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUygulama } from '@/context/uygulama-context';
import type { GecmisKaydi } from '@/utils/urun-veri-modeli';

type OlcuTuru = 'kutle' | 'hacim' | 'adet';

type OlcuOzeti = {
  tuketilen: number;
  israf: number;
};

const OLCULER: {
  id: OlcuTuru;
  baslik: string;
  simge: string;
  aciklama: string;
}[] = [
  { id: 'kutle', baslik: 'Ağırlık', simge: '⚖️', aciklama: 'kg ve g birlikte hesaplanır' },
  { id: 'hacim', baslik: 'Hacim', simge: '🥛', aciklama: 'L ve mL birlikte hesaplanır' },
  { id: 'adet', baslik: 'Adet', simge: '📦', aciklama: 'Adet bazında işlemler' },
];

function miktarHesapla(kayit: GecmisKaydi): {
  tur: OlcuTuru;
  miktar: number;
} | null {
  if (!Number.isFinite(kayit.miktar) || kayit.miktar <= 0) return null;

  switch (kayit.birim) {
    case 'kg':
      return { tur: 'kutle', miktar: kayit.miktar * 1000 };
    case 'g':
      return { tur: 'kutle', miktar: kayit.miktar };
    case 'L':
      return { tur: 'hacim', miktar: kayit.miktar * 1000 };
    case 'mL':
      return { tur: 'hacim', miktar: kayit.miktar };
    case 'Adet':
      return { tur: 'adet', miktar: kayit.miktar };
    default:
      return null;
  }
}

function miktarYaz(tur: OlcuTuru, deger: number): string {
  const sayiYaz = (sayi: number) =>
    sayi.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

  if (tur === 'adet') return `${sayiYaz(deger)} adet`;
  if (tur === 'kutle') {
    return deger >= 1000 ? `${sayiYaz(deger / 1000)} kg` : `${sayiYaz(deger)} g`;
  }
  return deger >= 1000 ? `${sayiYaz(deger / 1000)} L` : `${sayiYaz(deger)} mL`;
}

export default function IstatistikSayfasi() {
  const { veriler, yuklendi, yuklemeHatasi } = useUygulama();
  const { gecmis, urunler } = veriler;

  const ozet = useMemo(() => {
    const olculer: Record<OlcuTuru, OlcuOzeti> = {
      kutle: { tuketilen: 0, israf: 0 },
      hacim: { tuketilen: 0, israf: 0 },
      adet: { tuketilen: 0, israf: 0 },
    };

    let tuketimSayisi = 0;
    let israfSayisi = 0;
    const israfKategorileri: Record<string, number> = {};

    for (const kayit of gecmis) {
      if (kayit.islem === 'tuketildi') tuketimSayisi += 1;
      if (kayit.islem === 'israf') {
        israfSayisi += 1;
        israfKategorileri[kayit.kategori] =
          (israfKategorileri[kayit.kategori] ?? 0) + 1;
      }
      const sonuc = miktarHesapla(kayit);
      if (sonuc && (kayit.islem === 'tuketildi' || kayit.islem === 'israf')) {
        olculer[sonuc.tur][kayit.islem === 'tuketildi' ? 'tuketilen' : 'israf'] += sonuc.miktar;
      }
    }

    return {
      olculer,
      tuketimSayisi,
      israfSayisi,
      kategoriler: Object.entries(israfKategorileri)
        .sort((a, b) => b[1] - a[1]),
    };
  }, [gecmis]);

  const toplamIslem = ozet.tuketimSayisi + ozet.israfSayisi;
  const israfOrani = toplamIslem > 0
    ? (ozet.israfSayisi / toplamIslem) * 100
    : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>📊 İstatistikler</Text>
        <Text style={styles.subtitle}>
          Stok kullanımını ve israfını işlem geçmişindeki gerçek miktarlarla izle.
        </Text>

        {!yuklendi && !yuklemeHatasi && (
          <Text style={styles.message}>Kayıtlar yükleniyor...</Text>
        )}
        {yuklemeHatasi && (
          <Text style={[styles.message, styles.error]}>
            Kayıtlar okunamadı. Uygulamayı yeniden başlat.
          </Text>
        )}

        {yuklendi && !yuklemeHatasi && (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.smallCard}>
                <Text style={styles.muted}>Stoktaki ürün</Text>
                <Text style={styles.summaryValue}>{urunler.length}</Text>
              </View>
              <View style={styles.smallCard}>
                <Text style={styles.muted}>Tüketim işlemi</Text>
                <Text style={[styles.summaryValue, styles.green]}>
                  {ozet.tuketimSayisi}
                </Text>
              </View>
              <View style={styles.smallCard}>
                <Text style={styles.muted}>İsraf işlemi</Text>
                <Text style={[styles.summaryValue, styles.red]}>
                  {ozet.israfSayisi}
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>İşlem bazlı israf oranı</Text>
                <Text style={[styles.percent, styles.red]}>
                  %{israfOrani.toFixed(1).replace('.', ',')}
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.trackFill,
                    { width: `${israfOrani}%` as `${number}%` },
                  ]}
                />
              </View>
              <Text style={styles.note}>
                Bu oran işlem sayısına göredir; farklı ölçü birimleri birbirine eklenmez.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Miktar bazlı tüketim ve israf</Text>
            <Text style={styles.note}>
              Ağırlık, hacim ve adet ayrı ayrı hesaplanır. Tüm zamanların kayıtları gösterilir.
            </Text>

            {OLCULER.map((olcu) => {
              const veri = ozet.olculer[olcu.id];
              const toplam = veri.tuketilen + veri.israf;
              const oran = toplam > 0 ? (veri.israf / toplam) * 100 : 0;

              return (
                <View style={styles.card} key={olcu.id}>
                  <Text style={styles.cardTitle}>{olcu.simge} {olcu.baslik}</Text>
                  <Text style={styles.note}>{olcu.aciklama}</Text>
                  <View style={styles.measureRow}>
                    <View style={styles.measureColumn}>
                      <Text style={styles.muted}>✓ Tüketilen</Text>
                      <Text style={[styles.measureValue, styles.green]}>
                        {miktarYaz(olcu.id, veri.tuketilen)}
                      </Text>
                    </View>
                    <View style={styles.measureColumn}>
                      <Text style={styles.muted}>🗑 İsraf</Text>
                      <Text style={[styles.measureValue, styles.red]}>
                        {miktarYaz(olcu.id, veri.israf)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.muted}>Bu birimdeki israf payı</Text>
                    <Text style={styles.bold}>%{oran.toFixed(1).replace('.', ',')}</Text>
                  </View>
                  <View style={styles.track}>
                    <View
                      style={[
                        styles.trackFill,
                        { width: `${oran}%` as `${number}%` },
                      ]}
                    />
                  </View>
                </View>
              );
            })}

            <Text style={styles.sectionTitle}>İsraf işlemlerinin kategorileri</Text>
            <View style={styles.card}>
              {ozet.kategoriler.length === 0 ? (
                <Text style={styles.muted}>Henüz israf işlemi yok.</Text>
              ) : (
                ozet.kategoriler.map(([kategori, sayi]) => (
                  <View style={styles.categoryRow} key={kategori}>
                    <Text style={styles.categoryName}>{kategori}</Text>
                    <Text style={styles.bold}>{sayi} işlem</Text>
                  </View>
                ))
              )}
              <Text style={styles.note}>
                Kategoriler miktara değil, israf işlem sayısına göre sıralanır.
              </Text>
            </View>

            {gecmis.length === 0 && (
              <Text style={styles.message}>
                İlk tüketim veya israf kaydını oluşturduğunda analizler burada görünecek.
              </Text>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5FAF5' },
  content: { padding: 17, paddingBottom: 45, gap: 13 },
  title: { fontSize: 25, fontWeight: '800', color: '#183D2A' },
  subtitle: { fontSize: 14, lineHeight: 21, color: '#66786B' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#183D2A', marginTop: 6 },
  summaryRow: { flexDirection: 'row', gap: 7 },
  smallCard: { backgroundColor: '#FFFFFF', borderRadius: 13, padding: 11, flex: 1, borderColor: '#E0E9E1', borderWidth: 1, gap: 5 },
  muted: { fontSize: 12, color: '#6C796F' },
  summaryValue: { fontSize: 23, fontWeight: '800', color: '#183D2A' },
  green: { color: '#247A43' },
  red: { color: '#B42318' },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E0E9E1', gap: 11 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#203D2B' },
  percent: { fontWeight: '800', fontSize: 18 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  track: { backgroundColor: '#E4EEE6', height: 9, overflow: 'hidden', borderRadius: 100 },
  trackFill: { backgroundColor: '#D66C60', height: '100%', borderRadius: 100 },
  measureRow: { flexDirection: 'row', gap: 10 },
  measureColumn: { flex: 1, gap: 5 },
  measureValue: { fontSize: 18, fontWeight: '800' },
  bold: { fontSize: 13, color: '#213F2D', fontWeight: '700' },
  note: { fontSize: 12, lineHeight: 18, color: '#77867B' },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 9, borderBottomColor: '#EFF2EF', borderBottomWidth: 1 },
  categoryName: { fontSize: 14, flexShrink: 1, color: '#30483A' },
  message: { fontSize: 13, lineHeight: 20, color: '#607366', textAlign: 'center', marginVertical: 15 },
  error: { color: '#B42318' },
});
