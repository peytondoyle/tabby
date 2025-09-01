import React, { useRef, useEffect } from 'react'
import { useFlowStore } from '@/lib/flowStore'

interface ShareGraphicsProps {
  isOpen: boolean
  onClose: () => void
}

export const ShareGraphics: React.FC<ShareGraphicsProps> = ({ isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { people, items, bill, computeBillTotals } = useFlowStore()
  const { personTotals, billTotal } = computeBillTotals()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price)
  }

  const getPersonItems = (personId: string) => {
    return items.filter(item => {
      const assignments = useFlowStore.getState().getItemAssignments(item.id)
      return assignments.includes(personId)
    })
  }

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = 600
    canvas.height = 800

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#0E1116')
    gradient.addColorStop(1, '#12161D')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Header
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 32px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('🐱 Tabby', canvas.width / 2, 60)
    
    ctx.font = '20px system-ui'
    ctx.fillStyle = '#A3AEC2'
    ctx.fillText('Bill Split', canvas.width / 2, 90)

    // Restaurant info
    ctx.font = 'bold 24px system-ui'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(bill?.title || 'Restaurant', canvas.width / 2, 130)
    
    ctx.font = '16px system-ui'
    ctx.fillStyle = '#A3AEC2'
    ctx.fillText(bill?.place || 'Location', canvas.width / 2, 155)

    // People and their items
    let yOffset = 200
    personTotals.forEach((personTotal) => {
      const person = people.find(p => p.id === personTotal.personId)
      if (!person) return

      // Person header
      ctx.fillStyle = '#2F6BFF'
      ctx.font = 'bold 20px system-ui'
      ctx.textAlign = 'left'
      ctx.fillText(`${person.name}`, 40, yOffset)
      
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 18px system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(formatPrice(personTotal.total), canvas.width - 40, yOffset)

      yOffset += 30

      // Person's items
      const personItems = getPersonItems(person.id)
      personItems.forEach(item => {
        ctx.fillStyle = '#FFFFFF'
        ctx.font = '16px system-ui'
        ctx.textAlign = 'left'
        ctx.fillText(`${item.emoji || '🍽️'} ${item.label}`, 60, yOffset)
        
        ctx.textAlign = 'right'
        ctx.fillText(formatPrice(item.price), canvas.width - 40, yOffset)
        
        yOffset += 25
      })

      yOffset += 20
    })

    // Total
    ctx.strokeStyle = '#1F2630'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(40, yOffset)
    ctx.lineTo(canvas.width - 40, yOffset)
    ctx.stroke()

    yOffset += 30

    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 24px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText('Total', 40, yOffset)
    
    ctx.textAlign = 'right'
    ctx.fillText(formatPrice(billTotal), canvas.width - 40, yOffset)

    // Footer
    yOffset += 60
    ctx.fillStyle = '#A3AEC2'
    ctx.font = '14px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('Split with Tabby 🐱', canvas.width / 2, yOffset)

  }, [isOpen, people, items, bill, personTotals, billTotal])

  const handleDownload = () => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = `tabby-split-${bill?.title || 'bill'}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const handleShare = async () => {
    if (!canvasRef.current) return
    
    const canvas = canvasRef.current
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
      }, 'image/png')
    })

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${bill?.title || 'Bill'} Split`,
          text: `Check out our bill split from ${bill?.title || 'the restaurant'}!`,
          files: [new File([blob], 'tabby-split.png', { type: 'image/png' })]
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err)
          handleDownload()
        }
      }
    } else {
      handleDownload()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Share Bill Split</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-paper rounded-full transition-all duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preview */}
        <div className="bg-paper rounded-xl p-4 mb-4 flex justify-center">
          <div className="w-full max-w-md mx-auto">
            <canvas
              ref={canvasRef}
              className="w-full h-auto rounded-lg shadow-lg"
              style={{ maxHeight: '400px' }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 py-3 bg-brand hover:bg-brand/90 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span>Share</span>
          </button>
          
          <button
            onClick={handleDownload}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  )
}
