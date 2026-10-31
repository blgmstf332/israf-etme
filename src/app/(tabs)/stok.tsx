import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StokIcerik } from '@/components/ekranlar/stok-icerik';
import { MiktarIslemiModal } from '@/components/miktar-islemi-modal';
import { UrunDetayEkrani } from '@/components/urun-detay-ekrani';
import { BarkodOkuyucu } from '@/components/barkod-okuyucu';
import { useIsrafetmeController } from '@/hooks/use-israfetme-controller';
import { styles } from '@/styles/israfetme-styles';
import { kalanGun } from '@/utils/urun-veri-modeli';

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
      <UrunDetayEkrani
        visible={c.detayUrunId !== null}
        urunId={c.detayUrunId}
        urun={c.urunler.find((urun) => urun.id === c.detayUrunId) ?? null}
        gecmis={c.gecmis}
        kalanGun={kalanGun}
        onClose={() => c.setDetayUrunId(null)}
      />
      <BarkodOkuyucu
        visible={c.barkodAcik}
        onClose={() => c.setBarkodAcik(false)}
        onScanned={(barkod) => { void c.barkodIsle(barkod); }}
      />
    </SafeAreaView>
  );
}
