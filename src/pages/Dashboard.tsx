import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { 
  Plus, 
  FileText, 
  CalendarIcon, 
  Cpu, 
  Wifi, 
  HardDrive, 
  Cloud,
  Search,
  MapPin,
  Loader2
} from "lucide-react";

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  loading: boolean;
  error: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  status: string;
}

interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
}

interface TaskProgress {
  title: string;
  progress: number;
}

export default function Dashboard() {
  const [greeting, setGreeting] = useState("");
  const [userName, setUserName] = useState("Creator");
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([]);
  const [calculatorDisplay, setCalculatorDisplay] = useState("2,450.00");
  const [calculatorExpression, setCalculatorExpression] = useState("");
  const [weather, setWeather] = useState<WeatherData>({
    temperature: 0,
    condition: "",
    location: "",
    loading: true,
    error: null,
  });

  useEffect(() => {
    updateGreeting();
    fetchUserProfile();
    fetchRecentTasks();
    fetchTodayEvents();
    fetchTaskProgress();
    fetchWeather();

    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
      updateGreeting();
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const updateGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning");
    } else if (hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", user.id)
          .single();
        
        if (profile?.name) {
          setUserName(profile.name);
        }
      }
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
    }
  };

  const fetchRecentTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, description, created_at, status")
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;
      setRecentTasks(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch tasks",
        variant: "destructive",
      });
    }
  };

  const fetchTodayEvents = async () => {
    try {
      // Mock events since events table isn't in the types
      // In production, this would fetch from the events table
      const mockEvents: Event[] = [];
      setTodayEvents(mockEvents);
    } catch (error) {
      console.error("Error fetching today's events:", error);
    }
  };

  const fetchTaskProgress = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("title, status")
        .order("created_at", { ascending: false })
        .limit(2);

      if (error) throw error;
      
      // Convert tasks to progress format for display
      const progress: TaskProgress[] = (data || []).map((task) => ({
        title: task.title,
        progress: task.status === "done" ? 95 : task.status === "in_progress" ? 32 : 0,
      }));
      
      setTaskProgress(progress);
    } catch (error) {
      console.error("Error fetching task progress:", error);
    }
  };

  const fetchWeather = async () => {
    try {
      // Get user's geolocation
      if (!navigator.geolocation) {
        setWeather((prev) => ({
          ...prev,
          loading: false,
          error: "Geolocation is not supported by your browser",
        }));
        return;
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        });
      });

      const { latitude, longitude } = position.coords;

      // Get browser's timezone for weather API
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Fetch weather data from Open-Meteo API (free, no API key required)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,wind_speed_10m&timezone=${encodeURIComponent(timezone)}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }

      const data = await response.json();
      const current = data.current;

      // Map WMO weather code to description
      const weatherCodes: Record<number, string> = {
        0: "Clear sky",
        1: "Mainly clear",
        2: "Partly cloudy",
        3: "Overcast",
        45: "Foggy",
        48: "Depositing rime fog",
        51: "Light drizzle",
        53: "Moderate drizzle",
        55: "Dense drizzle",
        61: "Slight rain",
        63: "Moderate rain",
        65: "Heavy rain",
        71: "Slight snow",
        73: "Moderate snow",
        75: "Heavy snow",
        80: "Slight rain showers",
        81: "Moderate rain showers",
        82: "Violent rain showers",
        95: "Thunderstorm",
        96: "Thunderstorm with slight hail",
        99: "Thunderstorm with heavy hail",
      };

      const condition = weatherCodes[current.weather_code] || "Unknown";

      // Get city name from coordinates using Nominatim (OpenStreetMap) reverse geocoding
      // Use cached data if available (5 minute cache)
      const cacheKey = `weather_location_${latitude.toFixed(2)}_${longitude.toFixed(2)}`;
      const cached = localStorage.getItem(cacheKey);
      let cityName = "Unknown";

      if (cached) {
        try {
          const { cityName: cachedCityName, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < 300000) { // 5 minutes cache
            cityName = cachedCityName;
          } else {
            // Cache expired, fetch fresh data
            const geoResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
              {
                headers: {
                  "User-Agent": "Task Manager Dashboard/1.0",
                },
              }
            );

            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              // Try to get city/town/village/suburb first, then state, then country as fallbacks
              if (geoData.address) {
                cityName =
                  geoData.address.city ||
                  geoData.address.town ||
                  geoData.address.village ||
                  geoData.address.suburb ||
                  geoData.address.state ||
                  geoData.address.country ||
                  "Unknown";
              } else {
                cityName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
              }
              // Cache the result
              localStorage.setItem(cacheKey, JSON.stringify({ cityName, timestamp: Date.now() }));
            } else {
              console.warn("Geocoding API failed, using coordinates");
              cityName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
            }
          }
        } catch {
          // Cache parse error, fetch fresh data
          const geoResponse = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            {
              headers: {
                "User-Agent": "Task Manager Dashboard/1.0",
              },
            }
          );

          if (geoResponse.ok) {
            const geoData = await geoResponse.json();
            if (geoData.address) {
              cityName =
                geoData.address.city ||
                geoData.address.town ||
                geoData.address.village ||
                geoData.address.suburb ||
                geoData.address.state ||
                geoData.address.country ||
                "Unknown";
            } else {
              cityName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
            }
            localStorage.setItem(cacheKey, JSON.stringify({ cityName, timestamp: Date.now() }));
          } else {
            console.warn("Geocoding API failed, using coordinates");
            cityName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          }
        }
      } else {
        // No cache, fetch fresh data
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          {
            headers: {
              "User-Agent": "Task Manager Dashboard/1.0",
            },
          }
        );

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          // Try to get city/town/village/suburb first, then state, then country as fallbacks
          if (geoData.address) {
            cityName =
              geoData.address.city ||
              geoData.address.town ||
              geoData.address.village ||
              geoData.address.suburb ||
              geoData.address.state ||
              geoData.address.country ||
              "Unknown";
          } else {
            cityName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
          }
          // Cache the result
          localStorage.setItem(cacheKey, JSON.stringify({ cityName, timestamp: Date.now() }));
        } else {
          console.warn("Geocoding API failed, using coordinates");
          cityName = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
        }
      }

      setWeather({
        temperature: Math.round(current.temperature_2m),
        condition,
        location: cityName,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      // Handle geolocation-specific errors
      if (error instanceof GeolocationPositionError) {
        let errorMessage = "Failed to get your location";
        switch (error.code) {
          case GeolocationPositionError.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions.";
            break;
          case GeolocationPositionError.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
          case GeolocationPositionError.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable.";
            break;
        }
        setWeather((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
        return;
      }

      const errorMessage = error instanceof Error ? error.message : "Failed to load weather";
      console.error("Error fetching weather:", error);
      setWeather((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
    }
  };

  const handleCalculatorClick = (value: string) => {
    if (value === "C") {
      setCalculatorDisplay("0");
      setCalculatorExpression("");
    } else if (value === "=") {
      try {
        const result = eval(calculatorExpression);
        setCalculatorDisplay(result.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setCalculatorExpression(result.toString());
      } catch {
        setCalculatorDisplay("Error");
        setCalculatorExpression("");
      }
    } else {
      const newExpression = calculatorExpression + value;
      setCalculatorExpression(newExpression);
      try {
        const preview = eval(newExpression);
        setCalculatorDisplay(preview.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      } catch {
        // Keep current display if expression is not yet valid
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Greeting Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {format(currentDateTime, "EEEE, MMM d")} • {format(currentDateTime, "HH:mm")}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
          <Search className="h-3 w-3" />
          Cmd+K
        </Badge>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Row 1: Tasks (Quick Notes), Today, System Widgets */}
        <Card className="md:col-span-4 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Quick Notes
            </CardTitle>
            <Button size="icon" variant="ghost" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTasks.length > 0 ? (
              recentTasks.map((task) => (
                <div key={task.id} className="space-y-1">
                  <h4 className="text-sm font-medium">{task.title}</h4>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No tasks yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-4 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {todayEvents.length > 0 ? (
              todayEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-3">
                  <div className="text-xs text-muted-foreground min-w-[50px]">
                    {event.time}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No events scheduled</p>
            )}
          </CardContent>
        </Card>

        <div className="md:col-span-4 grid grid-cols-2 gap-4">
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
              <Cpu className="h-6 w-6 mb-2 text-primary" />
              <div className="text-2xl font-bold">12%</div>
              <div className="text-xs text-muted-foreground">CPU LOAD</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
              <Wifi className="h-6 w-6 mb-2 text-green-500" />
              <div className="text-2xl font-bold">1.2</div>
              <div className="text-xs text-muted-foreground">GB/s DOWN</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
              <HardDrive className="h-6 w-6 mb-2 text-orange-500" />
              <div className="text-sm font-medium">SSD Status</div>
              <div className="text-xs text-muted-foreground">Healthy • 240GB Free</div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4 flex flex-col items-center justify-center h-full">
              {weather.loading ? (
                <>
                  <Loader2 className="h-6 w-6 mb-2 text-blue-400 animate-spin" />
                  <div className="text-xs text-muted-foreground">Loading...</div>
                </>
              ) : weather.error ? (
                <>
                  <MapPin className="h-6 w-6 mb-2 text-red-400" />
                  <div className="text-xs text-muted-foreground text-center">{weather.error}</div>
                </>
              ) : (
                <>
                  <Cloud className="h-6 w-6 mb-2 text-blue-400" />
                  <div className="text-2xl font-bold">{weather.temperature}°</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {weather.condition}, {weather.location}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Calculator, Active Sprints */}
        <Card className="md:col-span-4 bg-card/50 backdrop-blur">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="bg-background/60 p-4 rounded-lg text-right">
                <div className="text-3xl font-mono font-bold">{calculatorDisplay}</div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {["7", "8", "9", "+"].map((btn) => (
                  <Button
                    key={btn}
                    variant="outline"
                    className="h-12"
                    onClick={() => handleCalculatorClick(btn)}
                  >
                    {btn}
                  </Button>
                ))}
                {["4", "5", "6", "×"].map((btn) => (
                  <Button
                    key={btn}
                    variant="outline"
                    className="h-12"
                    onClick={() => handleCalculatorClick(btn === "×" ? "*" : btn)}
                  >
                    {btn}
                  </Button>
                ))}
                {["1", "2", "3", "-"].map((btn) => (
                  <Button
                    key={btn}
                    variant="outline"
                    className="h-12"
                    onClick={() => handleCalculatorClick(btn)}
                  >
                    {btn}
                  </Button>
                ))}
                {["C", "0", "=", "÷"].map((btn) => (
                  <Button
                    key={btn}
                    variant={btn === "=" ? "default" : "outline"}
                    className="h-12"
                    onClick={() => handleCalculatorClick(btn === "÷" ? "/" : btn)}
                  >
                    {btn}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-8 bg-card/50 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Sprints</CardTitle>
            <span className="text-xs text-muted-foreground">UPDATED 4M AGO</span>
          </CardHeader>
          <CardContent className="space-y-4">
            {taskProgress.length > 0 ? (
              taskProgress.map((item, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">{item.title}</h4>
                    <span className="text-sm font-medium text-primary">{item.progress}%</span>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No active sprints</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
