import { HashRouter, Route, Routes } from 'react-router-dom'
import { OfficeLayout, SiteLayout } from './components/Layout'
import { AuthProvider } from './lib/backend'
import About from './pages/About'
import AuthPage from './pages/AuthPage'
import Home from './pages/Home'
import Incidents from './pages/Incidents'
import NotFound from './pages/NotFound'
import { NoticeDetail, NoticeList } from './pages/Notices'
import Registry from './pages/Registry'
import RegistryDetail from './pages/RegistryDetail'
import RegistryMap from './pages/RegistryMap'
import System from './pages/System'
import Admin from './pages/admin/Admin'
import { BoardDetail, BoardList, BoardNew } from './pages/office/Board'
import Bonds from './pages/office/Bonds'
import CardForm from './pages/office/CardForm'
import Matching from './pages/office/Matching'
import MyCards from './pages/office/MyCards'
import Office from './pages/office/Office'

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="about" element={<About />} />
            <Route path="system" element={<System />} />
            <Route path="notices" element={<NoticeList />} />
            <Route path="notices/:id" element={<NoticeDetail />} />
            <Route path="incidents" element={<Incidents />} />
            <Route path="registry" element={<Registry />} />
            <Route path="registry/map" element={<RegistryMap />} />
            <Route path="registry/:id" element={<RegistryDetail />} />
            <Route path="auth" element={<AuthPage />} />
            <Route path="office" element={<OfficeLayout />}>
              <Route index element={<Office />} />
              <Route path="cards" element={<MyCards />} />
              <Route path="cards/new" element={<CardForm />} />
              <Route path="cards/:id/edit" element={<CardForm />} />
              <Route path="board" element={<BoardList />} />
              <Route path="board/new" element={<BoardNew />} />
              <Route path="board/:id" element={<BoardDetail />} />
              <Route path="bonds" element={<Bonds />} />
              <Route path="matching" element={<Matching />} />
              <Route path="admin" element={<Admin />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
