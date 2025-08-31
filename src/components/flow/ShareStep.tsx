import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useFlowStore } from '@/lib/flowStore'

interface ShareStepProps {
  onPrev: () => void
  onBack: () => void
}

export const ShareStep: React.FC<ShareStepProps> = ({ onPrev, onBack }) => {
  const { 
    people, 
    items, 
    bill,
    getTotalForPerson,
    getPersonItems
  } = useFlowStore()
  
  const [shareMode, setShareMode] = useState<'group' | 'individual' | null>(null)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const totalAmount = items.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0)

  const createGroupSummary = () => {
    const billTitle = bill?.title || 'Bill Split'
    const billPlace = bill?.place || ''
    
    let summary = `🧾 ${billTitle}\n`
    if (billPlace) summary += `📍 ${billPlace}\n`
    summary += `💰 Total: ${formatPrice(totalAmount)}\n\n`
    
    summary += `👥 Split between ${people.length} people:\n\n`
    
    people.forEach(person => {
      const personTotal = getTotalForPerson(person.id)
      const personItemIds = getPersonItems(person.id)
      const personItems = items.filter(item => personItemIds.includes(item.id))
      
      summary += `${person.name}: ${formatPrice(personTotal)}\n`
      
      if (personItems.length > 0) {
        personItems.forEach(item => {
          summary += `  • ${item.emoji} ${item.label}\n`
        })
      }
      summary += '\n'
    })
    
    summary += `Created with Tabby 🎉`
    return summary
  }

  const createIndividualSummary = (personId: string) => {
    const person = people.find(p => p.id === personId)
    if (!person) return ''
    
    const billTitle = bill?.title || 'Bill Split'
    const billPlace = bill?.place || ''
    const personTotal = getTotalForPerson(personId)
    const personItemIds = getPersonItems(personId)
    const personItems = items.filter(item => personItemIds.includes(item.id))
    
    let summary = `🧾 ${billTitle}\n`
    if (billPlace) summary += `📍 ${billPlace}\n\n`
    
    summary += `Hi ${person.name}! 👋\n`
    summary += `Your total: ${formatPrice(personTotal)}\n\n`
    
    if (personItems.length > 0) {
      summary += `Your items:\n`
      personItems.forEach(item => {
        summary += `• ${item.emoji} ${item.label} - ${formatPrice(item.price)}\n`
      })
      summary += '\n'
    }
    
    if (person.venmo_handle) {
      summary += `💸 Venmo: @${person.venmo_handle}\n`
    }
    
    summary += `\nCreated with Tabby 🎉`
    return summary
  }

  const handleShare = async (content: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: content
        })
      } catch (error) {
        // Fallback to clipboard
        await navigator.clipboard.writeText(content)
        alert('Summary copied to clipboard!')
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(content)
      alert('Summary copied to clipboard!')
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = content
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      alert('Summary copied to clipboard!')
    }
  }

  const handleGroupShare = () => {
    const summary = createGroupSummary()
    handleShare(summary, 'Bill Split Summary')
  }

  const handleIndividualShare = (personId: string) => {
    const summary = createIndividualSummary(personId)
    const person = people.find(p => p.id === personId)
    handleShare(summary, `Bill Summary for ${person?.name}`)
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">Share the Bill</h2>
        <p className="text-ink-dim">
          Send payment requests and summaries to everyone
        </p>
      </motion.div>

      {/* Bill Summary */}
      <motion.div 
        className="bg-card rounded-2xl border border-line p-6 mb-8"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="text-center mb-4">
          <div className="text-2xl font-bold text-brand">
            {formatPrice(totalAmount)}
          </div>
          <div className="text-sm text-ink-dim">
            Split between {people.length} people
          </div>
        </div>
        
        <div className="space-y-2">
          {people.map(person => (
            <div key={person.id} className="flex justify-between items-center py-2 border-b border-line last:border-b-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-brand/20 rounded-full flex items-center justify-center text-xs font-bold text-brand">
                  {person.name.charAt(0)}
                </div>
                <span className="font-medium">{person.name}</span>
              </div>
              <span className="font-semibold">
                {formatPrice(getTotalForPerson(person.id))}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Share Options */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Group Share */}
        <motion.button
          onClick={handleGroupShare}
          className="w-full flex items-center justify-center gap-3 px-8 py-6 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold text-lg shadow-lg transition-all"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
          👥 Share with Group
        </motion.button>

        {/* Individual Share */}
        <motion.button
          onClick={() => setShareMode(shareMode === 'individual' ? null : 'individual')}
          className="w-full flex items-center justify-center gap-3 px-8 py-6 bg-card hover:bg-card/80 border-2 border-line hover:border-brand/50 text-ink rounded-2xl font-bold text-lg transition-all"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          📱 Share Individually
        </motion.button>
      </motion.div>

      {/* Individual Share Options */}
      {shareMode === 'individual' && (
        <motion.div 
          className="mt-6 space-y-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <h3 className="font-bold text-center mb-4">Choose person to share with:</h3>
          
          {people.map(person => (
            <motion.button
              key={person.id}
              onClick={() => handleIndividualShare(person.id)}
              className="w-full flex items-center justify-between p-4 bg-card border border-line hover:border-brand/50 rounded-xl transition-all"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/20 rounded-full flex items-center justify-center font-bold text-brand">
                  {person.name.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="font-semibold">{person.name}</div>
                  <div className="text-sm text-ink-dim">
                    {formatPrice(getTotalForPerson(person.id))}
                  </div>
                </div>
              </div>
              
              <svg className="w-5 h-5 text-ink-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex gap-4 mt-8">
        <button
          onClick={onPrev}
          className="flex items-center gap-2 px-6 py-3 bg-card border border-line hover:border-brand/50 text-ink rounded-xl font-semibold transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        
        <button
          onClick={onBack}
          className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all"
        >
          ✅ Done
        </button>
      </div>
    </div>
  )
}