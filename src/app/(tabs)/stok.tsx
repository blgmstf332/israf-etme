import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StokIcerik } from '@/components/ekranlar/stok-icerik';
import { MiktarIslemiModal } from '@/components/miktar-islemi-modal';
import { BarkodOkuyucu } from '@/components/barkod-okuyucu';
import { useIsrafetmeController } from '@/hooks/use-israfetme-controller';
import { styles } from '@/styles/israfetme-styles';

export default function StokSayfasi() {
  const c = useIsrafetmeController();
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <StokIcerik c={c} />
      </ScrollView>
      <MiktarIslemiModal
        urun={c.seciliIslem
          ? c.urunler.find((urun) => urun.id === c.seciliIslem!.urunId) ?? null
          : null}
        islem={c.seciliIslem?.islem ?? null}
        onClose={() => c.setSeciliIslem(null)}
        onConfirm={c.miktarIsleminiKaydet}
      />
      <BarkodOkuyucu
        visible={c.barkodAcik}
        onClose={() => c.setBarkodAcik(false)}
        onScanned={(barkod) => { void c.barkodIsle(barkod); }}
      />
    </SafeAreaView>
  );
}
