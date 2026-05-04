import { Link } from 'react-router-dom';
import { Github, Twitter, MessageCircle } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-[#1a1a1a] py-12 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <span className="text-[#F27D26] text-3xl font-black italic tracking-tighter uppercase">AnimXer</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm mb-6">
              AnimXer is a free anime streaming website. You can watch anime episodes online in high quality for free without annoying ads.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-white transition-colors">
                <Github size={20} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-[#1DA1F2] transition-colors">
                <Twitter size={20} />
              </a>
              <a href="https://discord.com" target="_blank" rel="noreferrer" className="text-gray-500 hover:text-[#5865F2] transition-colors">
                <MessageCircle size={20} />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Quick Links</h3>
            <ul className="flex flex-col gap-2">
              <li><Link to="/home" className="text-gray-400 hover:text-[#F27D26] text-sm transition-colors">Home</Link></li>
              <li><Link to="/grid/trending" className="text-gray-400 hover:text-[#F27D26] text-sm transition-colors">Trending</Link></li>
              <li><Link to="/grid/popular" className="text-gray-400 hover:text-[#F27D26] text-sm transition-colors">Most Popular</Link></li>
              <li><Link to="/grid/movies" className="text-gray-400 hover:text-[#F27D26] text-sm transition-colors">Movies</Link></li>
              <li><Link to="/grid/tv" className="text-gray-400 hover:text-[#F27D26] text-sm transition-colors">TV Series</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Legal</h3>
            <ul className="flex flex-col gap-2">
              <li><Link to="/legal/terms" className="text-gray-400 hover:text-[#F27D26] text-sm transition-colors">Terms of Service</Link></li>
              <li><Link to="/legal/privacy" className="text-gray-400 hover:text-[#F27D26] text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link to="/legal/dmca" className="text-gray-400 hover:text-[#F27D26] text-sm transition-colors">DMCA</Link></li>
              <li><Link to="/legal/contact" className="text-gray-400 hover:text-[#F27D26] text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-[#1a1a1a] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} AnimXer. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs max-w-sm text-center md:text-right">
            AnimXer does not store any files on our server, we only linked to the media which is hosted on 3rd party services.
          </p>
        </div>
      </div>
    </footer>
  );
}
