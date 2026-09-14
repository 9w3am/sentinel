import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createLocalApi } from './localApi'
import { createSupabaseApi } from './supabaseApi'
import type { Api, Session } from './types'
import { WORLD } from '../config/world'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const forceLocal = import.meta.env.VITE_BACKEND === 'local'

export const api: Api = url && key && !forceLocal ? createSupabaseApi(url, key) : createLocalApi()

// ── 인증 상태
interface AuthState {
  session: Session | null
  loading: boolean
  refresh: () => Promise<void>
}
const AuthCtx = createContext<AuthState>({ session: null, loading: true, refresh: async () => {} })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      setSession(await api.getSession())
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    return api.onAuthChange(refresh)
  }, [refresh])

  return <AuthCtx.Provider value={{ session, loading, refresh }}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)

// ── 비동기 데이터
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const seq = useRef(0)

  const reload = useCallback(async () => {
    const n = ++seq.current
    setLoading(true)
    try {
      const d = await fnRef.current()
      if (n === seq.current) {
        setData(d)
        setError(null)
      }
    } catch (e) {
      if (n === seq.current) setError(e)
    } finally {
      if (n === seq.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, error, loading, reload, setData }
}

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${WORLD.orgName}` : `${WORLD.orgName} 공식 누리집`
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
}
