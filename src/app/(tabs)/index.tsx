import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlisverisEkrani } from '@/components/alisveris-ekrani';
import { AnaSayfaIcerik } from '@/components/ekranlar/ana-sayfa-icerik';
import { useIsrafetmeController } from '@/hooks/use-israfetme-controller';
import { styles } from '@/styles/israfetme-styles';
import { yeniId } from '@/utils/urun-veri-modeli';

export default function AnaSayfa() {
  const c = useIsrafetmeController();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AnaSayfaIcerik c={c} />
      </ScrollView>
      <AlisverisEkrani
        key={c.alisverisRevizyonu}
        visible={c.alisverisAcik}
        onClose={() => c.setAlisverisAcik(false)}
        stokUrunleri={c.urunler}
        onStogaAktar={(urun) => {
          c.setVeriler((onceki) => ({
            ...onceki,
            urunler: [...onceki.urunler, {
              id: yeniId(),
              ...urun,
              eklenmeTarihi: new Date().toISOString(),
            }],
          }));
        }}
      />
    </SafeAreaView>
  );
}
