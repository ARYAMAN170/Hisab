import { useState } from 'react'
import { isSupabaseConfigured, supabase } from './utils/supabase'
import { useNavigate, Link } from 'react-router-dom'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  if (!isSupabaseConfigured || !supabase) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold mb-3">Supabase is not configured</h1>
        <p className="text-slate-600 max-w-md">
          Add your Supabase URL and anon key in [.env](.env), then restart the dev server.
        </p>
      </div>
    )
  }

  const supabaseClient = supabase as NonNullable<typeof supabase>

  async function handleSignUp() {
    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
    })
    if (error) {
        alert(error.message)
    } else {
        alert("Check your email for the confirmation link!")
        navigate('/login')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-6">Create a new account</h1>
      <input
        className="border p-2 mb-2 w-full max-w-xs rounded"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        className="border p-2 mb-4 w-full max-w-xs rounded"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <div className="flex flex-col items-center gap-2">
        <button onClick={handleSignUp} className="bg-black text-white p-2 rounded px-4 w-full">Sign Up</button>
        <p className="text-sm">
            Already have an account? <Link to="/login" className="underline">Log in</Link>
        </p>
      </div>
    </div>
  )
}
