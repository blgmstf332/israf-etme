import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUygulama } from '@/context/uygulama-context';
import {
  israfAnalizleriniHesapla,
  miktariYaz,
  type RiskSeviyesi,
} from '@/services/israf-analiz';

type Filtre = 'tum' | 'riskli' | 'alisveris';

const RENKLER: Record<RiskSeviyesi, { etiket: string; arka: string; yazi: string }> = {
  kritik: { etiket: 'Tarihi geçmiş', arka: '#FDE8E7', yazi: '#A6211B' },
  yuksek: { etiket: 'Yüksek öncelik', arka: '#FFF0E6', yazi: '#A14B08' },
  orta: { etiket: 'Takip edilmeli', arka: '#FFF8DD', yazi: '#805700' },
  dusuk: { etiket: 'Düşük öncelik', arka: '#E8F5ED', yazi: '#256840' },
  belirsiz: { etiket: 'Stokta yok', arka: '#EDF0F2', yazi: '#53616A' },
};

export default function AkilliAsistanEkrani() {
  const router = useRouter();
  const { veriler, yuklendi, yuklemeHatasi } = useUygulama();
  const [filtre, setFiltre] = useState<Filtre>('tum');
  const analizler = useMemo(
    () => israfAnalizleriniHesapla(veriler.urunler, veriler.gecmis),
    [veriler.urunler, veriler.gecmis]
  );
  const kritik = analizler.filter((a) => a.seviye === 'kritik').length;
  const dikkat = analizler.filter((a) => a.seviye === 'yuksek' || a.seviye === 'orta').length;
  const hesaplanabilir = analizler.filter((a) => a.alisverisOnerisi !== null).length;
  const gosterilen = analizler.filter((a) =>
    filtre === 'tum' ? true : filtre === 'riskli'
      ? (a.seviye === 'kritik' || a.seviye === 'yuksek' || a.seviye === 'orta')
      : a.alisverisOnerisi !== null && a.alisverisOnerisi > 0
  );

  return (
    <SafeAreaView style={styles.sayfa} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.icerik}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.navigate('/')} style={styles.geri}>
          <Text style={styles.geriYazi}>‹ Ana Sayfaya Dön</Text>
        </TouchableOpacity>
        <Text style={styles.baslik}>Akıllı İsraf Asistanı</Text>
        <Text style={styles.altBaslik}>
          Son tüketim tarihi ve kaydedilmiş alışkanlıklarına göre açıklanabilir ürün analizi.
        </Text>

        <View style={styles.bilgiKutusu}>
          <Text style={styles.bilgiBaslik}>29A · Kural tabanlı başlangıç modeli</Text>
          <Text style={styles.bilgiMetin}>
            Bu sürüm eğitilmiş bir makine öğrenmesi modeli değildir ve israf olasılığı (%) üretmez.
            Gerçek ML eğitimi için daha fazla tarihli satın alma ve tüketim verisi toplayacağız.
          </Text>
        </View>

        {!yuklendi || yuklemeHatasi ? (
          <Text style={styles.bosMetin}>{yuklemeHatasi ? 'Kayıtlar okunamadı. Uygulamayı tekrar başlat.' : 'Kayıtlar yükleniyor...'}</Text>
        ) : (
          <>
            <View style={styles.ozetSatir}>
              <View style={styles.ozetKart}>
                <Text style={[styles.ozetSayi, { color: '#B42318' }]}>{kritik}</Text>
                <Text style={styles.ozetEtiket}>Tarihi geçmiş</Text>
              </View>
              <View style={styles.ozetKart}>
                <Text style={[styles.ozetSayi, { color: '#A56112' }]}>{dikkat}</Text>
                <Text style={styles.ozetEtiket}>Takip edilmeli</Text>
              </View>
              <View style={styles.ozetKart}>
                <Text style={[styles.ozetSayi, { color: '#247A43' }]}>{hesaplanabilir}</Text>
                <Text style={styles.ozetEtiket}>Alım hesabı</Text>
              </View>
            </View>

            <Text style={styles.bolum}>Ürün bazlı analizler</Text>
            <View style={styles.filtreSatir}>
              {([
                { key: 'tum', label: 'Tümü' },
                { key: 'riskli', label: 'Öncelikli' },
                { key: 'alisveris', label: 'Alışveriş ihtiyacı' },
              ] as const).map(({ key, label }) => (
                <TouchableOpacity key={key} onPress={() => setFiltre(key)} style={[styles.filtre, filtre === key && styles.filtreAktif]}>
                  <Text style={[styles.filtreYazi, filtre === key && styles.filtreYaziAktif]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {gosterilen.length === 0 ? (
              <View style={styles.kart}>
                <Text style={styles.bosMetin}>
                  {analizler.length === 0
                    ? 'Henüz ürün veya son 30 güne ait işlem kaydı yok. Stok ve tüketim işlemleri ekledikçe burada analizler oluşacak.'
                    : 'Bu filtreye uygun analiz yok. Alışveriş hesabı için en az 14 güne yayılan 3 tüketim kaydı gerekiyor.'}
                </Text>
              </View>
            ) : gosterilen.map((a) => {
              const renk = RENKLER[a.seviye];
              return (
                <View key={a.anahtar} style={styles.kart}>
                  <View style={styles.baslikSatir}>
                    <Text style={styles.urunAdi}>{a.ad}</Text>
                    <View style={[styles.rozet, { backgroundColor: renk.arka }]}>
                      <Text style={[styles.rozetYazi, { color: renk.yazi }]}>{renk.etiket}</Text>
                    </View>
                  </View>
                  <Text style={styles.detayYazi}>Stoktaki miktar: {miktariYaz(a.stokMiktari, a.birim)}</Text>
                  <Text style={styles.detayYazi}>Son 30 gün tüketim: {miktariYaz(a.tuketilen30Gun, a.birim)}</Text>
                  <Text style={styles.detayYazi}>Son 30 gün israf: {miktariYaz(a.israf30Gun, a.birim)}</Text>
                  <Text style={styles.detayYazi}>
                    Kayıtlı israf oranı: {a.israfOrani === null ? 'Yetersiz işlem verisi' : `%${Math.round(a.israfOrani * 100)}`}
                  </Text>
                  <View style={styles.aciklamaKutusu}>
                    <Text style={styles.kucukBaslik}>Neden bu değerlendirme?</Text>
                    {a.gerekceler.map((gerekce, i) => <Text key={i} style={styles.aciklama}>• {gerekce}</Text>)}
                  </View>
                  <Text style={styles.kucukBaslik}>Alışveriş değerlendirmesi</Text>
                  {a.haftalikTuketim !== null && (
                    <Text style={styles.detayYazi}>Gözlemlenen haftalık tüketim: ≈ {miktariYaz(a.haftalikTuketim, a.birim)}</Text>
                  )}
                  {a.alisverisOnerisi !== null && (
                    <Text style={[styles.oneriYazi, { color: a.alisverisOnerisi > 0 ? '#20693B' : '#52615B' }]}>
                      {a.alisverisOnerisi > 0
                        ? `Yaklaşık ilave ihtiyaç: ${miktariYaz(a.alisverisOnerisi, a.birim)}`
                        : 'Kayıtlı tüketim hızına göre mevcut stok bir hafta için yeterli görünüyor.'}
                    </Text>
                  )}
                  <Text style={styles.aciklama}>{a.alisverisAciklamasi}</Text>
                  {a.alisverisOnerisi !== null && a.alisverisOnerisi > 0 && (
                    <TouchableOpacity style={styles.buton} onPress={() => router.push('/alisveris')}>
                      <Text style={styles.butonYazi}>Alışveriş Listesine Git ›</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            <Text style={styles.dipnot}>
              Analizler yalnızca uygulamaya kaydettiğin verilere dayanır. Eksik kayıtlar, farklı ürün adları ve ürünlerin gerçek saklama koşulları sonucu etkiler. Öneriler otomatik alışveriş veya stok düşme işlemi yapmaz.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sayfa: { flex: 1, backgroundColor: '#F5FAF5' },
  icerik: { padding: 16, paddingBottom: 45, gap: 12 },
  geri: { paddingVertical: 8, alignSelf: 'flex-start' },
  geriYazi: { color: '#20693B', fontWeight: '700', fontSize: 15 },
  baslik: { fontSize: 25, fontWeight: '800', color: '#193E2A' },
  altBaslik: { fontSize: 14, color: '#576860', lineHeight: 20 },
  bilgiKutusu: { backgroundColor: '#E7F1EB', padding: 14, borderRadius: 14, gap: 6 },
  bilgiBaslik: { color: '#165232', fontWeight: '800', fontSize: 14 },
  bilgiMetin: { color: '#335943', lineHeight: 20, fontSize: 13 },
  ozetSatir: { flexDirection: 'row', gap: 8 },
  ozetKart: { flex: 1, minWidth: 0, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E0E9E1', borderRadius: 12, paddingVertical: 14, alignItems: 'center', paddingHorizontal: 4 },
  ozetSayi: { fontSize: 24, fontWeight: '800' },
  ozetEtiket: { fontSize: 11, color: '#606A63', textAlign: 'center' },
  bolum: { fontSize: 19, fontWeight: '800', color: '#273C2D', marginTop: 5 },
  filtreSatir: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filtre: { backgroundColor: '#FFFFFF', borderColor: '#C9DEC9', borderWidth: 1, borderRadius: 22, paddingVertical: 9, paddingHorizontal: 11 },
  filtreAktif: { backgroundColor: '#247A43', borderColor: '#247A43' },
  filtreYazi: { color: '#3A5744', fontSize: 12, fontWeight: '600' },
  filtreYaziAktif: { color: '#FFFFFF' },
  kart: { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#DAE7DF', padding: 15, gap: 9 },
  baslikSatir: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' },
  urunAdi: { fontSize: 18, color: '#253C2A', fontWeight: '800', flexShrink: 1 },
  rozet: { borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6 },
  rozetYazi: { fontSize: 11, fontWeight: '700' },
  detayYazi: { fontSize: 13, color: '#4F5C55' },
  aciklamaKutusu: { backgroundColor: '#F3F7F3', borderRadius: 10, padding: 11, gap: 6 },
  kucukBaslik: { color: '#2C4836', fontSize: 13, fontWeight: '800' },
  aciklama: { fontSize: 12, color: '#627069', lineHeight: 19 },
  oneriYazi: { fontSize: 14, fontWeight: '800' },
  buton: { backgroundColor: '#247A43', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 10, alignItems: 'center' },
  butonYazi: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  bosMetin: { color: '#59665E', fontSize: 14, lineHeight: 21 },
  dipnot: { color: '#718077', lineHeight: 18, fontSize: 11, marginTop: 8 },
});
