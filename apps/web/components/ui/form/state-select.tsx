import { SelectItem } from "@workspace/ui/components/select"
import states from "@workspace/ui/lib/states.json"

export function StateSelectItems() {
  return Object.entries(states).map(([abbreviation, name]) => (
    <SelectItem key={abbreviation} value={abbreviation}>
      {name}
    </SelectItem>
  ))
}