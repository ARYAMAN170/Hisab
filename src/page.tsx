import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Edit2,
  LogOut,
  Menu,
  Plus,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { isSupabaseConfigured, supabase } from './utils/supabase'

type TxType = 'INCOME' | 'EXPENSE'

type TransactionRow = {
  id: string
  created_at: string
  type: TxType
  amount: number
  description: string
  category?: string | null
  user_id?: string | null
  user_email?: string | null
}

export default function Dashboard() {
  const navigate = useNavigate()
  const supabaseReady = Boolean(isSupabaseConfigured && supabase)
  const supabaseClient = supabase as NonNullable<typeof supabase>

  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [loading, setLoading] = useState(true)

  const [currentUser, setCurrentUser] = useState<any>(null)

  // UI state
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('THIS_MONTH')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Form/Edit state
  const [amount, setAmount] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState('General')
  const [type, setType] = useState<TxType>('EXPENSE')
  const [editingId, setEditingId] = useState<string | null>(null)

  const displayName =
    (currentUser?.user_metadata?.full_name as string | undefined)?.trim() ||
    (currentUser?.email as string | undefined)?.split('@')?.[0] ||
    'User'

  useEffect(() => {
    async function init() {
      if (!supabaseReady) {
        setLoading(false)
        return
      }
      const {
        data: { session },
      } = await supabaseClient.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }
      setCurrentUser(session.user)
      fetchTransactions()
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  async function fetchTransactions() {
    if (!supabaseReady) {
      setLoading(false)
      setTransactions([])
      return
    }
    setLoading(true)
    const { data, error } = await supabaseClient
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching transactions:', error)
      setTransactions([])
    } else {
      setTransactions((data ?? []) as TransactionRow[])
    }
    setLoading(false)
  }

  const uniqueUsers = useMemo(() => {
    const emails = transactions
      .map((t) => t.user_email)
      .filter((email): email is string => Boolean(email))
    return [...new Set(emails)].sort((a, b) => a.localeCompare(b))
  }, [transactions])

  const categoryOptions = useMemo(() => {
    const defaults = [
      'Online',
      'Cash',
    ]

    const existing = transactions
      .map((t) => t.category)
      .filter((c): c is string => Boolean(c && c.trim()))
      .map((c) => c.trim())

    const seen = new Set<string>()
    const out: string[] = []

    for (const c of defaults) {
      const key = c.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(c)
    }

    const extra = [...new Set(existing)].filter((c) => !seen.has(c.toLowerCase()))
    extra.sort((a, b) => a.localeCompare(b))
    out.push(...extra)

    return out
  }, [transactions])

  const activeDateRange = useMemo(() => {
    const now = new Date()
    if (dateRange === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      return { start, end }
    }
    if (dateRange === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      return { start, end }
    }
    if (!customStart && !customEnd) return null

    const start = customStart ? new Date(customStart) : null
    const end = customEnd ? new Date(customEnd) : null

    if (start && Number.isNaN(start.getTime())) return null
    if (end && Number.isNaN(end.getTime())) return null

    const normalizedEnd = end
      ? new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999)
      : null

    return {
      start: start ?? null,
      end: normalizedEnd ?? null,
    }
  }, [dateRange, customStart, customEnd])

  const visibleTransactions = useMemo(() => {
    const search = searchQuery.trim().toLowerCase()
    return transactions.filter((t) => {
      if (selectedUserFilter && t.user_email !== selectedUserFilter) return false

      if (categoryFilter !== 'ALL') {
        const normalizedCategory = (t.category ?? 'General').trim() || 'General'
        if (normalizedCategory !== categoryFilter) return false
      }

      if (search) {
        const haystack = `${t.description ?? ''} ${t.category ?? ''} ${t.user_email ?? ''}`
          .toLowerCase()
          .trim()
        if (!haystack.includes(search)) return false
      }

      if (activeDateRange) {
        const createdAt = new Date(t.created_at)
        if (activeDateRange.start && createdAt < activeDateRange.start) return false
        if (activeDateRange.end && createdAt > activeDateRange.end) return false
      }

      return true
    })
  }, [transactions, selectedUserFilter, categoryFilter, searchQuery, activeDateRange])

  const totalIncome = useMemo(() => {
    return visibleTransactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  }, [visibleTransactions])

  const totalExpense = useMemo(() => {
    return visibleTransactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
  }, [visibleTransactions])

  async function insertTransaction(payload: {
    amount: number
    description: string
    category: string
    type: TxType
    user_email: string
  }) {
    const insertWithSelect = async (insertPayload: Record<string, unknown>) => {
      const { data, error } = await supabaseClient
        .from('transactions')
        .insert([insertPayload])
        .select('*')
        .single()
      return { data: data as TransactionRow | null, error }
    }

    // Some schemas have `user_id`; some don't. Try with user_id first, then fallback.
    let result = await insertWithSelect({ ...payload, user_id: currentUser?.id })
    if (!result.error) return result

    const msg = (result.error as any)?.message ?? ''
    const looksLikeMissingUserId =
      msg.includes('user_id') &&
      (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('column'))

    if (!looksLikeMissingUserId) return { data: null, error: result.error }

    result = await insertWithSelect(payload)
    if (!result.error) return result

    // Some older schemas might not have `category`.
    const retryMsg = (result.error as any)?.message ?? ''
    const looksLikeMissingCategory =
      retryMsg.includes('category') &&
      (retryMsg.includes('schema cache') || retryMsg.includes('does not exist') || retryMsg.includes('column'))

    if (!looksLikeMissingCategory) return { data: null, error: result.error }

    result = await insertWithSelect({
      amount: payload.amount,
      description: payload.description,
      type: payload.type,
      user_email: payload.user_email,
    })

    return result
  }

  function isOwnTransaction(t: TransactionRow) {
    const currentUserId = currentUser?.id as string | undefined
    const currentUserEmail = currentUser?.email as string | undefined

    if (t.user_id && currentUserId && t.user_id === currentUserId) return true
    if (t.user_email && currentUserEmail && t.user_email === currentUserEmail) return true
    return false
  }

  async function updateOwnTransaction(
    id: string,
    patch: { amount: number; description: string; category: string; type: TxType }
  ) {
    // Prefer user_id enforcement when available, otherwise fall back to user_email.
    const { error: tryUserIdError } = await supabaseClient
      .from('transactions')
      .update(patch)
      .eq('id', id)
      .eq('user_id', currentUser?.id)

    if (!tryUserIdError) return null

    const msg = (tryUserIdError as any)?.message ?? ''
    const looksLikeMissingUserId =
      msg.includes('user_id') &&
      (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('column'))

    if (!looksLikeMissingUserId) return tryUserIdError

    const { error: retryError } = await supabaseClient
      .from('transactions')
      .update(patch)
      .eq('id', id)
      .eq('user_email', currentUser?.email)

    if (!retryError) return null

    const retryMsg = (retryError as any)?.message ?? ''
    const looksLikeMissingCategory =
      retryMsg.includes('category') &&
      (retryMsg.includes('schema cache') || retryMsg.includes('does not exist') || retryMsg.includes('column'))

    if (!looksLikeMissingCategory) return retryError

    const { error: retryWithoutCategoryError } = await supabaseClient
      .from('transactions')
      .update({ amount: patch.amount, description: patch.description, type: patch.type })
      .eq('id', id)
      .eq('user_email', currentUser?.email)

    return retryWithoutCategoryError ?? null
  }

  async function deleteOwnTransaction(id: string) {
    const { error: tryUserIdError } = await supabaseClient
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser?.id)

    if (!tryUserIdError) return null

    const msg = (tryUserIdError as any)?.message ?? ''
    const looksLikeMissingUserId =
      msg.includes('user_id') &&
      (msg.includes('schema cache') || msg.includes('does not exist') || msg.includes('column'))

    if (!looksLikeMissingUserId) return tryUserIdError

    const { error: retryError } = await supabaseClient
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('user_email', currentUser?.email)

    return retryError ?? null
  }

  async function handleSaveTransaction() {
    if (!currentUser) return
    if (!amount || !desc) return alert('Please fill details')

    const normalizedAmount = amount.trim().replace(',', '.')
    const normalizedCategory = (category || 'General').trim() || 'General'
    const normalizedDesc = desc.trim()

    const numericAmount = Number.parseFloat(normalizedAmount)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (editingId) {
      const existing = transactions.find((t) => t.id === editingId)
      if (!existing || !isOwnTransaction(existing)) {
        alert('You can only edit your own transactions.')
        cancelEditing()
        return
      }

      const error = await updateOwnTransaction(editingId, {
        amount: numericAmount,
        description: normalizedDesc,
        category: normalizedCategory,
        type,
      })
      if (error) {
        alert(`Error updating transaction: ${(error as any).message ?? 'unknown error'}`)
        return
      }
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                amount: numericAmount,
                description: normalizedDesc,
                category: normalizedCategory,
                type,
              }
            : t
        )
      )
    } else {
      const { data, error } = await insertTransaction({
        amount: numericAmount,
        description: normalizedDesc,
        category: normalizedCategory,
        type,
        user_email: currentUser.email,
      })
      if (error) {
        alert(`Error adding transaction: ${(error as any).message ?? 'unknown error'}`)
        return
      }
      if (data) {
        setTransactions((prev) => [data, ...prev])
      } else {
        fetchTransactions()
      }
    }

    setAmount('')
    setDesc('')
    setCategory('General')
    setType('EXPENSE')
    setEditingId(null)
    fetchTransactions()
  }

  function handleEditClick(t: TransactionRow) {
    if (!isOwnTransaction(t)) {
      alert('You can only edit your own transactions.')
      return
    }
    setEditingId(t.id)
    setAmount(String(t.amount ?? ''))
    setDesc(t.description ?? '')
    setCategory((t.category ?? 'General') || 'General')
    setType(t.type)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDeleteClick(id: string) {
    if (!window.confirm('Are you sure?')) return

    const existing = transactions.find((t) => t.id === id)
    if (!existing || !isOwnTransaction(existing)) {
      alert('You can only delete your own transactions.')
      return
    }

    const error = await deleteOwnTransaction(id)
    if (error) {
      alert(`Error deleting transaction: ${(error as any).message ?? 'unknown error'}`)
      return
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id))

    if (editingId === id) {
      setEditingId(null)
      setAmount('')
      setDesc('')
      setCategory('General')
      setType('EXPENSE')
    }

  }

  function cancelEditing() {
    setEditingId(null)
    setAmount('')
    setDesc('')
    setCategory('General')
    setType('EXPENSE')
  }

  if (!currentUser) return null

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 relative">
      {/* Sidebar overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <div className="bg-black text-white p-1.5 rounded-lg">
                <Wallet size={18} />
              </div>
              <div className="font-bold text-slate-900">EasyHisab</div>
            </div>
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              My Profile
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-slate-200 p-2 rounded-full">
                <User size={18} className="text-slate-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{displayName}</div>
                <div className="text-xs text-slate-500 truncate">{currentUser.email}</div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Users size={14} /> Team Members
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSelectedUserFilter(null)
                  setIsMenuOpen(false)
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !selectedUserFilter
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                All Members
              </button>
              {uniqueUsers.map((email) => (
                <button
                  key={email}
                  onClick={() => {
                    setSelectedUserFilter(email)
                    setIsMenuOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedUserFilter === email
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {email.split('@')[0]}
                </button>
              ))}
              {uniqueUsers.length === 0 && (
                <div className="text-sm text-slate-400 px-3 py-2">No team activity yet.</div>
              )}
            </div>
          </div>

          <button
            onClick={() => supabaseClient.auth.signOut().then(() => navigate('/login'))}
            className="mt-6 flex items-center gap-2 text-red-600 font-semibold text-sm p-2 hover:bg-red-50 rounded-lg transition-colors w-full"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg -ml-2 text-slate-700"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="font-bold text-slate-900">Dashboard</div>
          </div>
          {selectedUserFilter && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
              viewing {selectedUserFilter.split('@')[0]}
            </span>
          )}
        </div>
      </div>

      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Filter banner */}
        {selectedUserFilter && (
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex justify-between items-center">
            <div className="flex items-center gap-2">
              <User size={16} className="text-blue-600" />
              <span className="text-sm text-blue-800 font-medium">
                Filtered by <span className="font-bold">{selectedUserFilter.split('@')[0]}</span>
              </span>
            </div>
            <button
              onClick={() => setSelectedUserFilter(null)}
              className="bg-white p-1 rounded-full shadow-sm border text-slate-500 hover:text-slate-900"
              aria-label="Clear filter"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Scorecards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2 text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full text-xs font-semibold">
              <TrendingUp size={12} /> Received
            </div>
            <div className="text-2xl font-bold text-slate-900">₹{totalIncome.toLocaleString()}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2 text-rose-600 bg-rose-50 w-fit px-2 py-1 rounded-full text-xs font-semibold">
              <TrendingDown size={12} /> Spent
            </div>
            <div className="text-2xl font-bold text-slate-900">₹{totalExpense.toLocaleString()}</div>
          </div>
        </div>

        {/* Audit Tool */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Audit</h3>
            <span className="text-xs text-slate-500">{visibleTransactions.length} results</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Date Range</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDateRange('THIS_MONTH')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    dateRange === 'THIS_MONTH'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  This Month
                </button>
                <button
                  onClick={() => setDateRange('LAST_MONTH')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    dateRange === 'LAST_MONTH'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Last Month
                </button>
                <button
                  onClick={() => setDateRange('CUSTOM')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    dateRange === 'CUSTOM'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Custom
                </button>
              </div>
              {dateRange === 'CUSTOM' && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700"
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 bg-slate-50"
                >
                  <option value="ALL">All categories</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Smart Search</label>
                <input
                  type="text"
                  placeholder="e.g. advance payment"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Form (hidden while filtering, unless editing) */}
        {(!selectedUserFilter || editingId) && (
          <div
            className={`bg-white p-5 rounded-2xl shadow-sm border ${
              editingId ? 'border-amber-200 ring-2 ring-amber-100' : 'border-slate-100'
            }`}
          >
            {editingId && (
              <div className="mb-3 text-xs font-bold text-amber-700 uppercase tracking-widest flex justify-between items-center">
                <span>Editing record</span>
                <button
                  onClick={cancelEditing}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Cancel edit"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
              <button
                onClick={() => setType('INCOME')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  type === 'INCOME'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Income
              </button>
              <button
                onClick={() => setType('EXPENSE')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                  type === 'EXPENSE'
                    ? 'bg-white text-rose-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Expense
              </button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <span
                  className={`absolute left-3 top-3 font-serif ${
                    type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  ₹
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  enterKeyHint="done"
                  autoComplete="off"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 text-lg font-semibold text-slate-900 placeholder:text-slate-300 transition-colors ${
                    type === 'INCOME'
                      ? 'bg-emerald-50 border-emerald-200 focus:ring-emerald-200'
                      : 'bg-rose-50 border-rose-200 focus:ring-rose-200'
                  }`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm text-slate-900"
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                placeholder="What was this for?"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm text-slate-900"
              />
              <button
                onClick={handleSaveTransaction}
                className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-lg flex justify-center items-center gap-2 active:scale-95 transition-transform ${
                  editingId
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                    : 'bg-slate-900 hover:bg-black text-white shadow-slate-900/10'
                }`}
              >
                {editingId ? <Save size={18} /> : <Plus size={18} />}
                {editingId ? 'Update Transaction' : 'Add Record'}
              </button>
            </div>
          </div>
        )}

        {/* History */}
        <div>
          <h3 className="font-bold text-slate-900 mb-3 px-1">Audit Results</h3>
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-sm">Loading transactions...</div>
          ) : (
            <div className="space-y-3">
              {visibleTransactions.map((t) => (
                <div
                  key={t.id}
                  className="bg-white p-4 rounded-xl shadow-sm border border-slate-100"
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{t.description}</div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        {new Date(t.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                        <span>•</span>
                        {t.category ? (
                          <span className="text-slate-500">{t.category}</span>
                        ) : (
                          <span className="text-slate-400">General</span>
                        )}
                        <span>•</span>
                        <button
                          onClick={() => t.user_email && setSelectedUserFilter(t.user_email)}
                          className="hover:text-blue-600 hover:underline decoration-blue-300 underline-offset-2 transition-colors font-medium text-slate-500"
                          title="Filter by this user"
                        >
                          {(t.user_email ?? 'unknown').split('@')[0]}
                        </button>
                      </div>
                    </div>
                    <div
                      className={`font-bold text-lg ${
                        t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {t.type === 'INCOME' ? '+' : '-'}₹{t.amount}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-50 flex justify-end gap-2">
                    {isOwnTransaction(t) ? (
                      <>
                        <button
                          onClick={() => handleEditClick(t)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(t.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400">Read only</span>
                    )}
                  </div>
                </div>
              ))}

              {visibleTransactions.length === 0 && (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-sm">No transactions found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
