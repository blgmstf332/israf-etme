import Constants from 'expo-constants';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useIsrafetmeController } from '@/hooks/use-israfetme-controller';

export default function AyarlarSayfasi() {
  const c = useIsrafetmeController();
  const surum = Constants.expoConfig?.version ?? 'Bilinmiyor';
  const islemKilitli = !c.yuklendi || c.yuklemeHatasi || c.yedeklemeMesgul;

  const bildirimAyarlariAc = async () => {
    try {
      await Linking.openSettings();
    } catch (hata) {
      console.error('Sistem ayarları açılamadı:', hata);
      Alert.alert('Hata', 'Telefonun uygulama ayarları açılamadı.');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>⚙️ Ayarlar</Text>
        <View style={styles.hero}>
          <Text style={styles.brand}>🌿 İsrafEtme</Text>
          <Text style={styles.heroDescription}>Gıdanı koru, israfı azalt.</Text>
          <View style={styles.badgeRow}>
            <Text style={styles.badge}>📦 {c.urunler.length} stok ürünü</Text>
            <Text style={styles.badge}>📊 {c.gecmis.length} işlem</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>🔔 Bildirimler</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bildirim izinleri</Text>
          <Text style={styles.description}>
            Telefonun uygulama bildirim izinlerini görüntüle ve değiştir.
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => { void bildirimAyarlariAc(); }}>
            <Text style={styles.secondaryText}>Telefon Bildirim Ayarlarını Aç</Text>
          </TouchableOpacity>
          <Text style={styles.note}>
            Expo Go kullanırken sistem ayarları Expo Go uygulamasına ait açılabilir.
            Mevcut hatırlatıcı zamanlaması Ana Sayfa'daki bildirim yöneticisiyle çalışmaya devam eder.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>💾 Veri Yönetimi</Text>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Yedek oluştur</Text>
          <Text style={styles.description}>
            Stok, işlem geçmişi ve alışveriş listesini JSON dosyası olarak kaydet.
          </Text>
          <TouchableOpacity
            style={[styles.primaryButton, islemKilitli && styles.disabled]}
            onPress={() => { void c.yedegiPaylas(); }}
            disabled={islemKilitli}
          >
            <Text style={styles.primaryText}>
              {c.yedeklemeMesgul ? 'İşlem sürüyor...' : '📥 Yedek Oluştur'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Yedekten geri yükle</Text>
          <Text style={styles.description}>
            Daha önce kaydettiğin JSON yedeğini seçerek kayıtlarını geri yükle.
          </Text>
          <TouchableOpacity
            style={[styles.blueButton, islemKilitli && styles.disabled]}
            onPress={() => { void c.yedektenGeriYukle(); }}
            disabled={islemKilitli}
          >
            <Text style={styles.primaryText}>📤 Yedekten Geri Yükle</Text>
          </TouchableOpacity>
          <Text style={styles.warning}>
            ⚠️ Mevcut kayıtların üzerine yazılabilir. İşlemden önce onay istenir.
          </Text>
        </View>

        {c.yuklemeHatasi && (
          <Text style={styles.warning}>
            Kayıtlar yüklenemediği için yedekleme işlemleri devre dışı.
          </Text>
        )}

        <Text style={styles.sectionTitle}>ℹ️ Hakkında</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.description}>Uygulama</Text>
            <Text style={styles.infoValue}>İsrafEtme</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.description}>Sürüm</Text>
            <Text style={styles.infoValue}>{surum}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.description}>Yerel depolama</Text>
            <Text style={styles.infoValue}>SQLite KV Store</Text>
          </View>
        </View>
        <Text style={styles.footer}>🌱 Daha az israf, daha sürdürülebilir bir gelecek.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5FAF5' },
  content: { padding: 17, paddingBottom: 45, gap: 13 },
  title: { fontSize: 25, fontWeight: '800', color: '#183D2A' },
  hero: { backgroundColor: '#173F2E', padding: 20, gap: 12, borderRadius: 19 },
  brand: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  heroDescription: { color: '#D5EBDD', fontSize: 14 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { color: '#FFFFFF', backgroundColor: '#2B5942', paddingVertical: 7, paddingHorizontal: 10, borderRadius: 9, fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#183D2A', marginTop: 5 },
  card: { backgroundColor: '#FFFFFF', padding: 17, borderRadius: 15, borderColor: '#E0E9E1', borderWidth: 1, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#223B2B' },
  description: { color: '#68796C', fontSize: 13, lineHeight: 20, flexShrink: 1 },
  note: { color: '#77867B', fontSize: 12, lineHeight: 19 },
  warning: { color: '#A56112', fontSize: 12, lineHeight: 19 },
  primaryButton: { backgroundColor: '#247A43', padding: 15, alignItems: 'center', borderRadius: 11 },
  blueButton: { backgroundColor: '#315D78', padding: 15, alignItems: 'center', borderRadius: 11 },
  secondaryButton: { backgroundColor: '#E8F3EC', padding: 14, alignItems: 'center', borderRadius: 11 },
  secondaryText: { color: '#247A43', fontWeight: '700', textAlign: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoValue: { fontSize: 13, fontWeight: '700', color: '#263E2D' },
  divider: { height: 1, backgroundColor: '#EEF2EE' },
  footer: { textAlign: 'center', fontSize: 12, color: '#247A43', marginTop: 14 },
});
