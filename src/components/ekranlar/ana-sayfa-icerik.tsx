import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { AnaSayfaOzeti } from '@/components/ana-sayfa-ozeti';
import { BildirimYoneticisi } from '@/components/bildirim-yoneticisi';
import { modernStyles } from '@/styles/modern-ui';
import { styles } from '@/styles/israfetme-styles';
import { kalanGun } from '@/utils/urun-veri-modeli';
import type { useIsrafetmeController } from '@/hooks/use-israfetme-controller';

type Controller = ReturnType<typeof useIsrafetmeController>;

export function AnaSayfaIcerik({ c }: { c: Controller }) {
  const router = useRouter();
  const { urunler, gecmis, tuketilenSayisi, israfSayisi, yuklendi,
    setAlisverisAcik } = c;

  return (
    <>
      <AnaSayfaOzeti
  urunler={urunler}
  gecmis={gecmis}
  kalanGun={kalanGun}
/>
<TouchableOpacity
  style={[
    styles.button,
    modernStyles.anaButon,
    { backgroundColor: '#315D78' },
  ]}
  onPress={() => router.navigate('/ayarlar')}
>
  <Text style={modernStyles.anaButonYazisi}>
    ⚙️ Ayarlar
  </Text>
</TouchableOpacity>
        {/* YENİ: Stok ve işlem özeti */}
        <Text style={[styles.sectionTitle, modernStyles.bolumBasligi]}>Genel Durum</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNumber}>
              {urunler.length}
            </Text>
            <Text style={styles.summaryLabel}>Stokta</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, styles.greenText]}>
              {tuketilenSayisi}
            </Text>
            <Text style={styles.summaryLabel}>Tüketilen</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryNumber, styles.redText]}>
              {israfSayisi}
            </Text>
            <Text style={styles.summaryLabel}>İsraf</Text>
          </View>
        </View>
<TouchableOpacity
  style={[styles.button, modernStyles.anaButon]}
  onPress={() => router.navigate('/istatistik')}
>
  <Text style={[styles.buttonText, modernStyles.anaButonYazisi]}>
    📊 İstatistiklerimi Gör
  </Text>
</TouchableOpacity>
<TouchableOpacity
  style={[styles.button, modernStyles.anaButon]}
  onPress={() => setAlisverisAcik(true)}
>
  <Text style={[styles.buttonText, modernStyles.anaButonYazisi]}>
    🛒 Alışveriş Listem
  </Text>
</TouchableOpacity>
         <BildirimYoneticisi
          urunler={urunler}
          yuklendi={yuklendi}
/>
            </>
  );
}
