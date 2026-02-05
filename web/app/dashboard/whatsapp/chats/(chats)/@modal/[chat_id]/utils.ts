import { type ContactLookup } from "../../../actions"

export function resolveContactName(
  contact: string,
  contactLookup: ContactLookup
): string {
  const normalizedPhone = contact.replace(/\D/g, "")
  const name = contactLookup[normalizedPhone]
  if (name) {
    return name
  }

  return formatPhone(contact)
}

export function formatPhone(phone: string): string {
  if (phone.startsWith("+")) {
    const digits = phone.slice(1)
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    return phone
  }
  return phone
}
