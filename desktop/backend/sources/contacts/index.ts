import { execSync } from 'child_process'
import { apiRequest } from '../../lib/contexter-api'

export type Contact = {
  id: string
  firstName: string | null
  lastName: string | null
  organization: string | null
  emails: string[]
  phoneNumbers: string[]
}

const APPLESCRIPT = `
tell application "Contacts"
  set output to ""
  repeat with aPerson in people
    set personId to id of aPerson
    set personFirstName to first name of aPerson
    set personLastName to last name of aPerson
    set personOrg to organization of aPerson

    set emailList to ""
    repeat with anEmail in emails of aPerson
      if emailList is not "" then
        set emailList to emailList & ","
      end if
      set emailList to emailList & (value of anEmail as string)
    end repeat

    set phoneList to ""
    repeat with aPhone in phones of aPerson
      if phoneList is not "" then
        set phoneList to phoneList & ","
      end if
      set phoneList to phoneList & (value of aPhone as string)
    end repeat

    if output is not "" then
      set output to output & "\\n"
    end if
    set output to output & personId & "\\t" & personFirstName & "\\t" & personLastName & "\\t" & personOrg & "\\t" & emailList & "\\t" & phoneList
  end repeat
  return output
end tell
`

function parseAppleScriptOutput(output: string): Contact[] {
  const lines = output.trim().split('\n')
  const contacts: Contact[] = []

  for (const line of lines) {
    if (!line.trim()) {
      continue
    }

    const parts = line.split('\t')
    if (parts.length < 6) {
      continue
    }

    const [id, firstName, lastName, organization, emails, phones] = parts

    contacts.push({
      id: id || '',
      firstName: firstName === 'missing value' ? null : firstName || null,
      lastName: lastName === 'missing value' ? null : lastName || null,
      organization: organization === 'missing value' ? null : organization || null,
      emails: emails ? emails.split(',').filter(Boolean) : [],
      phoneNumbers: phones ? phones.split(',').filter(Boolean) : [],
    })
  }

  return contacts
}

export function fetchContacts(): Contact[] {
  const output = execSync(`osascript -e '${APPLESCRIPT}'`, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  })

  return parseAppleScriptOutput(output)
}

export async function uploadContacts(contacts: Contact[]): Promise<void> {
  if (contacts.length === 0) {
    return
  }

  await apiRequest({
    path: '/api/contacts',
    body: { contacts },
  })

  console.log(`Uploaded ${contacts.length} contacts successfully`)
}
