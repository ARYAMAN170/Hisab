import { useState } from 'react'
import { supabase } from './utils/supabase'
import { useNavigate } from 'react-router-dom'
import { Wallet, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [view, setView] = useState<'LOGIN' | 'SIGNUP'>('LOGIN')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()



  const supabaseClient = supabase as NonNullable<typeof supabase>

  async function handleAuth() {
    setLoading(true)
    if (view === 'LOGIN') {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })
      if (error) {
        alert(error.message)
      } else {
        navigate('/')
      }
    } else {
      const { error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName,
          },
        },
      })
      if (error) {
        alert(error.message)
      } else {
        alert('Check your email for the confirmation link!')
        setView('LOGIN')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-4 text-white">
            <Wallet size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Hisab</h1>
          <p className="text-slate-400 text-sm">
            {view === 'LOGIN' ? 'Welcome back, team!' : 'Create your finance dashboard'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-4">
          
          {/* Display Name (Only for signup) */}
          {view === 'SIGNUP' && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Display Name</label>
              <input
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                placeholder="e.g. Dad, Manager"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1">
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
            <input
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1">
             <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            onClick={handleAuth} 
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-black text-white py-3.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex justify-center items-center gap-2 mt-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {view === 'LOGIN' ? 'Sign In' : 'Create Account'}
          </button>

          <div className="pt-4 text-center">
            <button 
              onClick={() => {
                setView(view === 'LOGIN' ? 'SIGNUP' : 'LOGIN')
                setDisplayName('')
              }}
              className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
            >
              {view === 'LOGIN' 
                ? "Don't have an account? Sign Up" 
                : "Already have an account? Log In"}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}