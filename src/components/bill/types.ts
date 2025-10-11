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
  icon: string
  category?: string
}
