
import { StyleSheet } from 'react-native';

// İsrafEtme'nin ortak görsel tasarım kuralları.
// Sadece görünümü etkiler, uygulama mantığını değiştirmez.

export const modernStyles = StyleSheet.create({
  urunKarti: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1EAE3',
    marginBottom: 12,
    shadowColor: '#123C2D',
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  urunAdi: {
    fontSize: 18,
    fontWeight: '800',
    color: '#183D2A',
  },

  bolumBasligi: {
    fontSize: 19,
    fontWeight: '800',
    color: '#183D2A',
    marginTop: 12,
    marginBottom: 10,
  },

  etiket: {
    color: '#405848',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
  },

  input: {
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9E5DC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: '#213B2B',
  },

  anaButon: {
    backgroundColor: '#247A43',
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },

  anaButonYazisi: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  islemButonu: {
    minHeight: 42,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 11,
    paddingVertical: 10,
  },

  filtre: {
    backgroundColor: '#F2F7F3',
    borderWidth: 1,
    borderColor: '#DCE9E0',
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },

  filtreSecili: {
    backgroundColor: '#DDF1E3',
    borderColor: '#247A43',
  },

  filtreYazisi: {
    color: '#52705B',
    fontWeight: '600',
  },

  filtreSeciliYazisi: {
    color: '#195C32',
    fontWeight: '800',
  },

  bilgiYazisi: {
    color: '#748379',
    fontSize: 12,
    lineHeight: 18,
  },
});
