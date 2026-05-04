import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAnimeSchedule, ScheduleItem } from '../api';
import { Calendar, Clock, PlayCircle } from 'lucide-react';

export function Schedule() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [scheduleData, setScheduleData] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Generate an array of 7 days around the selected date (e.g., 3 days before, today, 3 days after)
  // or a fixed week. Let's do a fixed week around the current date, or just 7 consecutive days starting from yesterday.
  const today = new Date();
  
  // We'll show 7 days: 2 days before today, today, and 4 days after
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 2 + i);
    return d;
  });

  const formatDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      const dateStr = formatDateString(selectedDate);
      const data = await getAnimeSchedule(dateStr);
      setScheduleData(data);
      setLoading(false);
    };

    fetchSchedule();
  }, [selectedDate]);

  return (
    <div className="min-h-screen bg-black pt-20 px-4 md:px-8 pb-12">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-[#F27D26]" />
              Estimated Schedule
            </h1>
            <p className="text-gray-400 text-sm">Release dates and times are estimated and may be subject to change.</p>
          </div>
          
          <div className="flex bg-[#111111] p-1 rounded-lg self-start md:self-end overflow-x-auto w-full md:w-auto mt-4 md:mt-0">
            {dates.map((d, i) => {
              const isSelected = d.toDateString() === selectedDate.toDateString();
              const isToday = d.toDateString() === today.toDateString();
              
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center justify-center py-2 px-4 rounded-md transition-colors min-w-[60px] ${
                    isSelected ? 'bg-[#F27D26] text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  <span className={`text-xs font-bold uppercase ${isSelected ? 'text-black/70' : 'text-gray-500'}`}>
                    {d.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className={`text-lg font-bold ${isSelected ? 'text-black' : isToday ? 'text-[#F27D26]' : 'text-white'}`}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#F27D26]"></div>
          </div>
        ) : scheduleData.length === 0 ? (
          <div className="bg-[#111111] rounded-xl p-12 text-center border border-[#1a1a1a]">
            <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Anime Scheduled</h3>
            <p className="text-gray-400">There are no episodes scheduled for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {scheduleData.map((item, idx) => (
              <div 
                key={`${item.id}-${idx}`}
                className="bg-[#111111] rounded-xl p-4 border border-[#1a1a1a] hover:border-[#333] transition-colors flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex items-center gap-2 min-w-[100px] text-[#F27D26] font-mono font-bold bg-[#F27D26]/10 px-3 py-1.5 rounded-lg self-start sm:self-auto">
                  <Clock className="h-4 w-4" />
                  {item.time}
                </div>
                
                <div className="flex-1">
                  <Link to={`/anime/${item.id}`} className="text-lg font-bold text-white hover:text-[#F27D26] transition-colors line-clamp-1">
                    {item.title}
                  </Link>
                  <div className="text-sm font-medium text-gray-500 mt-1">
                    Episode {item.episode}
                  </div>
                </div>

                <Link
                  to={`/anime/${item.id}`} 
                  className="flex items-center justify-center gap-2 bg-[#F27D26] text-black hover:bg-[#ff8a33] font-bold px-4 py-2 rounded-lg transition-colors self-start sm:self-auto mt-2 sm:mt-0"
                >
                  <PlayCircle className="h-5 w-5" />
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
