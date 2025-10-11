import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DndContext, 
  DragOverlay, 
  useDraggable, 
  useDroppable,
  closestCenter
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'

interface Person {
  id: string
  name: string
  avatar?: string
  color: string
}

interface Item {
  id: string
  label: string
  price: number
  emoji: string
  quantity?: number
  assignedTo?: string[]
}

interface DragDropAssignProps {
  people: Person[]
  items: Item[]
  onItemAssign: (itemId: string, personId: string) => void
  onItemUnassign: (itemId: string, personId: string) => void
  onMultiAssign: (itemId: string, peopleIds: string[]) => void
}

// Draggable Item Pill Component
const DraggableItem: React.FC<{ 
  item: Item, 
  isDragging?: boolean,
  isAssigned?: boolean 
}> = ({ item, isDragging, isAssigned }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: item.id,
    data: { item }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        inline-flex items-center gap-2 px-4 py-3 rounded-full cursor-grab active:cursor-grabbing
        ${isAssigned 
          ? 'bg-gray-700/50 border-2 border-gray-600' 
          : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50'
        }
        ${isDragging ? 'opacity-50 z-50' : ''}
        hover:scale-105 transition-all shadow-lg
      `}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      <span className="text-2xl">{item.emoji}</span>
      <span className="font-bold text-white">{item.label}</span>
      {item.quantity && item.quantity > 1 && (
        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">×{item.quantity}</span>
      )}
      <span className="text-sm text-green-400 font-mono">${item.price.toFixed(2)}</span>
    </motion.div>
  )
}

// Droppable Person Avatar Component
const DroppablePerson: React.FC<{ 
  person: Person, 
  assignedItems: Item[],
  isOver?: boolean 
}> = ({ person, assignedItems, isOver }) => {
  const { setNodeRef } = useDroppable({
    id: person.id,
    data: { person }
  })

  const totalAmount = assignedItems.reduce((sum, item) => sum + item.price, 0)

  return (
    <motion.div
      ref={setNodeRef}
      className={`
        flex flex-col items-center gap-3 p-4 rounded-2xl transition-all
        ${isOver ? 'bg-blue-600/30 scale-105 border-2 border-blue-400' : 'bg-gray-800/50'}
      `}
      animate={{ 
        scale: isOver ? 1.05 : 1,
        borderWidth: isOver ? '2px' : '1px',
        borderStyle: 'solid',
        borderColor: isOver ? 'rgb(96, 165, 250)' : 'transparent'
      }}
    >
      {/* Avatar */}
      <motion.div
        className={`
          w-20 h-20 ${person.color} rounded-full flex items-center justify-center 
          text-white font-bold text-2xl shadow-xl relative
          ${isOver ? 'ring-4 ring-blue-400 ring-offset-2 ring-offset-gray-900' : ''}
        `}
        animate={{ scale: isOver ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        {person.avatar ? (
          <img src={person.avatar} alt={person.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          person.name.charAt(0).toUpperCase()
        )}
        
        {/* Item count badge */}
        {assignedItems.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 bg-green-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-lg"
          >
            {assignedItems.length}
          </motion.div>
        )}
      </motion.div>

      {/* Name */}
      <span className="font-semibold text-white">{person.name}</span>

      {/* Total Amount */}
      {totalAmount > 0 && (
        <motion.span 
          className="text-sm text-green-400 font-mono"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          ${totalAmount.toFixed(2)}
        </motion.span>
      )}

      {/* Assigned Items Preview */}
      {assignedItems.length > 0 && (
        <div className="flex flex-wrap gap-1 max-w-[150px] justify-center">
          {assignedItems.slice(0, 3).map(item => (
            <span key={item.id} className="text-lg" title={item.label}>
              {item.emoji}
            </span>
          ))}
          {assignedItems.length > 3 && (
            <span className="text-xs text-gray-400">+{assignedItems.length - 3}</span>
          )}
        </div>
      )}
    </motion.div>
  )
}

export const DragDropAssign: React.FC<DragDropAssignProps> = ({
  people,
  items,
  onItemAssign
}) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<Record<string, string[]>>({})

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }


  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const itemId = active.id as string
      const personId = over.id as string
      
      // Update local state
      setAssignments(prev => ({
        ...prev,
        [itemId]: [...(prev[itemId] || []), personId]
      }))
      
      // Call parent handler
      onItemAssign(itemId, personId)
    }
    
    setActiveId(null)
    setOverId(null)
  }

  const getAssignedItems = (personId: string): Item[] => {
    return items.filter(item => 
      assignments[item.id]?.includes(personId) || 
      item.assignedTo?.includes(personId)
    )
  }

  const unassignedItems = items.filter(item => 
    !assignments[item.id]?.length && !item.assignedTo?.length
  )

  const activeItem = items.find(item => item.id === activeId)

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Assign Items</h2>
          <p className="text-gray-400">Drag items to people to split the bill</p>
        </div>

        {/* People Row */}
        <div className="flex justify-center gap-6 mb-12 flex-wrap">
          {people.map(person => (
            <DroppablePerson
              key={person.id}
              person={person}
              assignedItems={getAssignedItems(person.id)}
              isOver={overId === person.id}
            />
          ))}
        </div>

        {/* Divider */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-900 text-gray-400">Unassigned Items</span>
          </div>
        </div>

        {/* Unassigned Items Pool */}
        <motion.div 
          className="flex flex-wrap gap-3 justify-center min-h-[100px] p-6 rounded-2xl bg-white/6 border border-white/14"
          layout
        >
          <AnimatePresence>
            {unassignedItems.length > 0 ? (
              unassignedItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  layout
                >
                  <DraggableItem 
                    item={item} 
                    isDragging={activeId === item.id}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div 
                className="text-center py-8 text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-lg">All items assigned!</p>
                <p className="text-sm mt-1">Great job splitting the bill</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Instructions */}
        <motion.div 
          className="text-center mt-8 text-gray-500 text-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <p>💡 Tip: Double-click an item to split it between multiple people</p>
        </motion.div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeItem && (
          <motion.div
            initial={{ scale: 1.1 }}
            animate={{ scale: 1.15 }}
            className="cursor-grabbing"
          >
            <DraggableItem item={activeItem} isDragging />
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  )
}