import { lazy } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { OfficeLayout, SiteLayout } from './components/Layout'
import { AuthProvider } from './lib/backend'
import Home from './pages/Home'

// 첫 화면 외에는 필요할 때 불러온다
const About = lazy(() => import('./pages/About'))
const Apply = lazy(() => import('./pages/Apply'))
const ApplyCheck = lazy(() => import('./pages/Apply').then((m) => ({ default: m.ApplyCheck })))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const Guide = lazy(() => import('./pages/Guide'))
const Incidents = lazy(() => import('./pages/Incidents'))
const IncidentDetail = lazy(() => import('./pages/IncidentDetail'))
const NotFound = lazy(() => import('./pages/NotFound'))
const NoticeList = lazy(() => import('./pages/Notices').then((m) => ({ default: m.NoticeList })))
const NoticeDetail = lazy(() => import('./pages/Notices').then((m) => ({ default: m.NoticeDetail })))
const Registry = lazy(() => import('./pages/Registry'))
const RegistryDetail = lazy(() => import('./pages/RegistryDetail'))
const RegistryMap = lazy(() => import('./pages/RegistryMap'))
const Rules = lazy(() => import('./pages/Rules'))
const System = lazy(() => import('./pages/System'))
const TeamList = lazy(() => import('./pages/Teams').then((m) => ({ default: m.TeamList })))
const TeamDetail = lazy(() => import('./pages/Teams').then((m) => ({ default: m.TeamDetail })))
const Admin = lazy(() => import('./pages/admin/Admin'))
const BambooList = lazy(() => import('./pages/office/Bamboo').then((m) => ({ default: m.BambooList })))
const BambooNew = lazy(() => import('./pages/office/Bamboo').then((m) => ({ default: m.BambooNew })))
const BambooDetail = lazy(() => import('./pages/office/Bamboo').then((m) => ({ default: m.BambooDetail })))
const BoardList = lazy(() => import('./pages/office/Board').then((m) => ({ default: m.BoardList })))
const BoardNew = lazy(() => import('./pages/office/Board').then((m) => ({ default: m.BoardNew })))
const BoardDetail = lazy(() => import('./pages/office/Board').then((m) => ({ default: m.BoardDetail })))
const Bonds = lazy(() => import('./pages/office/Bonds'))
const CardForm = lazy(() => import('./pages/office/CardForm'))
const CaseList = lazy(() => import('./pages/office/Cases').then((m) => ({ default: m.CaseList })))
const CaseDetail = lazy(() => import('./pages/office/Cases').then((m) => ({ default: m.CaseDetail })))
const Inbox = lazy(() => import('./pages/office/Inbox'))
const Matching = lazy(() => import('./pages/office/Matching'))
const MyCards = lazy(() => import('./pages/office/MyCards'))
const Office = lazy(() => import('./pages/office/Office'))

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="rules" element={<Rules />} />
            <Route path="system" element={<System />} />
            <Route path="notices" element={<NoticeList />} />
            <Route path="notices/:id" element={<NoticeDetail />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="incidents/:id" element={<IncidentDetail />} />
            <Route path="registry" element={<Registry />} />
            <Route path="registry/map" element={<RegistryMap />} />
            <Route path="registry/:id" element={<RegistryDetail />} />
            <Route path="teams" element={<TeamList />} />
            <Route path="teams/:id" element={<TeamDetail />} />
            <Route path="guide" element={<Guide />} />
            <Route path="guide/sheet/:sheet" element={<Guide />} />
            <Route path="guide/:slug" element={<Guide />} />
            <Route path="apply" element={<Apply />} />
            <Route path="apply/check" element={<ApplyCheck />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="office" element={<OfficeLayout />}>
              <Route index element={<Office />} />
              <Route path="cards" element={<MyCards />} />
              <Route path="cards/new" element={<CardForm />} />
              <Route path="cards/:id/edit" element={<CardForm />} />
              <Route path="board" element={<BoardList />} />
              <Route path="board/new" element={<BoardNew />} />
              <Route path="board/:id" element={<BoardDetail />} />
              <Route path="bamboo" element={<BambooList />} />
              <Route path="bamboo/new" element={<BambooNew />} />
              <Route path="bamboo/:id" element={<BambooDetail />} />
              <Route path="cases" element={<CaseList />} />
              <Route path="cases/:id" element={<CaseDetail />} />
              <Route path="bonds" element={<Bonds />} />
              <Route path="matching" element={<Matching />} />
              <Route path="inbox" element={<Inbox />} />
              <Route path="admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
