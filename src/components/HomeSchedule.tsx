import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAnimeSchedule, ScheduleItem } from '../api';
import { Calendar, Clock, PlayCircle, ArrowRight } from 'lucide-react';

export function HomeSchedule() {
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      const today = new Date();
      const dateStr = formatDateString(today);
      const data = await getAnimeSchedule(dateStr);
      setScheduleData(data);
      setLoading(false);
    };

    fetchSchedule();
  }, []);

  if (loading) {
    return (
      <div className="mt-12">
        <h2 className="mb-6 text-2xl font-bold uppercase tracking-wide text-white">Today's Schedule</h2>
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F27D26]"></div>
        </div>
      </div>
    );
  }

  if (scheduleData.length === 0) {
    return null; // hide if no schedule
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold uppercase tracking-wide text-white">Today's Schedule</h2>
        <Link to="/schedule" className="text-sm font-medium text-gray-400 hover:text-[#F27D26] transition-colors flex items-center gap-1 group">
          View all
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {scheduleData.slice(0, 8).map((item, idx) => (
          <div 
            key={`${item.id}-${idx}`}
            className="bg-[#111111] rounded-xl p-4 border border-[#1a1a1a] hover:border-[#333] transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-2">
                <div className="bg-[#F27D26]/10 text-[#F27D26] px-2 py-1 rounded text-xs font-bold font-mono inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {item.time}
                </div>
                <div className="text-xs font-bold bg-[#1a1a1a] px-2 py-1 rounded text-gray-400">
                  Ep {item.episode}
                </div>
              </div>
              <h3 className="line-clamp-2 font-bold text-white text-sm mb-3">
                <Link to={`/anime/${item.id}`} className="hover:text-[#F27D26] transition-colors">
                  {item.title}
                </Link>
              </h3>
            </div>
            
            <Link
              to={`/anime/${item.id}`} 
              className="flex items-center justify-center gap-1 bg-[#1a1a1a] text-gray-300 hover:text-white hover:bg-[#F27D26] hover:text-black font-bold px-3 py-1.5 rounded-lg transition-all text-sm mt-auto"
            >
              <PlayCircle className="h-4 w-4" />
              Watch
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
