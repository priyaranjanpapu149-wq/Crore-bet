import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Charts from './pages/Charts';
import JodiChart from './pages/JodiChart';
import PanaChart from './pages/PanaChart';
import Privacy from './pages/Privacy';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/charts" element={<Charts />} />
            <Route path="/charts/:market/jodi" element={<JodiChart />} />
            <Route path="/charts/:market/pana" element={<PanaChart />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}