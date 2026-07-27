import iconUrl from '../assets/icon.svg'

export function BrandMark(): React.JSX.Element {
  return (
    <div className="brand-mark" aria-hidden>
      <img src={iconUrl} alt="" width={36} height={36} />
    </div>
  )
}
