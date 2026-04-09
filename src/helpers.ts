import generateIpsString from 'ips-qr-code'
import QRCode from 'qrcode'

// Format RSD cents number to RSD amount string
export const formatRsdcAmount = (rsdc: number) => {
  const isNegative = rsdc < 0
  const abs = Math.abs(rsdc)
  const positiveCentsString = abs.toString().padStart(3, '0')
  const positiveDinarsString =
    positiveCentsString.substring(0, positiveCentsString.length - 2)
    + '.'
    + positiveCentsString.substring(positiveCentsString.length - 2)
  return (isNegative ? '-' : '') + positiveDinarsString
}

const MINFIN_SVRHA = "PP-OPO"
const MINFIN_NAZIV_PRIMAOCA = "Ministarstvo Finansija"
const MINFIN_RACUN = "840000000000484837"

// Get data URI for NBS IPS QR code.
// Payment reference must not be empty
export const getPaymentQrUri = async (
  taxPayableRsdc: number,
  paymentReference: string,
): Promise<string> => {
  const ipsString = await generateIpsString({
    nazivPlatioca: "-",
    svrhaPlacanja: MINFIN_SVRHA,
    nazivPrimaoca: MINFIN_NAZIV_PRIMAOCA,
    sifraPlacanja: "254",
    pozivNaBroj: '97' + paymentReference,
    iznos: "RSD" + formatRsdcAmount(taxPayableRsdc).replace('.', ','),
    racunPrimaoca: MINFIN_RACUN,
    kod: "PR",
    verzija: "01",
    znakovniSkup: 1,
  })
  const paymentQrUri = await QRCode.toDataURL(ipsString)
  return paymentQrUri
}
