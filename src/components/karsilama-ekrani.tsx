
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';



export function KarsilamaEkrani() {

  const [gorunsun, setGorunsun] = useState(true);

  // Animasyon değişkenleri
  const saydamlik = useRef(new Animated.Value(1)).current;
  const kuculme = useRef(new Animated.Value(1)).current;
  const kayma = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!gorunsun) return;

    // Yazıyı 3 saniye boyunca göster.
    const zamanlayici = setTimeout(() => {

      // Animasyonları aynı anda başlat.
      Animated.parallel([

        // Ekranın yavaşça saydamlaşması
        Animated.timing(saydamlik, {
          toValue: 0,
          duration: 800,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),

        // Yazının hafifçe küçülmesi
        Animated.timing(kuculme, {
          toValue: 0.9,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

        // Yazının yukarı hareket etmesi
        Animated.timing(kayma, {
          toValue: -40,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),

      ]).start(({ finished }) => {

        if (!finished) return;

        // Modal ekranını tamamen kapat.
        setGorunsun(false);
      });

    }, 3000);

    return () => {
      clearTimeout(zamanlayici);
      saydamlik.stopAnimation();
      kuculme.stopAnimation();
      kayma.stopAnimation();
    };

  }, [gorunsun, saydamlik, kuculme, kayma]);

  // Daha önce gösterilmişse hiçbir şey çizme.
  if (!gorunsun) {
    return null;
  }

  return (
    <Modal
      visible={gorunsun}
      transparent={true}
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
      navigationBarTranslucent={true}
      onRequestClose={() => {}}
    >

      <StatusBar
        barStyle="dark-content"
      />

      <Animated.View
        style={[
          styles.fullScreen,
          { opacity: saydamlik },
        ]}
      >

        <Animated.View
          style={[
            styles.content,
            {
              transform: [
                { scale: kuculme },
                { translateY: kayma },
              ],
            },
          ]}
        >

          <Text style={styles.leaf}>
            🌿
          </Text>

          <Text style={styles.heading}>
            Unutma !
          </Text>

          <Text style={styles.message}>
            Çöpe attığın her ürün birilerinin bulamadığıdır.
          </Text>

          <View style={styles.divider} />

          <Text style={styles.appName}>
            İSRAFETME
          </Text>

        </Animated.View>

      </Animated.View>

    </Modal>
  );
}

// Karşılama ekranı tasarımı
const styles = StyleSheet.create({

  fullScreen: {
    flex: 1,
    backgroundColor: '#EAF5EC',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  content: {
    width: '100%',
    maxWidth: 370,
    alignItems: 'center',
  },

  leaf: {
    fontSize: 58,
    marginBottom: 25,
  },

  heading: {
    fontSize: 34,
    fontWeight: '800',
    color: '#247A43',
    textAlign: 'center',
    marginBottom: 18,
  },

  message: {
    fontSize: 22,
    fontWeight: '500',
    lineHeight: 34,
    color: '#263B2A',
    textAlign: 'center',
  },

  divider: {
    width: 80,
    height: 3,
    backgroundColor: '#86B89A',
    borderRadius: 5,
    marginTop: 32,
    marginBottom: 22,
  },

  appName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 4,
    color: '#247A43',
  },

});
