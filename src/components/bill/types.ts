export interface PersonData {
  id: string
  name: string
  isYou?: boolean
  avatarUrl?: string
  color?: string
}

export interface ItemData {
  id: string
  name: string
  price: number
  icon?: string   // Legacy - prefer emoji
  emoji?: string  // Preferred field name
  category?: string
}
