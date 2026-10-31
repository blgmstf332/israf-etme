import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SonTarihRozeti } from '@/components/son-tarih-rozeti';
import { modernStyles } from '@/styles/modern-ui';
import { styles } from '@/styles/israfetme-styles';
import {
  KATEGORILER, BIRIMLER, DURUM_RENKLERI,
  kalanGun, durumBilgisi, miktariGoster, tarihiGoster,
} from '@/utils/urun-veri-modeli';
import type { useIsrafetmeController } from '@/hooks/use-israfetme-controller';

type Controller = ReturnType<typeof useIsrafetmeController>;

export function StokIcerik({ c }: { c: Controller }) {
  const {
    urunAdi, setUrunAdi, barkodAraniyor, setBarkodAcik, sonOkunanBarkod,
    tarih, setTarih, kategori, setKategori, miktar, setMiktar, birim, setBirim,
    yuklendi, yuklemeHatasi, urunEkle, urunler, aramaMetni, setAramaMetni,
    kategoriFiltresi, setKategoriFiltresi, yalnizcaAcil, setYalnizcaAcil,
    gorunenUrunler, duzenlenenUrunId, duzenlemeAdi, setDuzenlemeAdi,
    duzenlemeTarihi, setDuzenlemeTarihi, duzenlemeKategorisi,
    setDuzenlemeKategorisi, duzenlemeMiktari, setDuzenlemeMiktari,
    duzenlemeBirimi, setDuzenlemeBirimi, duzenlemeyiIptal, duzenlemeyiKaydet,
    setDetayUrunId, urunTamamla, duzenlemeyiBaslat, urunSil,
  } = c;

  return (
    <>
      <Text style={[styles.sectionTitle, modernStyles.bolumBasligi]}>
        Yeni Ürün Ekle
      </Text>
        {/* 24. AŞAMA: Barkod ile ürün bul */}
<TouchableOpacity
  style={[
    styles.button,
    modernStyles.anaButon,
    { backgroundColor: '#225A43' },
  ]}
  onPress={() => setBarkodAcik(true)}
  disabled={barkodAraniyor}
>
  <Text style={modernStyles.anaButonYazisi}>
    {barkodAraniyor
      ? '🔎 Ürün aranıyor...'
      : '📷 Barkod Okutarak Ürün Ekle'}
  </Text>
</TouchableOpacity>

{sonOkunanBarkod !== '' && (
  <Text style={styles.sortInfo}>
    Son okunan barkod: {sonOkunanBarkod}
  </Text>
)}
        <Text style={[styles.label, modernStyles.etiket]}>Ürün Adı</Text>
        <TextInput
      style={[styles.input, modernStyles.input]}      
          placeholder="Örn: Süt"
          value={urunAdi}
          onChangeText={setUrunAdi}
        />
        <Text style={[styles.label, modernStyles.etiket]}>Son Tüketim Tarihi</Text>
        <TextInput
          style={[styles.input, modernStyles.input]}
          placeholder="GG.AA.YYYY"
          value={tarih}
          onChangeText={setTarih}
        />
        <Text style={[styles.label, modernStyles.etiket]}>Kategori</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.optionsRow}
        >
          {KATEGORILER.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.optionChip,
                modernStyles.filtre,
                kategori === item && styles.optionChipActive,
              ]}
              onPress={() => setKategori(item)}
            >
              <Text
                style={[
                  styles.optionText,
                  kategori === item && styles.optionTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <Text style={[styles.label, modernStyles.etiket]}>Miktar</Text>
        <TextInput
          style={[styles.input, modernStyles.input]}
          placeholder="Örn: 2 veya 2,5"
          keyboardType="decimal-pad"
          value={miktar}
          onChangeText={setMiktar}
        />
        <Text style={[styles.label, modernStyles.etiket]}>Birim</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.optionsRow}
        >
          {BIRIMLER.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.optionChip,
                modernStyles.filtre,
                birim === item && styles.optionChipActive,
              ]}
              onPress={() => setBirim(item)}
            >
              <Text
                style={[
                  styles.optionText,
                  birim === item && styles.optionTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[
            styles.button,
            modernStyles.anaButon,
            !yuklendi && styles.disabledButton,
          ]}
          onPress={urunEkle}
          disabled={!yuklendi}
        >
          <Text style={[styles.buttonText, modernStyles.anaButonYazisi]}>
            {yuklendi ? '+ Ürün Ekle' : 'Veriler yükleniyor...'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.sectionTitle, modernStyles.bolumBasligi]}>
          Ürünlerim ({urunler.length})
        </Text>
        <Text style={styles.sortInfo}>
          ⏳ Son tüketim tarihine göre sıralandı
        </Text>
          {/* Ürün arama */}
<TextInput
  style={[styles.input, modernStyles.input]}
  placeholder="🔍 Ürün ara..."
  value={aramaMetni}
  onChangeText={setAramaMetni}
/>
{/* Kategori filtreleri */}
<Text style={[styles.label, modernStyles.etiket]}>Kategoriye Göre Filtrele</Text>
<ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.optionsRow}
>
  {(['Tümü', ...KATEGORILER] as const).map((item) => (
    <TouchableOpacity
      key={item}
      style={[
        styles.optionChip,
        modernStyles.filtre,
        kategoriFiltresi === item && modernStyles.filtreSecili,
      ]}
      onPress={() => setKategoriFiltresi(item)}
    >
      <Text
        style={[
          styles.optionText,
          modernStyles.filtreYazisi,
          kategoriFiltresi === item && modernStyles.filtreSeciliYazisi,
        ]}
      >
        {item}
      </Text>
    </TouchableOpacity>
  ))}
