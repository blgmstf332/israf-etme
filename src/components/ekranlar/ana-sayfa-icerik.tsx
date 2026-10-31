import { Text, TouchableOpacity, View } from 'react-native';

import { AnaSayfaOzeti } from '@/components/ana-sayfa-ozeti';
import { BildirimYoneticisi } from '@/components/bildirim-yoneticisi';
import type { useIsrafetmeController } from '@/hooks/use-israfetme-controller';
import { styles } from '@/styles/israfetme-styles';
import { modernStyles } from '@/styles/modern-ui';
import { kalanGun } from '@/utils/urun-veri-modeli';

type Controller = ReturnType<typeof useIsrafetmeController>;

export function AnaSayfaIcerik({ c }: { c: Controller }) {
  const {
    urunler,
    gecmis,
    tuketilenSayisi,
    israfSayisi,
    yuklendi,
    setAlisverisAcik,
  } = c;

  return (
    <>
      <AnaSayfaOzeti
        urunler={urunler}
        gecmis={gecmis}
        kalanGun={kalanGun}
      />

      <Text style={[styles.sectionTitle, modernStyles.bolumBasligi]}>
        Genel Durum
      </Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{urunler.length}</Text>
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
        onPress={() => setAlisverisAcik(true)}
      >
        <Text style={[styles.buttonText, modernStyles.anaButonYazisi]}>
          🛒 Alışveriş Listem
        </Text>
      </TouchableOpacity>

      <BildirimYoneticisi urunler={urunler} yuklendi={yuklendi} />
    </>
  );
}
