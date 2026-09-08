import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

export default function DmaMultiSelect({ value = [], onChange }) {
  const [options, setOptions] = useState([])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    supabase
      .from('dma')
      .select('id, dma_code, dma_name')
      .eq('active', true)
      .order('dma_name')
      .then(({ data }) => setOptions(data || []))
  }, [])

  useEffect(() => {
    function onClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const selectedIds = new Set(value.map((v) => v.id))
  const filtered = options.filter(
    (o) => !selectedIds.has(o.id) && (o.dma_name.includes(query) || o.dma_code.includes(query))
  )

  function addDma(o) {
    onChange([...value, o])
    setQuery('')
  }
  function removeDma(id) {
    onChange(value.filter((v) => v.id !== id))
  }

  return (
    <div ref={boxRef} className="relative">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {value.map((v) => (
            <span
              key={v.id}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium"
            >
              {v.dma_name}
              <button type="button" onClick={() => removeDma(v.id)} className="hover:text-blue-900">
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="ค้นหา DMA..."
        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => addDma(o)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 text-slate-700"
            >
              {o.dma_name} <span className="text-slate-400 text-xs">({o.dma_code})</span>
            </button>
          ))}
        </div>
      )}
      {value.length === 0 && (
        <p className="text-xs text-amber-600 mt-1">ต้องเลือก DMA อย่างน้อย 1 พื้นที่ (เลือกจากรายการเท่านั้น พิมพ์ชื่อเองไม่ได้)</p>
      )}
    </div>
  )
}
