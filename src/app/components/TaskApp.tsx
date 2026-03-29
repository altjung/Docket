import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabaseClient, API_BASE } from '/src/lib/supabase';
import svgPaths from "../../imports/svg-ae9554wht8";
import { imgSiren } from "../../imports/svg-7hvua";
import { publicAnonKey } from '/utils/supabase/info';
import AuthScreen from './AuthScreen';
import Cached from '../../imports/Cached';
import svgPathsNew from "../../imports/svg-ajoqg632kd";
import { imgEmergencyHeat } from "../../imports/svg-vece3";

interface Task {
  id: number;
  title: string;
  duration: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
}

interface Photo {
  id: number;
  url: string;
  path?: string; // Storage path for deletion
}

interface DayData {
  tasks: Task[];
  photos: Photo[];
}

type FilterType = 'all' | 'todo' | 'completed';

// Helper function to format date as YYYY-MM-DD
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get the start of week (Monday) for a given date
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

// Helper function to get month abbreviation
const getMonthAbbr = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[date.getMonth()];
};

// Helper function to get day abbreviation
const getDayAbbr = (date: Date): string => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[date.getDay()];
};

export default function TaskApp() {
  // Use real current date
  const today = useMemo(() => new Date(), []);
  
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [isDark, setIsDark] = useState(() => localStorage.getItem('docket-dark') === 'true');

  const toggleDark = () => setIsDark(prev => {
    const next = !prev;
    localStorage.setItem('docket-dark', next ? 'true' : 'false');
    return next;
  });
  
  // Store data by date string (YYYY-MM-DD)
  const [dayData, setDayData] = useState<Record<string, DayData>>({});
  
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState('30 mins');
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [showGallery, setShowGallery] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [swipedTaskId, setSwipedTaskId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [enlargedPhotoId, setEnlargedPhotoId] = useState<number | null>(null);
  const photoScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const supabase = getSupabaseClient();
  
  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get the current session (will use stored session if available)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          console.log('No active session found - working in offline mode');
          setIsCheckingAuth(false);
          return;
        }
        
        console.log('Session found, user ID:', session.user?.id);
        setAccessToken(session.access_token);
      } catch (error) {
        console.error('Error checking auth:', error);
        console.log('Working in offline mode with localStorage');
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        console.log('Auth state changed, updating token');
        setAccessToken(session.access_token);
      } else {
        console.log('Auth state changed, no session - offline mode');
        setAccessToken(null);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Load all data on mount - runs only when authenticated
  useEffect(() => {
    if (!accessToken) {
      // Load from localStorage when not authenticated
      const stored = localStorage.getItem('taskAppData');
      if (stored) {
        try {
          setDayData(JSON.parse(stored));
          console.log('Loaded data from localStorage (offline mode)');
        } catch (e) {
          console.error('Failed to parse stored data:', e);
        }
      }
      setIsLoading(false);
      return;
    }
    
    const loadData = async () => {
      try {
        console.log('Loading data from server with access token...');
        const response = await fetch(`${API_BASE}/data`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        
        console.log('Server response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Server error response:', errorText);
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Server response:', result);
        
        if (result.success) {
          // Always use server data as source of truth when authenticated
          setDayData(result.data || {});
          // Update localStorage to match server
          localStorage.setItem('taskAppData', JSON.stringify(result.data || {}));
          console.log('Data loaded successfully from server and synced to localStorage');
        } else {
          console.error('Error loading data from server:', result.error);
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('Error fetching data from server, using localStorage fallback:', error);
        // Only fallback to localStorage if server is completely unavailable
        const stored = localStorage.getItem('taskAppData');
        if (stored) {
          try {
            setDayData(JSON.parse(stored));
          } catch (e) {
            console.error('Failed to parse stored data:', e);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [accessToken]);

  // Save data whenever it changes - only when authenticated
  useEffect(() => {
    if (isLoading || !accessToken) return; // Don't save during initial load or when not authenticated
    
    // Always save to localStorage as backup
    localStorage.setItem('taskAppData', JSON.stringify(dayData));
    
    const saveData = async () => {
      try {
        for (const [dateKey, data] of Object.entries(dayData)) {
          const response = await fetch(`${API_BASE}/data/${dateKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(data),
          });
          
          if (!response.ok) {
            console.warn(`Failed to save data for ${dateKey} to server`);
          } else {
            console.log(`Successfully saved data for ${dateKey} to server`);
          }
        }
      } catch (error) {
        console.warn('Error saving data to server (data saved to localStorage):', error);
      }
    };
    
    // Debounce saves
    const timeoutId = setTimeout(saveData, 500);
    return () => clearTimeout(timeoutId);
  }, [dayData, accessToken, isLoading]);

  // Periodic sync to check for updates from other devices
  useEffect(() => {
    if (!accessToken || isLoading) return;
    
    const syncInterval = setInterval(async () => {
      try {
        // First, refresh the session to get a fresh token
        const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
        
        if (sessionError || !session?.access_token) {
          // Silently skip sync when not authenticated
          return;
        }
        
        // Update token if it changed
        if (session.access_token !== accessToken) {
          console.log('Token refreshed');
          setAccessToken(session.access_token);
        }
        
        console.log('Checking for updates from server...');
        const response = await fetch(`${API_BASE}/data`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });
        
        if (response.status === 401) {
          console.warn('Authentication expired, user needs to sign in again');
          return;
        }
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            // Use functional update to get latest local state
            setDayData(currentData => {
              const serverDataStr = JSON.stringify(result.data);
              const localDataStr = JSON.stringify(currentData);
              
              if (serverDataStr !== localDataStr) {
                console.log('Server has updates, syncing...');
                localStorage.setItem('taskAppData', JSON.stringify(result.data));
                return result.data;
              }
              return currentData;
            });
          }
        }
      } catch (error) {
        console.warn('Periodic sync error (non-critical):', error);
      }
    }, 10000); // Check every 10 seconds for better responsiveness
    
    return () => clearInterval(syncInterval);
  }, [accessToken, isLoading, supabase]); // Removed dayData from dependencies

  // Get current day's data
  const currentDayData = dayData[formatDateKey(selectedDate)] || { tasks: [], photos: [] };

  // Reset swipedTaskId when date changes
  useEffect(() => {
    setSwipedTaskId(null);
  }, [selectedDate]);

  const handlePrevWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const handleCompleteTask = (id: number) => {
    const dateKey = formatDateKey(selectedDate);
    setDayData(prevData => ({
      ...prevData,
      [dateKey]: {
        tasks: (prevData[dateKey]?.tasks || []).map(task => 
          task.id === id ? { ...task, completed: !task.completed } : task
        ),
        photos: prevData[dateKey]?.photos || []
      }
    }));
  };

  const handleAddTask = () => {
    if (newTaskTitle.trim()) {
      const newTask: Task = {
        id: Date.now(),
        title: newTaskTitle,
        duration: newTaskDuration,
        completed: false,
        priority: newTaskPriority,
      };
      const dateKey = formatDateKey(selectedDate);
      setDayData(prevData => ({
        ...prevData,
        [dateKey]: {
          tasks: [...(prevData[dateKey]?.tasks || []), newTask],
          photos: prevData[dateKey]?.photos || []
        }
      }));
      setNewTaskTitle('');
      setNewTaskDuration('30 mins');
      setNewTaskPriority('medium');
      setShowAddTask(false);
    }
  };

  // Sort tasks: incomplete first, then completed (with most recent at top of completed section)
  const sortedTasks = [...currentDayData.tasks].sort((a, b) => {
    if (a.completed === b.completed) {
      // Within same completion status, maintain order (newer completed tasks at top)
      return 0;
    }
    // Incomplete tasks come first
    return a.completed ? 1 : -1;
  });

  const filteredTasks = sortedTasks.filter(task => {
    if (activeFilter === 'todo') return !task.completed;
    if (activeFilter === 'completed') return task.completed;
    return true;
  });

  const scrollPhotos = (direction: 'left' | 'right') => {
    if (photoScrollRef.current) {
      const scrollAmount = 150;
      photoScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleAddPhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Data = reader.result as string;
            
            // Upload to Supabase Storage via server
            try {
              // Refresh session to get a valid token
              const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
              
              if (sessionError || !session?.access_token) {
                throw new Error('Session expired, please sign in again');
              }
              
              const response = await fetch(`${API_BASE}/photos/upload`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  base64Data,
                  fileName: file.name,
                }),
              });
              
              if (!response.ok) {
                throw new Error('Failed to upload photo to server');
              }
              
              const result = await response.json();
              
              if (result.success && result.url) {
                // Store the signed URL and path from Supabase Storage
                const newPhoto: Photo = {
                  id: Date.now() + Math.random(),
                  url: result.url,
                  path: result.path, // Store path for deletion
                };
                
                setDayData(prevData => {
                  const dateKey = formatDateKey(selectedDate);
                  const currentPhotos = prevData[dateKey]?.photos || [];
                  return {
                    ...prevData,
                    [dateKey]: {
                      tasks: prevData[dateKey]?.tasks || [],
                      photos: [...currentPhotos, newPhoto]
                    }
                  };
                });
              } else {
                console.error('Failed to upload photo:', result.error);
                // Fallback to base64 if server upload fails
                const newPhoto: Photo = {
                  id: Date.now() + Math.random(),
                  url: base64Data,
                };
                setDayData(prevData => {
                  const dateKey = formatDateKey(selectedDate);
                  const currentPhotos = prevData[dateKey]?.photos || [];
                  return {
                    ...prevData,
                    [dateKey]: {
                      tasks: prevData[dateKey]?.tasks || [],
                      photos: [...currentPhotos, newPhoto]
                    }
                  };
                });
              }
            } catch (error) {
              console.error('Error uploading photo to server:', error);
              // Fallback to base64 if server upload fails
              const newPhoto: Photo = {
                id: Date.now() + Math.random(),
                url: base64Data,
              };
              setDayData(prevData => {
                const dateKey = formatDateKey(selectedDate);
                const currentPhotos = prevData[dateKey]?.photos || [];
                return {
                  ...prevData,
                  [dateKey]: {
                    tasks: prevData[dateKey]?.tasks || [],
                    photos: [...currentPhotos, newPhoto]
                  }
                };
              });
            }
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('Error reading file:', error);
        }
      }
      setShowUploadOptions(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    const dateKey = formatDateKey(selectedDate);
    const photo = dayData[dateKey]?.photos.find(p => p.id === photoId);
    
    // If photo has a path (stored in Supabase), delete from server
    if (photo?.path) {
      try {
        // Refresh session to get a valid token
        const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
        
        if (sessionError || !session?.access_token) {
          console.warn('Session expired, cannot delete from server');
        } else {
          const response = await fetch(`${API_BASE}/photos/${encodeURIComponent(photo.path)}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          });
          
          if (!response.ok) {
            console.warn('Failed to delete photo from server storage');
          }
        }
      } catch (error) {
        console.error('Error deleting photo from server:', error);
      }
    }
    
    // Remove from state
    setDayData(prevData => ({
      ...prevData,
      [dateKey]: {
        tasks: prevData[dateKey]?.tasks || [],
        photos: (prevData[dateKey]?.photos || []).filter(photo => photo.id !== photoId)
      }
    }));
  };

  const handleDeleteTask = (taskId: number) => {
    const dateKey = formatDateKey(selectedDate);
    setDayData(prevData => ({
      ...prevData,
      [dateKey]: {
        tasks: (prevData[dateKey]?.tasks || []).filter(task => task.id !== taskId),
        photos: prevData[dateKey]?.photos || []
      }
    }));
    setSwipedTaskId(null);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskDuration(task.duration);
    setNewTaskPriority(task.priority);
    setSwipedTaskId(null);
  };

  const handleUpdateTask = () => {
    if (editingTask && newTaskTitle.trim()) {
      const dateKey = formatDateKey(selectedDate);
      setDayData(prevData => ({
        ...prevData,
        [dateKey]: {
          tasks: (prevData[dateKey]?.tasks || []).map(task =>
            task.id === editingTask.id
              ? { ...task, title: newTaskTitle, duration: newTaskDuration, priority: newTaskPriority }
              : task
          ),
          photos: prevData[dateKey]?.photos || []
        }
      }));
      setEditingTask(null);
      setNewTaskTitle('');
      setNewTaskDuration('30 mins');
      setNewTaskPriority('medium');
    }
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setNewTaskTitle('');
    setNewTaskDuration('30 mins');
    setNewTaskPriority('medium');
  };

  const handleBackToToday = () => {
    setSelectedDate(today);
  };

  const isViewingToday = formatDateKey(selectedDate) === formatDateKey(today);

  const handleAuthSuccess = (token: string) => {
    setAccessToken(token);
    setOfflineMode(false);
  };

  const handleSkipAuth = () => {
    console.log('User chose offline mode');
    setOfflineMode(true);
    setIsCheckingAuth(false);
    // Load from localStorage
    const stored = localStorage.getItem('taskAppData');
    if (stored) {
      try {
        setDayData(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse stored data:', e);
      }
    }
    setIsLoading(false);
  };

  // Export data as JSON file
  const handleExportData = () => {
    const dataStr = JSON.stringify(dayData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `docket-backup-${formatDateKey(new Date())}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import data from JSON file
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        setDayData(importedData);
        localStorage.setItem('taskAppData', JSON.stringify(importedData));
        alert('Data imported successfully!');
      } catch (error) {
        console.error('Failed to import data:', error);
        alert('Failed to import data. Please check the file format.');
      }
    };
    reader.readAsText(file);
  };

  // Manual sync with Supabase
  const handleManualSync = async () => {
    if (offlineMode) {
      alert('Please sign in to sync your data');
      return;
    }

    setIsSyncing(true);
    try {
      console.log('=== Starting Manual Sync ===');
      
      // First, refresh session to get a valid token
      console.log('Refreshing session...');
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      console.log('Session refresh result:', {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        userId: session?.user?.id,
        error: sessionError
      });
      
      if (sessionError) {
        console.error('Session refresh error:', sessionError);
        throw new Error(`Session refresh failed: ${sessionError.message}`);
      }
      
      if (!session?.access_token) {
        throw new Error('No access token after refresh - please sign in again');
      }

      console.log('Using access token:', session.access_token.substring(0, 20) + '...');
      console.log('Starting data upload to server...');
      
      // Upload all local data to server
      for (const [dateKey, data] of Object.entries(dayData)) {
        console.log(`Uploading data for ${dateKey}...`);
        const uploadResponse = await fetch(`${API_BASE}/data/${dateKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(data),
        });
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error(`Upload failed for ${dateKey}:`, uploadResponse.status, errorText);
          throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
        }
      }

      console.log('Data uploaded successfully. Fetching from server...');

      // Then, fetch fresh data from server
      const response = await fetch(`${API_BASE}/data`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      console.log('Fetch response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Fetch result:', result);
        
        if (result.success) {
          setDayData(result.data || {});
          localStorage.setItem('taskAppData', JSON.stringify(result.data || {}));
          console.log('✓ Sync complete!');
          alert('✓ Data synced successfully!');
        } else {
          throw new Error(result.error || 'Sync failed');
        }
      } else {
        const errorText = await response.text();
        console.error('Fetch failed:', response.status, errorText);
        throw new Error(`Server responded with status: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('=== Sync Error ===', error);
      alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Show auth screen if not authenticated
  if (isCheckingAuth) {
    return <div className="bg-[#f6f6f6] flex items-center justify-center size-full"><p>Loading...</p></div>;
  }

  if (!accessToken && !offlineMode) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} onSkipAuth={handleSkipAuth} />;
  }

  return (
    <div className="bg-[#f6f6f6] overflow-clip relative size-full" data-name="iPhone 13 & 14 - 3" data-dark={isDark ? 'true' : undefined}>
      <style>{`
        [data-dark="true"].bg-\\[\\#f6f6f6\\],[data-dark="true"] .bg-\\[\\#f6f6f6\\]{background-color:#121212!important}
        [data-dark="true"] .bg-\\[\\#e9e7e7\\]{background-color:#262626!important}
        [data-dark="true"] .bg-\\[\\#d6d6d6\\]{background-color:#333!important}
        [data-dark="true"] .bg-\\[\\#d9d9d9\\]{background-color:#333!important}
        [data-dark="true"] .bg-\\[\\#747474\\]{background-color:#3d3d3d!important}
        [data-dark="true"] .bg-white{background-color:#1a1a1a!important}
        [data-dark="true"] .text-black{color:#f1f1f1!important}
        [data-dark="true"] .text-\\[\\#a0a0a0\\]{color:#777!important}
        [data-dark="true"] .text-\\[\\#666\\]{color:#999!important}
        [data-dark="true"] .hover\\:text-black:hover{color:#f1f1f1!important}
        [data-dark="true"] .hover\\:bg-\\[\\#f0f0f0\\]:hover{background-color:#2a2a2a!important}
        [data-dark="true"] .border-\\[\\#333\\]{border-color:#555!important}
        [data-dark="true"] .bg-gradient-to-t{background:linear-gradient(to top,#121212,transparent)!important}
        [data-dark="true"] path[fill="#1C1B1F"]{fill:#f1f1f1!important}
        [data-dark="true"] [data-name="cached"] path{fill:#f1f1f1!important}
        [data-dark="true"] input{color:#f1f1f1!important}
        [data-dark="true"] input::placeholder{color:#555!important}
      `}</style>
      <div className="absolute content-stretch flex flex-col h-[844px] items-start left-0 px-[16px] py-[48px] top-0 w-[390px]">
        <div className="relative shrink-0 w-full">
          <div className="content-stretch flex flex-col gap-[10px] items-start relative w-full">
            
            {/* Header */}
            <div className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0">
              <div className="flex items-center justify-between w-full gap-[16px]">
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="content-stretch flex items-center justify-center relative shrink-0"
                >
                  <p className="font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[32px] text-black whitespace-nowrap">Hello, Anthony</p>
                </motion.div>
                <div className="flex items-center gap-[12px] ml-auto mr-[4px]">
                  {!offlineMode && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: 1,
                        rotate: isSyncing ? 360 : 0
                      }}
                      transition={{
                        rotate: {
                          duration: 1,
                          repeat: isSyncing ? Infinity : 0,
                          ease: "linear"
                        }
                      }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleManualSync}
                      disabled={isSyncing}
                      className="size-[24px] cursor-pointer hover:opacity-70 transition-opacity disabled:opacity-50"
                      title="Sync data across devices"
                    >
                      <Cached />
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={toggleDark}
                    className="size-[24px] flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
                    title={isDark ? 'Light mode' : 'Dark mode'}
                  >
                    {isDark ? <SunIcon /> : <MoonIcon />}
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      if (!offlineMode) {
                        await supabase.auth.signOut();
                      }
                      setAccessToken(null);
                      setOfflineMode(false);
                      setIsCheckingAuth(true);
                      localStorage.clear();
                      // Reset to show auth screen
                      setTimeout(() => setIsCheckingAuth(false), 100);
                    }}
                    className="text-[12px] text-[#666] hover:text-black cursor-pointer font-['Inter:Regular',sans-serif] px-[12px] py-[6px] rounded-[8px] hover:bg-[#f0f0f0] transition-colors whitespace-nowrap"
                  >
                    {offlineMode ? 'Sign In' : 'Sign Out'}
                  </motion.button>
                </div>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  style={{ display: 'none' }}
                />
              </div>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="content-stretch flex items-center justify-center relative shrink-0"
              >
                <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-black whitespace-nowrap">What's on the Docket today?</p>
              </motion.div>
            </div>

            {/* Calendar Week Selector */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="content-stretch flex flex-col gap-[8px] items-center justify-center pt-[24px] relative rounded-[12px] shrink-0 w-full"
            >
              {/* Today Label */}
              <div className="relative shrink-0 w-full">
                <div className="flex flex-row items-center size-full">
                  <div className="content-stretch flex items-center px-[4px] relative w-full">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleBackToToday}
                      disabled={isViewingToday}
                      animate={{
                        opacity: isViewingToday ? 0.5 : 1,
                      }}
                      className={`font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[12px] whitespace-nowrap ${
                        isViewingToday ? 'text-[#a0a0a0] cursor-default' : 'text-black cursor-pointer'
                      }`}
                    >
                      {isViewingToday ? 'Today' : 'Back to Today'}
                    </motion.button>
                  </div>
                </div>
              </div>
              
              {/* Calendar Days with Arrows */}
              <div className="content-stretch flex items-center justify-center relative shrink-0 w-full">
                <div className="content-stretch flex gap-[4px] items-center relative shrink-0">
                  {/* Left Arrow */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handlePrevWeek}
                    className="content-stretch flex h-[18px] items-center overflow-clip p-[3px] relative shrink-0 w-[12.5px] cursor-pointer"
                  >
                    <ArrowBackIos />
                  </motion.button>

                  {/* Days */}
                  <div className="content-stretch flex gap-[8px] items-center relative shrink-0 w-[333px]">
                    {Array.from({ length: 7 }, (_, i) => {
                      const date = new Date(getWeekStart(selectedDate));
                      date.setDate(date.getDate() + i);
                      const isSelected = formatDateKey(date) === formatDateKey(selectedDate);
                      const isToday = formatDateKey(date) === formatDateKey(today);
                      return (
                        <motion.button
                          key={i}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setSelectedDate(date)}
                          animate={{
                            backgroundColor: isSelected ? '#bfe260' : '#d6d6d6',
                          }}
                          transition={{ duration: 0.3 }}
                          className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-[45px] items-center justify-center min-h-px min-w-px overflow-clip relative rounded-[8px] cursor-pointer"
                        >
                          <p className={`font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[8px] whitespace-nowrap ${isSelected ? 'text-black' : 'text-[#a0a0a0]'}`}>
                            {getDayAbbr(date)}
                          </p>
                          <p className={`font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-center tracking-[-0.24px] whitespace-nowrap ${isSelected ? 'text-black' : 'text-[#a0a0a0]'}`}>
                            {date.getDate()}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Right Arrow */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleNextWeek}
                    className="flex items-center justify-center relative shrink-0 cursor-pointer"
                  >
                    <div className="-scale-y-100 flex-none rotate-180">
                      <div className="content-stretch flex h-[18px] items-center overflow-clip p-[3px] relative w-[12.5px]">
                        <ArrowBackIos />
                      </div>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Today's Photos */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="content-stretch flex flex-col gap-[12px] items-start justify-center py-[12px] relative shrink-0 w-full"
            >
              <div className="content-stretch flex items-center justify-center relative shrink-0">
                <p className="font-['Inter:Bold',sans-serif] font-bold leading-[normal] not-italic relative shrink-0 text-[12px] text-black whitespace-nowrap">Today's Photos</p>
              </div>
              <div className="relative w-full">
                <div 
                  ref={photoScrollRef}
                  className="flex gap-[8px] items-center overflow-x-auto overflow-y-hidden w-full"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowUploadOptions(true)}
                    className="bg-[#e9e7e7] flex items-center justify-center p-[19px] relative rounded-[14px] shrink-0 cursor-pointer"
                  >
                    <AddCircle />
                  </motion.div>
                  {currentDayData.photos.map((photo) => (
                    <motion.div
                      key={photo.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="bg-white relative rounded-[14px] shrink-0 size-[62px] cursor-pointer overflow-hidden"
                      onClick={() => setEnlargedPhotoId(photo.id)}
                    >
                      <img alt="" className="w-full h-full object-cover pointer-events-none" src={photo.url} />
                      <div aria-hidden="true" className="absolute border-[1.24px] border-solid border-white inset-[-1.24px] pointer-events-none rounded-[15.24px]" />
                    </motion.div>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowGallery(true)}
                    className="bg-[#e9e7e7] flex items-center justify-center p-[12px] relative rounded-[14px] shrink-0 h-[62px] min-w-[62px] cursor-pointer"
                  >
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative text-[#a0a0a0] text-[10px] whitespace-nowrap">View All</p>
                  </motion.button>
                </div>
                <style>{`
                  .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
              </div>
            </motion.div>

            {/* Filter Tabs */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="content-stretch flex gap-[9px] items-center py-[12px] relative shrink-0 w-full"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveFilter('all')}
                animate={{
                  backgroundColor: activeFilter === 'all' ? '#bfe260' : '#d6d6d6',
                }}
                className="content-stretch flex flex-col items-center justify-center overflow-clip px-[16px] py-[8px] relative rounded-[12px] shrink-0 w-[48px] cursor-pointer"
              >
                <p className={`font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-center tracking-[-0.24px] whitespace-nowrap ${activeFilter === 'all' ? 'text-black font-bold' : 'text-[#a0a0a0]'}`}>All</p>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveFilter('todo')}
                animate={{
                  backgroundColor: activeFilter === 'todo' ? '#bfe260' : '#d6d6d6',
                }}
                className="content-stretch flex flex-col items-center justify-center overflow-clip px-[16px] py-[8px] relative rounded-[12px] shrink-0 w-[67px] cursor-pointer"
              >
                <p className={`font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-center tracking-[-0.24px] whitespace-nowrap ${activeFilter === 'todo' ? 'text-black font-bold' : 'text-[#a0a0a0]'}`}>To-Do</p>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveFilter('completed')}
                animate={{
                  backgroundColor: activeFilter === 'completed' ? '#bfe260' : '#d6d6d6',
                }}
                className="content-stretch flex flex-col items-center justify-center overflow-clip px-[16px] py-[8px] relative rounded-[12px] shrink-0 w-[93px] cursor-pointer"
              >
                <p className={`font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-center tracking-[-0.24px] whitespace-nowrap ${activeFilter === 'completed' ? 'text-black font-bold' : 'text-[#a0a0a0]'}`}>Completed</p>
              </motion.button>
            </motion.div>

            {/* Task List */}
            <div className="content-stretch flex flex-col gap-[10px] items-start relative shrink-0 w-full">
              {/* Add Task Button */}
              {!showAddTask && !editingTask ? (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowAddTask(true)}
                  className="bg-[#e9e7e7] h-[63px] relative rounded-[16px] shrink-0 w-full cursor-pointer"
                >
                  <div className="flex flex-row items-center justify-center overflow-clip rounded-[inherit] size-full">
                    <div className="content-stretch flex gap-[4px] items-center justify-center p-[16px] relative size-full">
                      <AddCircle />
                      <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[#a0a0a0] text-[14px] whitespace-nowrap">Add Task</p>
                    </div>
                  </div>
                </motion.button>
              ) : (showAddTask || editingTask) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-[#e9e7e7] relative rounded-[16px] shrink-0 w-full p-[16px]"
                >
                  {/* Task Name Row with Priority Icons */}
                  <div className="flex gap-[12px] items-center mb-[12px]">
                    <div className="flex-1 flex items-center">
                      <span className="font-['Inter:Regular',sans-serif] text-[14px] text-[#bfe260] mr-[2px]">|</span>
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (editingTask ? handleUpdateTask() : handleAddTask())}
                        placeholder="Task Name..."
                        autoFocus
                        className="flex-1 bg-transparent font-['Inter:Regular',sans-serif] text-[14px] outline-none"
                      />
                    </div>
                    
                    {/* Priority Icon Buttons */}
                    <div className="flex gap-[12px] items-center">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setNewTaskPriority('high')}
                        className={`flex items-center justify-center p-[6px] rounded-[62.5px] size-[22.776px] transition-colors ${
                          newTaskPriority === 'high' ? 'bg-[#ff6b6b]' : 'bg-[#a0a0a0]'
                        }`}
                        title="High Priority"
                      >
                        <div className="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-8.297px_-8.297px] mask-size-[28.47px_28.47px] relative shrink-0 size-[9.5px]" style={{ maskImage: `url('${imgEmergencyHeat}')` }}>
                          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 9.5 9.5">
                            <path d={svgPathsNew.p2f12b280} fill="white" />
                          </svg>
                        </div>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setNewTaskPriority('medium')}
                        className={`flex items-center justify-center p-[6px] rounded-[62.5px] size-[22.776px] transition-colors ${
                          newTaskPriority === 'medium' ? 'bg-[#f5b638]' : 'bg-[#a0a0a0]'
                        }`}
                        title="Medium Priority"
                      >
                        <div className="h-[9px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-7.985px_-8.61px] mask-size-[28.47px_28.47px] relative shrink-0 w-[10px]" style={{ maskImage: `url('${imgEmergencyHeat}')` }}>
                          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10 9">
                            <path d={svgPathsNew.p13739f0} fill="white" />
                          </svg>
                        </div>
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setNewTaskPriority('low')}
                        className={`flex items-center justify-center p-[6px] rounded-[62.5px] size-[22.776px] transition-colors ${
                          newTaskPriority === 'low' ? 'bg-[#51cf66]' : 'bg-[#a0a0a0]'
                        }`}
                        title="Low Priority"
                      >
                        <div className="h-[10.25px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-7.501px_-7.829px] mask-size-[28.47px_28.47px] relative shrink-0 w-[10.775px]" style={{ maskImage: `url('${imgEmergencyHeat}')` }}>
                          <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.775 10.25">
                            <path d={svgPathsNew.p10a4c00} fill="white" />
                          </svg>
                        </div>
                      </motion.button>
                    </div>
                  </div>
                  
                  {/* Duration Selection */}
                  <div className="flex gap-[4px] mb-[12px]">
                    {[
                      { label: '15 min', value: '15 mins' },
                      { label: '30 mins', value: '30 mins' },
                      { label: '1 hour', value: '1 hour' },
                      { label: '2 hours', value: '2 hours' }
                    ].map((duration) => (
                      <motion.button
                        key={duration.value}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setNewTaskDuration(duration.value)}
                        className={`flex-1 py-[8px] px-[8px] rounded-[8px] font-['Inter:Regular',sans-serif] text-[8px] tracking-[-0.16px] transition-colors ${
                          newTaskDuration === duration.value 
                            ? 'bg-[#bfe260] text-black' 
                            : 'bg-[#d6d6d6] text-black'
                        }`}
                      >
                        {duration.label}
                      </motion.button>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-[10px]">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={editingTask ? handleUpdateTask : handleAddTask}
                      className="flex-1 bg-[#bfe260] py-[8px] px-[16px] rounded-[12px] font-['Inter:Regular',sans-serif] text-[12px] tracking-[-0.24px]"
                    >
                      {editingTask ? 'Update' : 'Add'}
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (editingTask) {
                          handleCancelEdit();
                        } else {
                          setShowAddTask(false);
                          setNewTaskTitle('');
                          setNewTaskDuration('30 mins');
                          setNewTaskPriority('medium');
                        }
                      }}
                      className="flex-1 bg-[#d9d9d9] py-[8px] px-[16px] rounded-[12px] font-['Inter:Regular',sans-serif] text-[12px] tracking-[-0.24px]"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Tasks with fade effect wrapper */}
              <div className="relative w-full">
                <AnimatePresence mode="popLayout">
                  {filteredTasks.map((task, index) => (
                    <div key={task.id} className="relative w-full mb-[10px]">
                      {/* Background actions revealed on swipe - only render when swiped */}
                      {swipedTaskId === task.id && (
                        <div className="absolute right-0 top-0 h-full flex items-center gap-[6px] pr-[8px]">
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditTask(task)}
                            className="bg-[#4a9eff] size-[56px] rounded-[16px] flex items-center justify-center cursor-pointer shadow-lg"
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="white"/>
                            </svg>
                          </motion.button>
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteTask(task.id)}
                            className="bg-[#ff6b6b] size-[56px] rounded-[16px] flex items-center justify-center cursor-pointer shadow-lg"
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="white"/>
                            </svg>
                          </motion.button>
                        </div>
                      )}

                      {/* Task card */}
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ 
                          opacity: 1, 
                          y: 0,
                          x: swipedTaskId === task.id ? -146 : 0,
                          backgroundColor: task.completed ? (isDark ? '#3d3d3d' : '#747474') : (isDark ? '#262626' : '#e9e7e7')
                        }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        drag="x"
                        dragConstraints={{ left: -146, right: 0 }}
                        dragElastic={0.1}
                        onDragEnd={(e, info) => {
                          if (info.offset.x < -60) {
                            setSwipedTaskId(task.id);
                          } else {
                            setSwipedTaskId(null);
                          }
                        }}
                        className="relative rounded-[16px] shrink-0 w-full cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex flex-row items-center overflow-clip rounded-[inherit] size-full">
                          <div className="content-stretch flex gap-[10px] items-center p-[16px] relative w-full">
                            {/* Icon & Task Info */}
                            <div className="content-stretch flex flex-[1_0_0] gap-[12px] items-center min-h-px min-w-px relative">
                              <motion.div
                                animate={{
                                  backgroundColor: task.completed ? '#bfe260' : '#f5b638'
                                }}
                                className="content-stretch flex flex-col items-center justify-center p-[7.5px] relative rounded-[62.5px] shrink-0 size-[28.47px]"
                              >
                                {task.completed ? (
                                  <Check />
                                ) : (
                                  <div className="h-[11.25px] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-7.985px_-8.61px] mask-size-[28.47px_28.47px] relative shrink-0 w-[12.5px]" style={{ maskImage: `url('${imgSiren}')` }}>
                                    <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.5 11.25">
                                      <path d={svgPaths.pd2c6b00} fill="white" />
                                    </svg>
                                  </div>
                                )}
                              </motion.div>
                              <div className={`content-stretch flex flex-col font-['Inter:Regular',sans-serif] font-normal gap-[2px] items-start justify-center leading-[normal] not-italic relative shrink-0 whitespace-nowrap ${task.completed ? 'text-white' : 'text-black'}`}>
                                <p className={`relative shrink-0 text-[14px] ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                                <p className="relative shrink-0 text-[10px]">{task.duration}</p>
                              </div>
                            </div>

                            {/* Complete Button */}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleCompleteTask(task.id)}
                              animate={{
                                backgroundColor: task.completed ? '#bfe260' : (isDark ? '#33333300' : '#e9e7e700')
                              }}
                              className="relative rounded-[12px] shrink-0 w-[86px] px-[16px] py-[8px] cursor-pointer"
                            >
                              <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[12px] text-black text-center tracking-[-0.24px] whitespace-nowrap">
                                {task.completed ? 'Completed' : 'Complete'}
                              </p>
                              {!task.completed && (
                                <div aria-hidden="true" className="absolute border-2 border-[#bfe260] border-solid inset-0 pointer-events-none rounded-[12px]" />
                              )}
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fade to white effect at bottom - fixed to screen */}
      <div className="absolute bottom-0 left-0 right-0 h-[80px] pointer-events-none bg-gradient-to-t from-[#f6f6f6] to-transparent z-10" />

      {/* Upload Options Modal */}
      <AnimatePresence>
        {showUploadOptions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 flex items-end justify-center z-50"
            onClick={() => setShowUploadOptions(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-t-[24px] w-full p-[24px] pb-[48px]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-[40px] h-[4px] bg-[#d6d6d6] rounded-full mx-auto mb-[24px]" />
              <p className="font-['Inter:Bold',sans-serif] text-[18px] text-black mb-[16px]">Add Photo</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  handleFileChange(e);
                  setShowUploadOptions(false);
                }}
                className="hidden"
              />
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddPhoto}
                className="w-full bg-[#bfe260] rounded-[12px] py-[16px] px-[24px] mb-[12px] flex items-center gap-[12px]"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="black"/>
                </svg>
                <p className="font-['Inter:Regular',sans-serif] text-[16px] text-black">Choose from Gallery</p>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddPhoto}
                className="w-full bg-[#e9e7e7] rounded-[12px] py-[16px] px-[24px] mb-[12px] flex items-center gap-[12px]"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" fill="#a0a0a0"/>
                </svg>
                <p className="font-['Inter:Regular',sans-serif] text-[16px] text-[#a0a0a0]">Take Photo</p>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowUploadOptions(false)}
                className="w-full bg-[#d6d6d6] rounded-[12px] py-[16px] px-[24px]"
              >
                <p className="font-['Inter:Regular',sans-serif] text-[16px] text-black">Cancel</p>
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Gallery Modal */}
      <AnimatePresence>
        {showGallery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black z-50"
          >
            <div className="relative h-full w-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-[16px] pt-[48px]">
                <p className="font-['Inter:Bold',sans-serif] text-[20px] text-white">
                  {getDayAbbr(selectedDate)}, {getMonthAbbr(selectedDate)} {selectedDate.getDate()}
                </p>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowGallery(false)}
                  className="size-[32px] rounded-full bg-white/20 flex items-center justify-center cursor-pointer"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="white"/>
                  </svg>
                </motion.button>
              </div>
              
              {/* Gallery Grid */}
              <div className="flex-1 overflow-y-auto p-[16px]">
                {currentDayData.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-[8px]">
                    {currentDayData.photos.map((photo) => (
                      <motion.div
                        key={photo.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="aspect-square rounded-[12px] overflow-hidden bg-white relative group cursor-pointer"
                        onClick={() => setEnlargedPhotoId(photo.id)}
                      >
                        <img alt="" className="w-full h-full object-cover" src={photo.url} />
                        {/* Delete Button */}
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          animate={{ opacity: 1 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePhoto(photo.id);
                          }}
                          className="absolute top-[8px] right-[8px] size-[28px] rounded-full bg-red-500 flex items-center justify-center cursor-pointer shadow-lg z-10"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="white"/>
                          </svg>
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <AddCircle />
                    <p className="font-['Inter:Regular',sans-serif] text-[16px] text-white/60 mt-[16px]">No photos for this day</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enlarged Photo Modal */}
      <AnimatePresence>
        {enlargedPhotoId !== null && (() => {
          const enlargedPhoto = currentDayData.photos.find(p => p.id === enlargedPhotoId);
          return enlargedPhoto ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black z-50"
              onClick={() => setEnlargedPhotoId(null)}
            >
              <div className="relative h-full w-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-[16px] pt-[48px]">
                  <p className="font-['Inter:Bold',sans-serif] text-[20px] text-white">
                    {getDayAbbr(selectedDate)}, {getMonthAbbr(selectedDate)} {selectedDate.getDate()}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnlargedPhotoId(null);
                    }}
                    className="size-[32px] rounded-full bg-white/20 flex items-center justify-center cursor-pointer"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" fill="white"/>
                    </svg>
                  </motion.button>
                </div>
                
                {/* Enlarged Photo */}
                <div className="flex-1 flex items-center justify-center p-[16px]">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.8 }}
                    className="relative w-full max-h-full"
                  >
                    <img 
                      alt="" 
                      className="w-full h-auto max-h-[70vh] object-contain rounded-[12px]" 
                      src={enlargedPhoto.url}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {/* Delete Button */}
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePhoto(enlargedPhoto.id);
                        setEnlargedPhotoId(null);
                      }}
                      className="absolute top-[16px] right-[16px] size-[40px] rounded-full bg-red-500 flex items-center justify-center cursor-pointer shadow-lg z-10"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="white"/>
                      </svg>
                    </motion.button>
                  </motion.div>
                </div>

                {/* Minimize Button */}
                <div className="p-[24px] pb-[48px] flex justify-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEnlargedPhotoId(null);
                    }}
                    className="bg-white/20 rounded-[12px] py-[12px] px-[32px] flex items-center gap-[8px] cursor-pointer"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 13H5v-2h14v2z" fill="white"/>
                    </svg>
                    <p className="font-['Inter:Regular',sans-serif] text-[16px] text-white">Minimize</p>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : null;
        })()}
      </AnimatePresence>
    </div>
  );
}

function ArrowBackIos() {
  return (
    <div className="h-[12px] relative shrink-0 w-[6.5px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6.5 12">
        <g>
          <mask height="12" id="mask0_1_356" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="7" x="0" y="0">
            <rect fill="#D9D9D9" height="12" width="6.5" />
          </mask>
          <g mask="url(#mask0_1_356)">
            <path d={svgPaths.p2cfa1200} fill="#1C1B1F" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function AddCircle() {
  return (
    <div className="relative shrink-0 size-[24px]">
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g>
          <mask height="24" id="mask0_1_348" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="24" x="0" y="0">
            <rect fill="#D9D9D9" height="24" width="24" />
          </mask>
          <g mask="url(#mask0_1_348)">
            <path d={svgPaths.pfb10b00} fill="#A0A0A0" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="#1C1B1F"/>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="4" fill="#f1f1f1"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="#f1f1f1" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function Check() {
  return (
    <div className="mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-4.235px_-4px] mask-size-[28.47px_28.47px] relative shrink-0 size-[20px]" style={{ maskImage: `url('${imgSiren}')` }}>
      <svg className="absolute block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g>
          <mask height="20" id="mask0_1_352" maskUnits="userSpaceOnUse" style={{ maskType: "alpha" }} width="20" x="0" y="0">
            <rect fill="#D9D9D9" height="20" width="20" />
          </mask>
          <g mask="url(#mask0_1_352)">
            <path d={svgPaths.p2e80ef40} fill="#1C1B1F" />
          </g>
        </g>
      </svg>
    </div>
  );
}