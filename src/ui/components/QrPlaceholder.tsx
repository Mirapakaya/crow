/**
 * The space a QR code or the camera viewfinder will occupy, held while the QR
 * chunk loads, so the invite text and buttons below do not jump when it
 * arrives.
 */
export function QrPlaceholder({ scanner = false }: { scanner?: boolean }) {
  if (scanner)
    return (
      <div
        className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-lg bg-black"
        aria-hidden="true"
      />
    )
  return (
    <div className="grid place-items-center rounded-lg bg-white p-4 w-fit mx-auto" aria-hidden="true">
      <span className="block aspect-square" style={{ width: '9rem', height: '9rem' }} />
    </div>
  )
}
