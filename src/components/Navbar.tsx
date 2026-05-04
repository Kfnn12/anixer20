import { Search, Menu, Home, Compass, User, X, LogOut, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../FirebaseProvider';

const GENRES = [
  'Action', 'Adventure', 'Cars', 'Comedy', 'Dementia', 'Demons', 'Drama', 'Ecchi', 
  'Fantasy', 'Game', 'Harem', 'Historical', 'Horror', 'Isekai', 'Josei', 'Kids', 
  'Magic', 'Martial Arts', 'Mecha', 'Military', 'Music', 'Mystery', 'Parody', 
  'Police', 'Psychological', 'Romance', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 
  'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai', 'Slice of Life', 'Space', 
  'Sports', 'Super Power', 'Supernatural', 'Thriller', 'Vampire'
];

export function Navbar() {
  const [query, setQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGenresOpen, setIsGenresOpen] = useState(false);
  const navigate = useNavigate();
  const { user, login, logout, loading } = useAuth();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setQuery('');
      setIsMenuOpen(false);
    }
  };

  return (
    <>
      <nav className="fixed top-0 z-50 w-full border-b border-[#1a1a1a] bg-[#050505]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMenuOpen(true)}
              className="rounded-md p-2 text-[#8E9299] transition-colors hover:bg-[#111111] hover:text-white md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/" className="flex items-center gap-1 group">
              <span className="text-2xl font-black italic tracking-tighter text-white transition-colors">
                ANIM<span className="text-[#F27D26]">X</span>ER
              </span>
            </Link>
          </div>

          <div className="hidden flex-1 items-center justify-center px-8 md:flex lg:px-12">
            <form onSubmit={handleSearch} className="relative w-full max-w-lg">
              <input
                type="text"
                placeholder="Search anime..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-full border border-[#1a1a1a] bg-[#111111] py-2 pl-12 pr-4 text-sm text-white placeholder-gray-500 transition-colors focus:border-[#F27D26] focus:outline-none focus:ring-1 focus:ring-[#F27D26]"
              />
              <Search className="absolute top-2.5 left-4 h-4 w-4 text-gray-500" />
            </form>
          </div>

          <div className="flex items-center gap-2">
            <button className="md:hidden rounded-full p-2 text-gray-400 hover:text-white" onClick={() => setIsMenuOpen(true)}>
                <Search className="h-5 w-5" />
            </button>
            <div className="hidden md:flex gap-4 items-center mr-4">
              <Link to="/home" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Home</Link>
              <Link to="/schedule" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Schedule</Link>
              
              <div 
                className="relative group"
                onMouseEnter={() => setIsGenresOpen(true)}
                onMouseLeave={() => setIsGenresOpen(false)}
              >
                <button className="flex items-center gap-1 text-sm font-medium text-gray-400 hover:text-white transition-colors py-2">
                  Genres <ChevronDown className="h-4 w-4" />
                </button>
                {isGenresOpen && (
                  <div className="absolute top-full right-0 w-[480px] bg-[#050505] border border-[#1a1a1a] shadow-2xl rounded-xl p-4 grid grid-cols-3 gap-y-2 gap-x-4">
                    {GENRES.map(g => (
                      <Link 
                        key={g} 
                        to={`/genre/${g.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setIsGenresOpen(false)}
                        className="text-sm text-gray-400 hover:text-[#F27D26] hover:bg-[#111111] rounded px-2 py-1 transition-colors truncate"
                      >
                        {g}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {!loading && user ? (
              <div className="flex items-center gap-3">
                <img src={user.photoURL || ''} alt="User avatar" className="h-8 w-8 rounded-full border border-[#1a1a1a]" />
                <button 
                  onClick={logout}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#111111] border border-[#1a1a1a] text-gray-400 transition-colors hover:bg-white hover:text-black"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : !loading ? (
              <button 
                onClick={login}
                className="flex h-8 items-center justify-center rounded-full bg-[#111111] px-4 border border-[#1a1a1a] text-sm text-gray-400 transition-colors hover:bg-white hover:text-black"
              >
                Sign In
              </button>
            ) : (
                <div className="h-8 w-8 rounded-full border-2 border-t-[#F27D26] border-[#1a1a1a] animate-spin" />
            )}
            
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
          <div className="relative w-80 max-w-sm flex-1 overflow-y-auto bg-[#050505] p-6 shadow-xl border-r border-[#1a1a1a]">
            <div className="flex items-center justify-between mb-8">
              <Link to="/" className="flex items-center gap-1 group" onClick={() => setIsMenuOpen(false)}>
                <span className="text-xl font-black italic tracking-tighter text-white transition-colors">
                  ANIM<span className="text-[#F27D26]">X</span>ER
                </span>
              </Link>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSearch} className="relative mb-8">
              <input
                type="text"
                placeholder="Search anime..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg border border-[#1a1a1a] bg-[#111111] py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 transition-colors focus:border-[#F27D26] focus:outline-none"
              />
              <Search className="absolute top-2.5 left-3 h-4 w-4 text-gray-500" />
            </form>

            <nav className="flex flex-col gap-4">
              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#111111] hover:text-white"
              >
                <Home className="h-5 w-5" />
                Home
              </Link>
              <Link
                to="/schedule"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#111111] hover:text-white"
              >
                <Compass className="h-5 w-5" />
                Schedule
              </Link>
              <Link
                to="/trending"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 hover:bg-[#111111] hover:text-white"
              >
                <Compass className="h-5 w-5" />
                Trending
              </Link>
              
              <div className="mt-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-3">Genres</h3>
                <div className="grid grid-cols-2 gap-2">
                  {GENRES.map(g => (
                    <Link
                      key={g}
                      to={`/genre/${g.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="text-sm font-medium text-gray-400 hover:text-[#F27D26] hover:bg-[#111111] rounded px-3 py-1.5 transition-colors"
                    >
                      {g}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
