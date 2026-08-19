'use client'

import { useFormStatus } from 'react-dom'
import type { ButtonHTMLAttributes } from 'react'

// For forms whose action is a server action passed straight to <form action={...}>
// (no useActionState wrapper) — useFormStatus reads pending state from the nearest
// ancestor <form> regardless of how its action was defined.
export default function SubmitButton({
  children,
  pendingText,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className ?? ''} disabled:cursor-not-allowed disabled:opacity-50`}
      {...props}
    >
      {pending && pendingText ? pendingText : children}
    </button>
  )
}
