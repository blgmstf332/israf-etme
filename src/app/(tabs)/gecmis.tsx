import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GecmisIcerik } from '@/components/ekranlar/gecmis-icerik';
import { UrunDetayEkrani } from '@/components/urun-detay-ekrani';
import { useIsrafetmeController } from '@/hooks/use-israfetme-controller';
import { styles } from '@/styles/israfetme-styles';
import { kalanGun } from '@/utils/urun-veri-modeli';

export default function GecmisSayfasi() {
  const c = useIsrafetmeController();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <GecmisIcerik c={c} />
      </ScrollView>
      <UrunDetayEkrani
        visible={c.detayUrunId !== null}
        urunId={c.detayUrunId}
        urun={c.urunler.find((urun) => urun.id === c.detayUrunId) ?? null}
        gecmis={c.gecmis}
        kalanGun={kalanGun}
        onClose={() => c.setDetayUrunId(null)}
      />
    </SafeAreaView>
  );
}
