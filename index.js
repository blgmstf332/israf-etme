const { LogBox } = require('react-native');

// Expo Go'da kullanılmayan push bildirim özelliklerinin uyarıları.
LogBox.ignoreLogs([
  '[expo-notifications] Push notifications (remote notifications)',
  'expo-notifications functionality is not fully supported in Expo Go',
]);

// Uygulamayı filtreleri ayarladıktan sonra başlat.
require('expo-router/entry');