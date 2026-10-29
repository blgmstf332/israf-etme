
import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

type Props = {
  gun: number | null;
};

export function SonTarihRozeti({ gun }: Props) {
  let mesaj = 'Tarih bilinmiyor';
  let renk = '#64748B';
  let arkaPlan = '#F1F5F9';

  if (gun !== null) {
    if (gun < 0) {
      mesaj = `${Math.abs(gun)} gün geçti`;
      renk = '#B42318';
      arkaPlan = '#FEE9E7';
    } else if (gun === 0) {
      mesaj = 'Bugün son gün';
      renk = '#A56711';
      arkaPlan = '#FFF1D6';
    } else if (gun <= 3) {
      mesaj = `${gun} gün kaldı`;
      renk = '#A56711';
      arkaPlan = '#FFF1D6';
    } else {
      mesaj = `${gun} gün kaldı`;
      renk = '#247A43';
      arkaPlan = '#E3F5E9';
    }
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: arkaPlan },
      ]}
    >
      <Text style={[styles.text, { color: renk }]}>
        {mesaj}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginVertical: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
