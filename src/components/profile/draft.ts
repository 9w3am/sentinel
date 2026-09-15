// 꾸미기 창과 신청서 · 등록증 화면 사이에서 문서를 주고받는 임시 저장 (이 브라우저 localStorage)
import { useEffect, useRef } from 'react'
import { parseProfileDoc, type ProfileDoc } from './model'

const PREFIX = 'sa-doc-draft:'

export interface Draft {
  doc: ProfileDoc
  at: string
}

export function loadDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const o = JSON.parse(raw)
    const doc = parseProfileDoc(JSON.stringify(o?.doc))
    return doc ? { doc, at: typeof o.at === 'string' ? o.at : '' } : null
  } catch {
    return null
  }
}

export function saveDraft(key: string, doc: ProfileDoc, name?: string) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ doc, at: new Date().toISOString() }))
    if (name !== undefined) setDraftName(key, name)
  } catch {
    // 저장 공간이 없으면 조용히 넘어간다 (꾸미기 창이 따로 알려 준다)
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* 무시 */
  }
}

export function setDraftName(key: string, name: string) {
  try {
    localStorage.setItem(`${PREFIX}${key}:name`, name)
  } catch {
    /* 무시 */
  }
}
export function loadDraftName(key: string) {
  try {
    return localStorage.getItem(`${PREFIX}${key}:name`) ?? ''
  } catch {
    return ''
  }
}

/** 다른 창(꾸미기 창)에서 고친 문서를 바로 받아 온다 */
export function useDraftSync(key: string, onDoc: (doc: ProfileDoc) => void) {
  const cb = useRef(onDoc)
  cb.current = onDoc
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== PREFIX + key) return
      const d = loadDraft(key)
      if (d) cb.current(d.doc)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key])
}

export const studioPath = (key: string) => (key === 'apply' ? '/studio/apply' : `/studio/card/${key.replace(/^card:/, '')}`)

/** 꾸미기 창을 새 창으로 연다. 팝업이 막히면 같은 창에서 연다 */
export function openStudio(key: string) {
  const href = `#${studioPath(key)}`
  const w = window.open(href, '_blank')
  if (!w) window.location.hash = studioPath(key)
}
