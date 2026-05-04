import { Link } from 'react-router-dom';

const letters = ['All', '#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

export function AZList() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 mt-8 border-t border-[#1a1a1a]">
      <div className="flex flex-col items-center">
        <h2 className="text-xl font-bold mb-4 text-white">A-Z List</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {letters.map((letter) => {
            const path = letter === 'All' ? '/az-list/all' : letter === '#' ? '/az-list/0-9' : `/az-list/${letter}`;
            return (
              <Link
                key={letter}
                to={path}
                className="w-10 h-10 flex items-center justify-center rounded bg-[#1a1a1a] hover:bg-[#F27D26] hover:text-black transition-colors font-medium text-sm"
              >
                {letter}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
