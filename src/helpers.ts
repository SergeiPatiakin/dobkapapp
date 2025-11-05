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
