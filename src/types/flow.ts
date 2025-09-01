// Flow-specific type definitions for consistent ID handling
export type PersonId = string
export type ItemId = string

// Flow assignment represents a person assigned to an item
export type FlowAssignment = PersonId

// Assignment map maps item IDs to arrays of person IDs
export type AssignmentMap = Record<ItemId, PersonId[]>

// Helper type for getting item assignments
export type GetItemAssignments = (itemId: ItemId) => PersonId[]
