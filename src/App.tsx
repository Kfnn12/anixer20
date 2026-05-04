import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Details } from './pages/Details';
import { Search } from './pages/Search';
import { Watch } from './pages/Watch';
import { Schedule } from './pages/Schedule';
import { AZListPage } from './pages/AZListPage';
import { ListPage } from './pages/ListPage';
import { GenrePage } from './pages/GenrePage';
import { LegalPage } from './pages/LegalPage';
import { AZList } from './components/AZList';
import { Footer } from './components/Footer';
import { FirebaseProvider } from './FirebaseProvider';

export default function App() {
  return (
    <FirebaseProvider>
      <Router>
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#F27D26] selection:text-black flex flex-col">
          <Navbar />
          <main className="flex-1 min-h-[calc(100vh-200px)]">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/home" element={<Home />} />
              <Route path="/anime/:id" element={<Details />} />
              <Route path="/watch/:id" element={<Watch />} />
              <Route path="/search" element={<Search />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/az-list/:letter" element={<AZListPage />} />
              <Route path="/grid/:type" element={<ListPage />} />
              <Route path="/genre/:genre" element={<GenrePage />} />
              <Route path="/legal/:pageId" element={<LegalPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <AZList />
          <Footer />
        </div>
      </Router>
    </FirebaseProvider>
  );
}