</ScrollView>
{/* Acil ürün filtresi */}
<TouchableOpacity
  style={[
    styles.optionChip,
    modernStyles.filtre,
    { alignSelf: 'flex-start', marginVertical: 8 },
    yalnizcaAcil && modernStyles.filtreSecili,
  ]}
  onPress={() => setYalnizcaAcil(!yalnizcaAcil)}
>
  <Text
    style={[
      styles.optionText,
      modernStyles.filtreYazisi,
      yalnizcaAcil && modernStyles.filtreSeciliYazisi,
    ]}
  >
    {yalnizcaAcil
      ? '✓ Acil Ürünler'
      : '⚠️ Yalnızca Acil Ürünler'}
  </Text>
</TouchableOpacity>
<Text style={styles.sortInfo}>
  Gösterilen: {gorunenUrunler.length} / {urunler.length} ürün
</Text>
        {!yuklendi ? (
          <Text style={styles.emptyText}>
            {yuklemeHatasi
              ? 'Veriler okunamadı. Uygulamayı yeniden başlat.'
              : 'Kayıtlı ürünler yükleniyor...'}
          </Text>
        ) : urunler.length === 0 ? (
  <Text style={styles.emptyText}>
    Henüz stokta ürün bulunmuyor.
  </Text>
) : gorunenUrunler.length === 0 ? (
  <Text style={styles.emptyText}>
    Aramana uygun ürün bulunamadı.
  </Text>
) : (
          gorunenUrunler.map((urun) => {
            const durum = durumBilgisi(urun.sonTarih);
            const renkler = DURUM_RENKLERI[durum.tur];
            return (
              <View
  key={urun.id}
  style={[styles.card, modernStyles.urunKarti]}
>
                {duzenlenenUrunId === urun.id ? (
                  <View style={styles.editForm}>
                    <Text style={[styles.label, modernStyles.etiket]}>Ürün Adı</Text>
                    <TextInput
                      style={[styles.input, modernStyles.input]}
                      value={duzenlemeAdi}
                      onChangeText={setDuzenlemeAdi}
                    />
                    <Text style={[styles.label, modernStyles.etiket]}>
                      Son Tüketim Tarihi
                    </Text>
                    <TextInput
                      style={[styles.input, modernStyles.input]}
                      value={duzenlemeTarihi}
                      onChangeText={setDuzenlemeTarihi}
                      placeholder="GG.AA.YYYY"
                    />
                    <Text style={[styles.label, modernStyles.etiket]}>Kategori</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionsRow}
                    >
                      {KATEGORILER.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.optionChip,
                            modernStyles.filtre,
                            duzenlemeKategorisi === item &&
                              styles.optionChipActive,
                          ]}
                          onPress={() => setDuzenlemeKategorisi(item)}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              duzenlemeKategorisi === item &&
                                styles.optionTextActive,
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <Text style={[styles.label, modernStyles.etiket]}>Miktar</Text>
                    <TextInput
                      style={[styles.input, modernStyles.input]}
                      keyboardType="decimal-pad"
                      value={duzenlemeMiktari}
                      onChangeText={setDuzenlemeMiktari}
                    />
                    <Text style={[styles.label, modernStyles.etiket]}>Birim</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionsRow}
                    >
                      {BIRIMLER.map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            styles.optionChip,
                            modernStyles.filtre,
                            duzenlemeBirimi === item &&
                              styles.optionChipActive,
                          ]}
                          onPress={() => setDuzenlemeBirimi(item)}
                        >
                          <Text
                            style={[
                              styles.optionText,
                              duzenlemeBirimi === item &&
                                styles.optionTextActive,
                            ]}
                          >
                            {item}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.cancelButton]}
                        onPress={duzenlemeyiIptal}
                      >
                        <Text style={styles.cancelButtonText}>
                          İptal
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.saveButton]}
                        onPress={duzenlemeyiKaydet}
                      >
                        <Text style={styles.saveButtonText}>
                          Kaydet
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.productName, modernStyles.urunAdi]}>
                        {urun.ad}
                      </Text>
                      <SonTarihRozeti gun={kalanGun(urun.sonTarih)} />
                    </View>
                    <Text style={styles.categoryText}>
                      {urun.kategori}
                    </Text>
                    <Text style={styles.quantityText}>
                      Miktar: {miktariGoster(urun.miktar)} {urun.birim}
                    </Text>
                    <Text style={styles.date}>
                      Son tüketim: {tarihiGoster(urun.sonTarih)}
                    </Text>
                    <TouchableOpacity
                      style={styles.detailButton}
                      onPress={() => setDetayUrunId(urun.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${urun.ad} ürün detayları ve stok hareketleri`}
                    >
                      <Text style={styles.detailButtonText}>
                        📋 Detaylar ve Stok Hareketleri  ›
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={[
                        styles.warning,
                        { color: renkler.metin },
                      ]}
                    >
                      {durum.metin}
                    </Text>
                    {/* YENİ: Tüketim ve israf butonları */}
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.consumedButton]}
                        onPress={() => urunTamamla(urun, 'tuketildi')}
                      >
                        <Text style={styles.consumedButtonText}>
                          ✓ Tüketildi
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.wastedButton]}
                        onPress={() => urunTamamla(urun, 'israf')}
                      >
                        <Text style={styles.wastedButtonText}>
                          İsraf Edildi
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.editButton]}
                        onPress={() => duzenlemeyiBaslat(urun)}
                      >
                        <Text style={styles.editButtonText}>
                          ✏️ Düzenle
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, modernStyles.islemButonu, styles.deleteButton]}
                        onPress={() => urunSil(urun.id)}
                      >
                        <Text style={styles.deleteButtonText}>
                          🗑 Sil
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            );
          })
        )}
            </>
  );
}
