/**
 * CRC-16/CCITT-FALSE Calculator for EMVCo QRIS Strings (ISO/IEC 13239)
 * Used across ASPI SNAP QRIS and Bank Jatim QRIS standards.
 */
export function calculateCRC16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Builds standard ASPI / Bank Jatim compliant Dynamic QRIS string
 */
export function buildDynamicQrisString(idInvoice: string, nominal: number, merchantId: string = 'DLH_LUMAJANG_01'): string {
  const padNominal = nominal.toString();
  const basePayload = `00020101021226670016ID.GOV.DLH.LUMAJANG0118936009140000000000021552049399530336054${padNominal.length.toString().padStart(2, '0')}${padNominal}5802ID5912DLH LUMAJANG6008LUMAJANG61056731162190715${idInvoice}6304`;
  return basePayload + calculateCRC16(basePayload);
}
