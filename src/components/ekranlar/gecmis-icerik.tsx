import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { modernStyles } from '@/styles/modern-ui';
import { styles } from '@/styles/israfetme-styles';
import { miktariGoster, islemTarihiniGoster } from '@/utils/urun-veri-modeli';
import type { useIsrafetmeController } from '@/hooks/use-israfetme-controller';

type Controller = ReturnType<typeof useIsrafetmeController>;

export function GecmisIcerik({ c }: { c: Controller }) {
  const {
    gecmis, gecmisArama, setGecmisArama, gecmisFiltresi, setGecmisFiltresi,
    gecmisTarihFiltresi, setGecmisTarihFiltresi, filtrelenmisGecmis,
    sonIslemler, setDetayUrunId, tumGecmisiGoster, setTumGecmisiGoster,
    gecmisiCsvPaylas,
  } = c;

  return (
    <>
      <Text
        style={[
          styles.sectionTitle,
          modernStyles.bolumBasligi,
        ]}
      >
        📋 İşlem Geçmişim
      </Text>
        <Text style={[styles.sectionTitle, modernStyles.bolumBasligi]}>
          Son İşlemler ({gecmis.length})
        </Text>
        {/* 20. AŞAMA: İşlem geçmişinde ürün arama */}
<TextInput
  style={[styles.input, modernStyles.input]}
  placeholder="🔍 Geçmişte ürün ara..."
  value={gecmisArama}
  onChangeText={setGecmisArama}
/>

{/* İşlem türüne göre filtreleme */}
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.optionsRow}
>
  {(['Tümü', 'tuketildi', 'israf'] as const).map((filtre) => (
    <TouchableOpacity
      key={filtre}
      style={[
        styles.optionChip,
        gecmisFiltresi === filtre && styles.optionChipActive,
      ]}
      onPress={() => setGecmisFiltresi(filtre)}
    >
      <Text
        style={[
          styles.optionText,
          gecmisFiltresi === filtre && styles.optionTextActive,
        ]}
      >
        {filtre === 'Tümü'
          ? 'Tümü'
          : filtre === 'tuketildi'
            ? '✓ Tüketildi'
            : '🗑 İsraf Edildi'}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
{/* 21. AŞAMA: Tarihe göre filtreleme */}
<Text style={[styles.label, modernStyles.etiket]}>
  📅 İşlem Tarihine Göre Filtrele
</Text>

<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.optionsRow}
>
  {(['Tümü', 'Son 7 Gün', 'Son 30 Gün', 'Bu Ay'] as const).map(
    (filtre) => (
      <TouchableOpacity
        key={filtre}
        style={[
          styles.optionChip,
          modernStyles.filtre,
          gecmisTarihFiltresi === filtre &&
            modernStyles.filtreSecili,
        ]}
        onPress={() => setGecmisTarihFiltresi(filtre)}
      >
        <Text
          style={[
            styles.optionText,
            modernStyles.filtreYazisi,
            gecmisTarihFiltresi === filtre &&
              modernStyles.filtreSeciliYazisi,
          ]}
        >
          {filtre}
        </Text>
      </TouchableOpacity>
    )
  )}
</ScrollView>

<Text style={styles.sortInfo}>
  Filtreye uygun {filtrelenmisGecmis.length} işlem bulundu.
</Text>
        {sonIslemler.length === 0 ? (
  <Text style={styles.emptyText}>
    {gecmis.length === 0
      ? 'Henüz tüketim veya israf kaydı bulunmuyor.'
      : 'Aramana uygun işlem bulunamadı.'}
  </Text>
) : (
          sonIslemler.map((kayit) => (
            <TouchableOpacity
              key={kayit.kayitId}
              style={styles.historyCard}
              onPress={() => setDetayUrunId(kayit.id)}
              accessibilityRole="button"
              accessibilityLabel={`${kayit.ad} ürününün işlem geçmişini aç`}
            >
              <View style={styles.historyHeader}>
                <Text style={styles.historyName}>
                  {kayit.ad}
                </Text>
                <Text
                  style={[
                    styles.historyStatus,
                    {
                      color:
                        kayit.islem === 'tuketildi'
                          ? '#247A43'
                          : '#B42318',
                    },
                  ]}
                >
                  {kayit.islem === 'tuketildi'
                    ? '✓ Tüketildi'
                    : 'İsraf Edildi'}
                </Text>
              </View>
              <Text style={styles.historyDetail}>
                {miktariGoster(kayit.miktar)} {kayit.birim}
                {' · '}
                {kayit.kategori}
              </Text>
              <Text style={styles.historyDetail}>
                İşlem tarihi: {islemTarihiniGoster(kayit.islemTarihi)}
              </Text>
              <Text style={styles.historyLink}>Hareketleri görüntüle ›</Text>
            </TouchableOpacity>
          ))
        )}
        {/* 20. AŞAMA: Tüm geçmişi göster / İlk 10'a dön */}
{filtrelenmisGecmis.length > 10 && (
  <TouchableOpacity
    style={[styles.button, modernStyles.anaButon]}
    onPress={() =>
      setTumGecmisiGoster((onceki) => !onceki)
    }
  >
    <Text
      style={[
        styles.buttonText,
        modernStyles.anaButonYazisi,
      ]}
    >
      {tumGecmisiGoster
        ? '↑ İlk 10 İşlemi Göster'
        : `↓ Tüm Geçmişi Göster (${filtrelenmisGecmis.length} kayıt)`}
    </Text>
  </TouchableOpacity>
)}
{/* 21. AŞAMA: CSV dışa aktarma butonu */}
<TouchableOpacity
  style={[
    styles.button,
    modernStyles.anaButon,
    {
      backgroundColor: '#225A43',
      marginTop: 10,
    },
  ]}
  onPress={gecmisiCsvPaylas}
>
  <Text
    style={[
      styles.buttonText,
      modernStyles.anaButonYazisi,
    ]}
  >
    📄 Geçmişi CSV Olarak Paylaş
  </Text>
</TouchableOpacity>
    </>
  );
}
