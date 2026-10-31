import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AyarlarEkrani } from '@/components/ayarlar-ekrani';
import { useIsrafetmeController } from '@/hooks/use-israfetme-controller';
import { styles } from '@/styles/israfetme-styles';

export default function AyarlarSayfasi() {
  const c = useIsrafetmeController();
  const [detayAcik, setDetayAcik] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>⚙️ Ayarlar</Text>
        <Text style={styles.sortInfo}>
          Bildirim izinlerini, veri yedeklemeyi ve uygulama bilgilerini buradan yönetebilirsin.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => setDetayAcik(true)}>
          <Text style={styles.buttonText}>⚙️ Tüm Ayarları Aç</Text>
        </TouchableOpacity>
      </ScrollView>
      <AyarlarEkrani
        visible={detayAcik}
        onClose={() => setDetayAcik(false)}
        stokSayisi={c.urunler.length}
        islemSayisi={c.gecmis.length}
        onYedekle={c.yedegiPaylas}
        onGeriYukle={c.yedektenGeriYukle}
        yedeklemeMesgul={c.yedeklemeMesgul}
      />
    </SafeAreaView>
  );
}
