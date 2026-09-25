import { useState } from 'react'

export default function Tooltip({ label, children }) {
  const [show, setShow] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-3 border border-white/10 px-2.5 py-1 text-[11px] text-white shadow-lg z-20">
          {label}
        </span>
      )}
    </span>
  )
}
