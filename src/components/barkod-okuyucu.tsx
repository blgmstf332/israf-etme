
import {
    CameraView,
    useCameraPermissions,
} from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (barkod: string) => void;
};

export function BarkodOkuyucu({
  visible,
  onClose,
  onScanned,
}: Props) {
  const [permission, requestPermission] =
    useCameraPermissions();

  const [elleBarkod, setElleBarkod] = useState('');
  const [hata, setHata] = useState('');

  // Aynı barkodun art arda okunmasını engeller.
  const kilit = useRef(false);

  useEffect(() => {
    if (visible) {
      kilit.current = false;
      setElleBarkod('');
      setHata('');
    }
  }, [visible]);

  const barkoduGonder = (deger: string) => {
    const barkod = deger.replace(/\s/g, '');

    if (!/^\d{8,14}$/.test(barkod)) {
      setHata('8 ile 14 haneli sayısal barkod gir.');
      return;
    }

    if (kilit.current) return;

    kilit.current = true;
    onScanned(barkod);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            📷 Barkod Okut
          </Text>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>Kapat ✕</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.description}>
          Ürünün barkodunu kameraya göster.
          Barkod algılandığında otomatik okunacaktır.
        </Text>

        {visible && permission?.granted ? (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'itf14',
                ],
              }}
              onBarcodeScanned={({ data }) => {
                barkoduGonder(data);
              }}
            />

            <View
              pointerEvents="none"
              style={styles.scanFrame}
            >
              <Text style={styles.scanText}>
                Barkodu bu alana yerleştir
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.permissionBox}>
            <Text style={styles.permissionText}>
              {permission === null
                ? 'Kamera izni kontrol ediliyor...'
                : 'Barkod okumak için kamera izni gerekiyor.'}
            </Text>

            {permission !== null &&
              !permission.granted && (
                <TouchableOpacity
                  style={styles.permissionButton}
                  onPress={() => {
                    void requestPermission();
                  }}
                >
                  <Text style={styles.buttonText}>
                    Kameraya İzin Ver
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        )}

        <View style={styles.manualBox}>
          <Text style={styles.manualTitle}>
            Barkodu Elle Gir
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Örn: 3017620422003"
            value={elleBarkod}
            onChangeText={(deger) => {
              setElleBarkod(deger);
              setHata('');
            }}
            keyboardType="number-pad"
            maxLength={14}
          />

          {hata !== '' && (
            <Text style={styles.error}>{hata}</Text>
          )}

          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => barkoduGonder(elleBarkod)}
          >
            <Text style={styles.buttonText}>
              Barkodu Sorgula
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Ürün bilgileri Open Food Facts üzerinden
          sorgulanır. Ürün bulunamazsa manuel
          giriş yapabilirsin.
        </Text>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FAF5',
    padding: 18,
    gap: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#183D2A',
    fontSize: 22,
    fontWeight: '800',
  },
  close: {
    color: '#B42318',
    fontSize: 15,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#657368',
    lineHeight: 21,
  },
  cameraContainer: {
    height: 310,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#183D2A',
    justifyContent: 'center',
  },
 camera: {
  ...StyleSheet.absoluteFill,
},
  scanFrame: {
    alignSelf: 'center',
    width: '83%',
    height: 135,
    borderWidth: 3,
    borderColor: '#76E69B',
    borderRadius: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 10,
  },
  scanText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 5,
    borderRadius: 5,
  },
  permissionBox: {
    height: 210,
    backgroundColor: '#E8F3EC',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 15,
  },
  permissionText: {
    color: '#405848',
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#247A43',
    padding: 13,
    borderRadius: 10,
  },
  manualBox: {
    backgroundColor: '#FFFFFF',
    padding: 17,
    borderRadius: 14,
    gap: 12,
  },
  manualTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#183D2A',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D9E5DC',
    borderRadius: 10,
    padding: 13,
    color: '#222222',
    fontSize: 16,
  },
  manualButton: {
    backgroundColor: '#247A43',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  error: {
    color: '#B42318',
    fontSize: 13,
  },
  footer: {
    color: '#77867B',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
