
import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export type AktifSekme = 'ana' | 'stok' | 'gecmis';

export type MenuSekmesi =
  | AktifSekme
  | 'istatistik'
  | 'ayarlar';

type Props = {
  aktifSekme: AktifSekme;
  onSec: (sekme: MenuSekmesi) => void;
};

const SEKME_LISTESI: {
  id: MenuSekmesi;
  baslik: string;
  ikon: string;
}[] = [
  { id: 'ana', baslik: 'Ana Sayfa', ikon: '⌂' },
  { id: 'stok', baslik: 'Stok', ikon: '📦' },
  { id: 'gecmis', baslik: 'Geçmiş', ikon: '🕘' },
  { id: 'istatistik', baslik: 'İstatistik', ikon: '📊' },
  { id: 'ayarlar', baslik: 'Ayarlar', ikon: '⚙️' },
];

export function AltMenu({
  aktifSekme,
  onSec,
}: Props) {
  return (
    <View style={styles.container}>
      {SEKME_LISTESI.map((sekme) => {
        const secili = aktifSekme === sekme.id;

        return (
          <TouchableOpacity
            key={sekme.id}
            style={[
              styles.tab,
              secili && styles.activeTab,
            ]}
            onPress={() => onSec(sekme.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: secili }}
            accessibilityLabel={sekme.baslik}
          >
            <Text style={styles.icon}>
              {sekme.ikon}
            </Text>

            <Text
              style={[
                styles.label,
                secili && styles.activeLabel,
              ]}
              numberOfLines={1}
            >
              {sekme.baslik}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E1EAE3',
    paddingTop: 8,
    paddingBottom: 5,
    paddingHorizontal: 5,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 2,
    gap: 4,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#E2F3E7',
  },
  icon: {
    fontSize: 22,
    color: '#247A43',
  },
  label: {
    fontSize: 10,
    color: '#748379',
    fontWeight: '600',
  },
  activeLabel: {
    color: '#195C32',
    fontWeight: '800',
  },
});
