import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FAF5',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    paddingBottom: 45,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#247A43',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 15,
    marginBottom: 5,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    fontSize: 16,
    color: '#222222',
  },
  optionsRow: {
    gap: 8,
    paddingVertical: 3,
  },
  optionChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D5DDD5',
  },
  optionChipActive: {
    backgroundColor: '#247A43',
    borderColor: '#247A43',
  },
  optionText: {
    color: '#444444',
    fontSize: 14,
  },
  optionTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#247A43',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  disabledButton: {
    backgroundColor: '#9BBDA5',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  sortInfo: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 6,
  },
  card: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  productName: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#222222',
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoryText: {
    fontSize: 14,
    color: '#247A43',
    fontWeight: '600',
  },
  quantityText: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  date: {
    fontSize: 14,
    color: '#666666',
  },
  warning: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#777777',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 15,
  },
  editForm: {
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    backgroundColor: '#E3F0FF',
  },
  editButtonText: {
    color: '#1565C0',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FDE8E8',
  },
  deleteButtonText: {
    color: '#C62828',
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#EAEAEA',
  },
  cancelButtonText: {
    color: '#444444',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#247A43',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // YENİ: Genel durum sayaçları
  summaryRow: {
    flexDirection: 'row',
    gap: 9,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E3EBE4',
  },
  summaryNumber: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333333',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 5,
  },
  greenText: {
    color: '#247A43',
  },
  redText: {
    color: '#B42318',
  },
  // YENİ: Tüketim ve israf butonları
  consumedButton: {
    backgroundColor: '#247A43',
  },
  consumedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  wastedButton: {
    backgroundColor: '#FDE0DD',
  },
  wastedButtonText: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // YENİ: İşlem geçmişi kartları
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E3EBE4',
    borderRadius: 12,
    padding: 15,
    gap: 7,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  historyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222222',
    flexShrink: 1,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyDetail: {
    fontSize: 13,
    color: '#666666',
  },
  historyLink: {
    color: '#247A43',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  detailButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C9E6D1',
    backgroundColor: '#EFF8F1',
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  detailButtonText: {
    fontSize: 13,
    color: '#20693B',
    fontWeight: '700',
  },
});
