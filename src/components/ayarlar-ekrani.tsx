
import Constants from 'expo-constants';
import {
    Alert,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  stokSayisi: number;
  islemSayisi: number;
  onYedekle: () => void;
  onGeriYukle: () => void;
  yedeklemeMesgul: boolean;
};

export function AyarlarEkrani({
  visible,
  onClose,
  stokSayisi,
  islemSayisi,
  onYedekle,
  onGeriYukle,
  yedeklemeMesgul,
}: Props) {

  // Telefonun uygulama ayarlarını aç.
  const bildirimAyarlariAc = async () => {
    try {
      await Linking.openSettings();
    } catch (hata) {
      console.error('Ayarlar açılamadı:', hata);

      Alert.alert(
        'Hata',
        'Telefonun uygulama ayarları açılamadı.'
      );
    }
  };

  // Uygulamanın package/app.json sürüm bilgisi.
  const uygulamaSurumu =
    Constants.expoConfig?.version ?? 'Bilinmiyor';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Üst başlık */}
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
            ⚙️ Ayarlar
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
        >
          {/* Uygulama özeti */}
          <View style={styles.hero}>
            <Text style={styles.brand}>
              🌿 İsrafEtme
            </Text>

            <Text style={styles.heroText}>
              Gıdanı koru, israfı azalt.
            </Text>

            <View style={styles.counterRow}>
              <Text style={styles.counter}>
                📦 {stokSayisi} stok ürünü
              </Text>

              <Text style={styles.counter}>
                📊 {islemSayisi} işlem
              </Text>
            </View>
          </View>

          {/* Bildirimler */}
          <Text style={styles.sectionTitle}>
            🔔 Bildirimler
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Bildirim İzinleri
            </Text>

            <Text style={styles.description}>
              Telefonun uygulama bildirim izinlerini
              görüntüleyebilir ve değiştirebilirsin.
            </Text>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={bildirimAyarlariAc}
            >
              <Text style={styles.secondaryButtonText}>
                Telefon Bildirim Ayarlarını Aç
              </Text>
            </TouchableOpacity>

            <Text style={styles.note}>
              Uygulama içi hatırlatıcı tercihleri
              mevcut Bildirim Yöneticisi üzerinden
              çalışmaya devam eder.
            </Text>
          </View>

          {/* Veri yönetimi */}
          <Text style={styles.sectionTitle}>
            💾 Veri Yönetimi
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Verilerimi Yedekle
            </Text>

            <Text style={styles.description}>
              Stok, tüketim/israf geçmişi ve
              alışveriş listeni JSON olarak yedekle.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={onYedekle}
              disabled={yedeklemeMesgul}
            >
              <Text style={styles.primaryButtonText}>
                📥 Yedek Oluştur
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Yedekten Geri Yükle
            </Text>

            <Text style={styles.description}>
              Önceden oluşturduğun yedek dosyasını
              seçerek kayıtlarını geri yükle.
            </Text>

            <TouchableOpacity
              style={styles.blueButton}
              onPress={onGeriYukle}
              disabled={yedeklemeMesgul}
            >
              <Text style={styles.primaryButtonText}>
                📤 Yedekten Geri Yükle
              </Text>
            </TouchableOpacity>

            <Text style={styles.warning}>
              ⚠️ Geri yükleme mevcut verilerin üzerine
              yazabilir. İşlem öncesinde onay istenir.
            </Text>
          </View>

          {/* Uygulama hakkında */}
          <Text style={styles.sectionTitle}>
            ℹ️ Uygulama Hakkında
          </Text>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Uygulama
              </Text>
              <Text style={styles.infoValue}>
                İsrafEtme
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Sürüm
              </Text>
              <Text style={styles.infoValue}>
                {uygulamaSurumu}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                Veri depolama
              </Text>
              <Text style={styles.infoValue}>
                Yerel SQLite
              </Text>
            </View>
          </View>

          <Text style={styles.footer}>
            🌱 Daha az israf, daha sürdürülebilir
            bir gelecek.
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
    padding: 18,
    gap: 18,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3EBE4',
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
    color: '#183D2A',
  },
  content: {
    padding: 20,
    paddingBottom: 45,
    gap: 14,
  },
  hero: {
    backgroundColor: '#123C2D',
    borderRadius: 20,
    padding: 22,
    gap: 12,
  },
  brand: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  heroText: {
    color: '#D0E7D9',
    fontSize: 14,
  },
  counterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  counter: {
    color: '#FFFFFF',
    backgroundColor: '#255742',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    fontWeight: '600',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#183D2A',
    fontWeight: '800',
    marginTop: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E1EAE3',
    padding: 17,
    gap: 12,
  },
  cardTitle: {
    fontSize: 16,
    color: '#263E2D',
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: '#68796C',
  },
  primaryButton: {
    backgroundColor: '#247A43',
    borderRadius: 11,
    padding: 14,
    alignItems: 'center',
  },
  blueButton: {
    backgroundColor: '#315D78',
    borderRadius: 11,
    padding: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#E8F3EC',
    borderRadius: 11,
    padding: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#247A43',
    fontWeight: '700',
    textAlign: 'center',
  },
  warning: {
    fontSize: 12,
    color: '#A56112',
    lineHeight: 18,
  },
  note: {
    fontSize: 12,
    color: '#77867B',
    lineHeight: 19,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    color: '#66776B',
    fontSize: 14,
  },
  infoValue: {
    color: '#263E2D',
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#EDF0ED',
  },
  footer: {
    textAlign: 'center',
    color: '#247A43',
    fontSize: 13,
    marginTop: 16,
  },
});
