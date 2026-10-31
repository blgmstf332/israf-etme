import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IstatistikEkrani } from '@/components/istatistik-ekrani';
import { useUygulama } from '@/context/uygulama-context';
import { styles } from '@/styles/israfetme-styles';

export default function IstatistikSayfasi() {
  const { veriler } = useUygulama();
  const [detayAcik, setDetayAcik] = useState(false);
  const tuketilen = veriler.gecmis.filter((kayit) => kayit.islem === 'tuketildi').length;
  const israf = veriler.gecmis.filter((kayit) => kayit.islem === 'israf').length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>📊 İstatistikler</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, styles.greenText]}>{tuketilen}</Text>
            <Text style={styles.summaryLabel}>Tüketim işlemi</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, styles.redText]}>{israf}</Text>
            <Text style={styles.summaryLabel}>İsraf işlemi</Text>
          </View>
        </View>
        <Text style={styles.sortInfo}>
          Bunlar işlem sayılarıdır; miktar bazlı analiz için ayrıntılı istatistikleri aç.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => setDetayAcik(true)}>
          <Text style={styles.buttonText}>📈 Ayrıntılı İstatistikleri Aç</Text>
        </TouchableOpacity>
      </ScrollView>
      <IstatistikEkrani
        visible={detayAcik}
        onClose={() => setDetayAcik(false)}
        urunler={veriler.urunler}
        gecmis={veriler.gecmis}
      />
    </SafeAreaView>
  );
}
