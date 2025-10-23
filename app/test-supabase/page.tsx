'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabase() {
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const test = async () => {
      try {
        const { data, error } = await supabase.from('users').select('*').limit(1)
        if (error) throw error
        setResult({ status: 'success', data })
      } catch (error: any) {
        setResult({ status: 'error', message: error.message })
      }
    }
    test()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <h1 className="text-xl font-semibold mb-4">Supabase Connection Test</h1>
      <pre className="bg-white shadow p-4 rounded w-[90%] max-w-xl overflow-auto text-sm">
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  )
}
