
import { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type IslemTuru = 'tuketildi' | 'israf';

type UrunBilgisi = {
  id: string;
  ad: string;
  miktar: number;
  birim: string;
};

type Props = {
  urun: UrunBilgisi | null;
  islem: IslemTuru | null;
  onClose: () => void;
  onConfirm: (miktar: number) => void;
};

export function MiktarIslemiModal({
  urun,
  islem,
  onClose,
  onConfirm,
}: Props) {
  const [miktarMetni, setMiktarMetni] = useState('');
  const [hata, setHata] = useState('');

  // Pencere açıldığında başlangıç olarak stok miktarını göster.
  useEffect(() => {
    if (urun && islem) {
      setMiktarMetni(String(urun.miktar).replace('.', ','));
      setHata('');
    }
  }, [urun?.id, urun?.miktar, islem]);

  const onayla = () => {
    if (!urun || !islem) return;

    const metin = miktarMetni.trim();
    const sayi = Number(metin.replace(',', '.'));

    // En fazla 6 ondalık basamağa izin veriyoruz.
    if (
      !/^\d+([.,]\d{1,6})?$/.test(metin) ||
      !Number.isFinite(sayi) ||
      sayi <= 0
    ) {
      setHata(
        'Geçerli bir miktar gir. Örnek: 1 veya 0,5'
      );
      return;
    }

    if (sayi > urun.miktar) {
      setHata(
        `Stokta yalnızca ${urun.miktar} ${urun.birim} var.`
      );
      return;
    }

    setHata('');
    onConfirm(sayi);
  };

  const israfMi = islem === 'israf';

  return (
    <Modal
      visible={urun !== null && islem !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>
            {israfMi ? '🗑 İsraf Edildi' : '✓ Tüketildi'}
          </Text>

          {urun !== null && (
            <>
              <Text style={styles.productName}>{urun.ad}</Text>

              <Text style={styles.stockText}>
                Mevcut stok: {urun.miktar} {urun.birim}
              </Text>

              <Text style={styles.label}>
                {israfMi ? 'İsraf edilen' : 'Tüketilen'} miktar
              </Text>

              <View style={styles.inputRow}>
                <TextInput
                  style={styles.input}
                  value={miktarMetni}
                  onChangeText={(deger) => {
                    setMiktarMetni(deger);
                    setHata('');
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Örn: 0,5"
                  selectTextOnFocus
                />

                <Text style={styles.unit}>{urun.birim}</Text>
              </View>

              <Text style={styles.info}>
                Ürünün tamamını işlem yapmak istiyorsan
                miktarı değiştirmene gerek yok.
              </Text>

              {hata !== '' && (
                <Text style={styles.error}>{hata}</Text>
              )}

              <View style={styles.buttons}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    israfMi ? styles.wasteButton : styles.saveButton,
                  ]}
                  onPress={onayla}
                >
                  <Text style={styles.saveText}>
                    İşlemi Kaydet
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    gap: 12,
  },
  title: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#222222',
  },
  productName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#247A43',
  },
  stockText: {
    fontSize: 14,
    color: '#666666',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
    color: '#333333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CDDCCF',
    borderRadius: 10,
    padding: 14,
    fontSize: 18,
    color: '#222222',
  },
  unit: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#247A43',
  },
  info: {
    color: '#777777',
    fontSize: 12,
    lineHeight: 19,
  },
  error: {
    color: '#B42318',
    fontSize: 13,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#EEEEEE',
  },
  saveButton: {
    backgroundColor: '#247A43',
  },
  wasteButton: {
    backgroundColor: '#B42318',
  },
  cancelText: {
    color: '#444444',
    fontWeight: 'bold',
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
