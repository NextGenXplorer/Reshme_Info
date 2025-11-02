import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase.config';
import Header from '../components/Header';
import Markdown from 'react-native-markdown-display';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enableWeatherNotifications,
  disableWeatherNotifications,
  areWeatherNotificationsEnabled,
  triggerWeatherNotificationNow,
} from '../services/weatherNotificationService';

const { width } = Dimensions.get('window');

// Cache keys and duration for AI responses
const AI_CACHE_KEY_EN = 'ai_suggestions_cache_en';
const AI_CACHE_KEY_KN = 'ai_suggestions_cache_kn';
const AI_CACHE_DURATION = 2.5 * 60 * 60 * 1000; // 2.5 hours in milliseconds

interface CachedAIResponse {
  suggestions: string;
  timestamp: number;
  weather: {
    temperature: number;
    humidity: number;
    windSpeed: number;
  };
}

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  locationName: string;
  // Additional atmospheric data
  precipitation: number;
  rain: number;
  showers: number;
  surfacePressure: number;
  cloudCover: number;
  visibility: number;
  dewPoint: number;
  // Advanced temperature
  apparentTemperature: number;
  soilTemperature0cm: number;
  soilTemperature6cm: number;
  // Sun & UV
  isDay: number;
  uvIndex: number;
}

interface AIResponse {
  suggestions: string;
  loading: boolean;
  error: string | null;
}

interface ContentItem {
  id: string;
  type: 'image' | 'pdf' | 'video' | 'basicInfo';
  title: string;
  titleKn?: string;
  url?: string;
  description?: string;
  descriptionKn?: string;
  order: number;
  active: boolean;
}

export default function InfoScreen() {
  const { t, i18n } = useTranslation();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [aiResponse, setAiResponse] = useState<AIResponse>({
    suggestions: '',
    loading: false,
    error: null,
  });
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'ai' | 'guides' | 'media'>('ai');
  const [lastAiRequestTime, setLastAiRequestTime] = useState<number>(0);
  const [aiRequestCooldown, setAiRequestCooldown] = useState<boolean>(false);
  const [weatherNotificationsEnabled, setWeatherNotificationsEnabled] = useState(false);
  const [aiCacheAge, setAiCacheAge] = useState<number | null>(null);
  const [loadingImages, setLoadingImages] = useState<{ [key: string]: boolean }>({});
  const [imageErrors, setImageErrors] = useState<{ [key: string]: boolean }>({});
  const [selectedImage, setSelectedImage] = useState<{ url: string; title: string } | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [youtubeVideoTitles, setYoutubeVideoTitles] = useState<{ [key: string]: string }>({});

  // Memoized filtered content items for different media types
  const imageItems = useMemo(() => contentItems.filter(item => item.type === 'image'), [contentItems]);
  const videoItems = useMemo(() => contentItems.filter(item => item.type === 'video'), [contentItems]);
  const pdfItems = useMemo(() => contentItems.filter(item => item.type === 'pdf'), [contentItems]);

  useEffect(() => {
    requestLocationAndWeather();
    fetchContent();
    checkWeatherNotificationStatus();
  }, []);

  // Fetch YouTube titles when content items change
  useEffect(() => {
    videoItems.forEach(item => {
      if (item.url && !youtubeVideoTitles[item.id]) {
        fetchYouTubeTitle(item.url, item.id);
      }
    });
  }, [videoItems]);

  // Check weather notification status on mount
  const checkWeatherNotificationStatus = async () => {
    const enabled = await areWeatherNotificationsEnabled();
    setWeatherNotificationsEnabled(enabled);
  };

  // Handle language change - check cache first, don't auto-generate
  useEffect(() => {
    // Skip on initial mount or if no weather data
    if (!weather || aiResponse.suggestions === '') return;

    // Load cached response for new language
    const loadCachedResponseForLanguage = async () => {
      const isKannada = i18n.language === 'kn';
      const language = isKannada ? 'kn' : 'en';

      console.log(`🌐 Language changed to: ${language}`);

      const cachedResponse = await getCachedAIResponse(language, weather);
      if (cachedResponse) {
        // Found cached response for this language - get cache age
        const cacheKey = language === 'kn' ? AI_CACHE_KEY_KN : AI_CACHE_KEY_EN;
        const cachedDataStr = await AsyncStorage.getItem(cacheKey);
        if (cachedDataStr) {
          const cachedData: CachedAIResponse = JSON.parse(cachedDataStr);
          setAiCacheAge(Date.now() - cachedData.timestamp);
        }

        console.log(`✅ Loaded cached response for ${language}`);
        setAiResponse({
          suggestions: cachedResponse,
          loading: false,
          error: null,
        });
      } else {
        // No cache for this language - show empty with message
        console.log(`❌ No cached response for ${language}`);
        setAiCacheAge(null);
        setAiResponse({
          suggestions: '',
          loading: false,
          error: null,
        });
      }
    };

    loadCachedResponseForLanguage();
  }, [i18n.language]);

  const requestLocationAndWeather = async () => {
    try {
      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('locationPermissionRequired'),
          t('locationPermissionMessage')
        );
        return;
      }

      // Get current location
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocation(currentLocation);

      // Fetch weather data from OpenMeteo
      await fetchWeatherData(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude
      );
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(t('error'), t('locationError'));
    }
  };

  const fetchWeatherData = async (latitude: number, longitude: number) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,rain,showers,surface_pressure,cloud_cover,visibility,dew_point_2m,apparent_temperature,soil_temperature_0cm,soil_temperature_6cm,is_day,uv_index&timezone=auto`
      );

      const data = await response.json();

      // Get location name using reverse geocoding
      const locationData = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const locationName = locationData[0]
        ? `${locationData[0].city || locationData[0].district || ''}, ${locationData[0].region || ''}`
        : t('unknownLocation');

      const weatherData: WeatherData = {
        temperature: data.current.temperature_2m,
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        weatherCode: data.current.weather_code,
        locationName,
        // Additional atmospheric data
        precipitation: data.current.precipitation || 0,
        rain: data.current.rain || 0,
        showers: data.current.showers || 0,
        surfacePressure: data.current.surface_pressure || 0,
        cloudCover: data.current.cloud_cover || 0,
        visibility: data.current.visibility || 0,
        dewPoint: data.current.dew_point_2m || 0,
        // Advanced temperature
        apparentTemperature: data.current.apparent_temperature || data.current.temperature_2m,
        soilTemperature0cm: data.current.soil_temperature_0cm || 0,
        soilTemperature6cm: data.current.soil_temperature_6cm || 0,
        // Sun & UV
        isDay: data.current.is_day || 0,
        uvIndex: data.current.uv_index || 0,
      };

      setWeather(weatherData);

      // Generate AI suggestions based on weather
      await generateAISuggestions(weatherData);
    } catch (error) {
      console.error('Weather fetch error:', error);
      Alert.alert(t('error'), t('weatherFetchError'));
    }
  };

  // Check if cached AI response is still fresh
  const getCachedAIResponse = async (language: 'en' | 'kn', weatherData: WeatherData): Promise<string | null> => {
    try {
      const cacheKey = language === 'kn' ? AI_CACHE_KEY_KN : AI_CACHE_KEY_EN;
      const cachedDataStr = await AsyncStorage.getItem(cacheKey);

      if (!cachedDataStr) {
        return null;
      }

      const cachedData: CachedAIResponse = JSON.parse(cachedDataStr);
      const now = Date.now();
      const cacheAge = now - cachedData.timestamp;

      // Check if cache is still fresh (< 2.5 hours)
      if (cacheAge < AI_CACHE_DURATION) {
        // Check if weather conditions are similar (within 3°C and 10% humidity)
        const tempDiff = Math.abs(weatherData.temperature - cachedData.weather.temperature);
        const humidityDiff = Math.abs(weatherData.humidity - cachedData.weather.humidity);

        if (tempDiff <= 3 && humidityDiff <= 10) {
          console.log(`✅ Using cached AI response (${language}), age: ${Math.round(cacheAge / 60000)} minutes`);
          return cachedData.suggestions;
        }
      }

      console.log(`⏰ Cache expired or weather changed significantly for ${language}`);
      return null;
    } catch (error) {
      console.error('Error reading AI cache:', error);
      return null;
    }
  };

  // Save AI response to cache
  const saveAIResponseToCache = async (language: 'en' | 'kn', suggestions: string, weatherData: WeatherData) => {
    try {
      const cacheKey = language === 'kn' ? AI_CACHE_KEY_KN : AI_CACHE_KEY_EN;
      const cacheData: CachedAIResponse = {
        suggestions,
        timestamp: Date.now(),
        weather: {
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          windSpeed: weatherData.windSpeed,
        },
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log(`💾 AI response cached for ${language}`);
    } catch (error) {
      console.error('Error saving AI cache:', error);
    }
  };

  const generateAISuggestions = async (weatherData: WeatherData, forceRefresh: boolean = false) => {
    const isKannada = i18n.language === 'kn';
    const language = isKannada ? 'kn' : 'en';

    // Check cache first unless force refresh
    if (!forceRefresh) {
      const cachedResponse = await getCachedAIResponse(language, weatherData);
      if (cachedResponse) {
        // Get cache age for display
        const cacheKey = language === 'kn' ? AI_CACHE_KEY_KN : AI_CACHE_KEY_EN;
        const cachedDataStr = await AsyncStorage.getItem(cacheKey);
        if (cachedDataStr) {
          const cachedData: CachedAIResponse = JSON.parse(cachedDataStr);
          setAiCacheAge(Date.now() - cachedData.timestamp);
        }

        setAiResponse({
          suggestions: cachedResponse,
          loading: false,
          error: null,
        });
        return;
      } else {
        setAiCacheAge(null);
      }
    }

    // Rate limiting: Prevent requests within 30 seconds
    const now = Date.now();
    const timeSinceLastRequest = now - lastAiRequestTime;
    const COOLDOWN_PERIOD = 30000; // 30 seconds

    if (timeSinceLastRequest < COOLDOWN_PERIOD) {
      const remainingSeconds = Math.ceil((COOLDOWN_PERIOD - timeSinceLastRequest) / 1000);
      setAiResponse({
        suggestions: '',
        loading: false,
        error: t('pleaseWaitBeforeRetrying', { seconds: remainingSeconds }),
      });
      return;
    }

    setAiResponse({ suggestions: '', loading: true, error: null });
    setLastAiRequestTime(now);
    setAiRequestCooldown(true);

    try {
      const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

      if (!apiKey) {
        setAiResponse({
          suggestions: '',
          loading: false,
          error: t('aiApiKeyNotConfigured'),
        });
        setAiRequestCooldown(false);
        return;
      }

      // Determine language for AI response
      const languageInstruction = isKannada
        ? 'IMPORTANT: Provide your entire response in Kannada language (ಕನ್ನಡ). Use Kannada script for all text.'
        : 'Provide your response in English.';

      const prompt = `You are an expert silk farming advisor. ${languageInstruction}

Based on the following current weather conditions, provide specific care recommendations for silk caterpillars (Bombyx mori):

Weather Conditions:
- Temperature: ${weatherData.temperature}°C
- Humidity: ${weatherData.humidity}%
- Wind Speed: ${weatherData.windSpeed} km/h
- Location: ${weatherData.locationName}

Please provide:
1. Temperature Management: Specific advice on maintaining optimal temperature (23-28°C)
2. Humidity Control: Recommendations for maintaining 70-85% humidity
3. Feeding Schedule: How weather affects mulberry leaf feeding
4. Disease Prevention: Weather-related disease risks and prevention
5. Ventilation: Air circulation recommendations based on current conditions

Keep the response concise, practical, and actionable for farmers. Remember to respond in ${isKannada ? 'Kannada (ಕನ್ನಡ)' : 'English'}.`;

      // Use the same working API as aiExtraction.ts
      const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent';

      const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Gemini API Error: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text;

      // Save to cache
      await saveAIResponseToCache(language, text, weatherData);

      setAiResponse({
        suggestions: text,
        loading: false,
        error: null,
      });

      // Fresh response, so cache age is 0
      setAiCacheAge(0);

      // Reset cooldown after 30 seconds
      setTimeout(() => {
        setAiRequestCooldown(false);
      }, COOLDOWN_PERIOD);
    } catch (error) {
      console.error('Gemini AI error:', error);

      // Check if it's a rate limit error (429)
      const errorMessage = error instanceof Error ? error.message : '';
      const isRateLimitError = errorMessage.includes('Resource exhausted') || errorMessage.includes('429');

      setAiResponse({
        suggestions: '',
        loading: false,
        error: isRateLimitError
          ? t('aiRateLimitError')
          : t('aiSuggestionError'),
      });

      setAiRequestCooldown(false);
    }
  };

  const fetchContent = async () => {
    try {
      setLoadingContent(true);
      const q = query(
        collection(db, 'infoContent'),
        where('active', '==', true)
      );
      const querySnapshot = await getDocs(q);
      const items: ContentItem[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          type: data.type,
          title: data.title,
          titleKn: data.titleKn,
          url: data.url,
          description: data.description,
          descriptionKn: data.descriptionKn,
          order: data.order,
          active: data.active,
        });
      });

      // Sort by order
      items.sort((a, b) => a.order - b.order);
      setContentItems(items);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoadingContent(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([requestLocationAndWeather(), fetchContent()]);
    setRefreshing(false);
  };

  const getLocalizedTitle = (item: ContentItem) => {
    return i18n.language === 'kn' && item.titleKn ? item.titleKn : item.title;
  };

  const getLocalizedDescription = (item: ContentItem) => {
    return i18n.language === 'kn' && item.descriptionKn ? item.descriptionKn : item.description;
  };

  const getYouTubeVideoId = (url: string): string | null => {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  const getYouTubeThumbnail = (url: string): string => {
    const videoId = getYouTubeVideoId(url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    return '';
  };

  const fetchYouTubeTitle = async (url: string, itemId: string) => {
    try {
      // Use YouTube oEmbed API (no API key required)
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);

      if (response.ok) {
        const data = await response.json();
        if (data.title) {
          setYoutubeVideoTitles(prev => ({
            ...prev,
            [itemId]: data.title
          }));
        }
      }
    } catch (error) {
      console.log('Error fetching YouTube title:', error);
      // Silently fail - will use fallback title
    }
  };

  const openLink = async (url: string, type: string) => {
    try {
      // Validate URL
      if (!url || url.trim() === '') {
        console.error('Empty URL provided');
        Alert.alert(t('error'), 'No link available');
        return;
      }

      console.log(`Attempting to open ${type}:`, url);

      // For YouTube videos, ensure proper URL format
      if (type === 'video' && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        // Ensure URL starts with http:// or https://
        let formattedUrl = url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          formattedUrl = 'https://' + url;
        }

        console.log('Opening YouTube URL:', formattedUrl);
        await Linking.openURL(formattedUrl);
      } else {
        // For other links (PDFs, images, etc.)
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          console.error('URL not supported:', url);
          Alert.alert(t('error'), t('cannotOpenLink'));
        }
      }
    } catch (error) {
      console.error(`Error opening ${type}:`, error, 'URL:', url);
      Alert.alert(t('error'), `${t('linkOpenError')}: ${url}`);
    }
  };

  const handleWeatherNotificationToggle = async () => {
    try {
      if (weatherNotificationsEnabled) {
        await disableWeatherNotifications();
        setWeatherNotificationsEnabled(false);
        Alert.alert(t('success'), t('weatherNotificationsDisabled'));
      } else {
        // Request location permission first
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            t('locationPermissionRequired'),
            t('locationPermissionMessage')
          );
          return;
        }

        await enableWeatherNotifications();
        setWeatherNotificationsEnabled(true);
        Alert.alert(t('success'), t('weatherNotificationsEnabled'));
      }
    } catch (error) {
      console.error('Error toggling weather notifications:', error);
      Alert.alert(t('error'), t('failedToUpdateWeatherNotifications'));
    }
  };

  const handleTestWeatherNotification = async () => {
    await triggerWeatherNotificationNow();
  };

  // Render Hero Weather Section
  const renderHeroWeather = () => {
    if (!weather) return null;

    const getWeatherIcon = () => {
      if (weather.weatherCode >= 61 && weather.weatherCode <= 67) return 'rainy';
      if (weather.weatherCode >= 71 && weather.weatherCode <= 77) return 'snow';
      if (weather.weatherCode >= 2 && weather.weatherCode <= 3) return 'cloudy';
      if (weather.weatherCode >= 95) return 'thunderstorm';
      return 'sunny';
    };

    return (
      <View style={styles.heroWeather}>
        <LinearGradient
          colors={['#8B5CF6', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          {/* Location */}
          <View style={styles.heroHeader}>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={16} color="#FFFFFF" />
              <Text style={styles.heroLocation}>{weather.locationName}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              {/* Test Notification Button */}
              {weatherNotificationsEnabled && (
                <TouchableOpacity
                  onPress={handleTestWeatherNotification}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 12
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>Test</Text>
                </TouchableOpacity>
              )}
              {/* Notification Toggle */}
              <TouchableOpacity onPress={handleWeatherNotificationToggle}>
                <Ionicons
                  name={weatherNotificationsEnabled ? "notifications" : "notifications-outline"}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Temperature */}
          <View style={styles.heroTempSection}>
            <Ionicons name={getWeatherIcon()} size={80} color="#FFFFFF" />
            <Text style={styles.heroTemp}>{Math.round(weather.temperature)}°</Text>
          </View>

          {/* Weather Details - Primary */}
          <View style={styles.heroDetails}>
            <View style={styles.heroDetailItem}>
              <Ionicons name="water-outline" size={20} color="#E9D5FF" />
              <Text style={styles.heroDetailLabel}>{t('weatherHumidity')}</Text>
              <Text style={styles.heroDetailValue}>{weather.humidity}%</Text>
            </View>
            <View style={styles.heroDetailDivider} />
            <View style={styles.heroDetailItem}>
              <Ionicons name="speedometer-outline" size={20} color="#E9D5FF" />
              <Text style={styles.heroDetailLabel}>{t('weatherWind')}</Text>
              <Text style={styles.heroDetailValue}>{weather.windSpeed} km/h</Text>
            </View>
            <View style={styles.heroDetailDivider} />
            <View style={styles.heroDetailItem}>
              <Ionicons name="sunny-outline" size={20} color="#E9D5FF" />
              <Text style={styles.heroDetailLabel}>UV Index</Text>
              <Text style={styles.heroDetailValue}>{weather.uvIndex}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Comprehensive Weather Data Cards */}
        <View style={styles.weatherCardsContainer}>
          {/* Temperature Details Card */}
          <View style={styles.weatherCard}>
            <View style={styles.weatherCardHeader}>
              <Ionicons name="thermometer" size={20} color="#EF4444" />
              <Text style={styles.weatherCardTitle}>Temperature</Text>
            </View>
            <View style={styles.weatherCardContent}>
              <View style={styles.weatherDataRow}>
                <Text style={styles.weatherDataLabel}>Actual</Text>
                <Text style={styles.weatherDataValue}>{weather.temperature.toFixed(1)}°C</Text>
              </View>
              <View style={styles.weatherDataRow}>
                <Text style={styles.weatherDataLabel}>Feels Like</Text>
                <Text style={styles.weatherDataValue}>{weather.apparentTemperature.toFixed(1)}°C</Text>
              </View>
              <View style={styles.weatherDataRow}>
                <Text style={styles.weatherDataLabel}>Dew Point</Text>
                <Text style={styles.weatherDataValue}>{weather.dewPoint.toFixed(1)}°C</Text>
              </View>
            </View>
          </View>

          {/* Soil Temperature Card */}
          <View style={styles.weatherCard}>
            <View style={styles.weatherCardHeader}>
              <Ionicons name="leaf" size={20} color="#10B981" />
              <Text style={styles.weatherCardTitle}>Soil Temp</Text>
            </View>
            <View style={styles.weatherCardContent}>
              <View style={styles.weatherDataRow}>
                <Text style={styles.weatherDataLabel}>Surface</Text>
                <Text style={styles.weatherDataValue}>{weather.soilTemperature0cm.toFixed(1)}°C</Text>
              </View>
              <View style={styles.weatherDataRow}>
                <Text style={styles.weatherDataLabel}>6cm Depth</Text>
                <Text style={styles.weatherDataValue}>{weather.soilTemperature6cm.toFixed(1)}°C</Text>
              </View>
            </View>
          </View>

          {/* Precipitation Card */}
          <View style={styles.weatherCard}>
            <View style={styles.weatherCardHeader}>
              <Ionicons name="rainy" size={20} color="#3B82F6" />
              <Text style={styles.weatherCardTitle}>Precipitation</Text>
            </View>
            <View style={styles.weatherCardContent}>
              <View style={styles.weatherDataRow}>
                <Text style={styles.weatherDataLabel}>Total</Text>
                <Text style={styles.weatherDataValue}>{weather.precipitation.toFixed(1)} mm</Text>
              </View>
              <View style={styles.weatherDataRow}>
                <Text style={styles.weatherDataLabel}>Rain</Text>
                <Text style={styles.weatherDataValue}>{weather.rain.toFixed(1)} mm</Text>
              </View>
              <View style={styles.weatherDataRow}>
                <Text style={styles.weatherDataLabel}>Showers</Text>
                <Text style={styles.weatherDataValue}>{weather.showers.toFixed(1)} mm</Text>
              </View>
            </View>
          </View>

          {/* Atmospheric Conditions Card */}
          <View style={styles.weatherCard}>
            <View style={styles.weatherCardHeader}>
              <Ionicons name="analytics" size={20} color="#8B5CF6" />
              <Text style={styles.weatherCardTitle}>Atmospheric</Text>
            </View>
            <View style={styles.weatherCardContent}>
              <View style={styles.weatherDataRow}>
                <Text style={styles.weatherDataLabel}>Pressure</Text>
                <Text style={styles.weatherDataValue}>{weather.surfacePressure.toFixed(0)} hPa</Text>
              </View>
              <View style={styles.weatherDataRow}>
                <Text style={styles.weatherDataLabel}>Cloud Cover</Text>
                <Text style={styles.weatherDataValue}>{weather.cloudCover}%</Text>
              </View>
              <View style={styles.weatherDataRow}>
                <Text style={styles.weatherDataLabel}>Visibility</Text>
                <Text style={styles.weatherDataValue}>{(weather.visibility / 1000).toFixed(1)} km</Text>
              </View>
            </View>
          </View>

          {/* Day/Night Indicator */}
          <View style={[styles.weatherCard, styles.dayNightCard]}>
            <View style={styles.dayNightContent}>
              <Ionicons
                name={weather.isDay === 1 ? "sunny" : "moon"}
                size={32}
                color={weather.isDay === 1 ? "#F59E0B" : "#6366F1"}
              />
              <Text style={styles.dayNightText}>
                {weather.isDay === 1 ? 'Daytime' : 'Nighttime'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Render Quick Stats
  const renderQuickStats = () => {
    const basicInfoCount = contentItems.filter(i => i.type === 'basicInfo').length;
    const imageCount = contentItems.filter(i => i.type === 'image').length;
    const pdfCount = contentItems.filter(i => i.type === 'pdf').length;
    const videoCount = contentItems.filter(i => i.type === 'video').length;

    return (
      <View style={styles.quickStats}>
        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
            <Ionicons name="book-outline" size={24} color="#3B82F6" />
          </View>
          <Text style={styles.statValue}>{basicInfoCount + pdfCount}</Text>
          <Text style={styles.statLabel}>{t('statGuides')}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#DCFCE7' }]}>
            <Ionicons name="images-outline" size={24} color="#10B981" />
          </View>
          <Text style={styles.statValue}>{imageCount}</Text>
          <Text style={styles.statLabel}>{t('statImages')}</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="play-circle-outline" size={24} color="#EF4444" />
          </View>
          <Text style={styles.statValue}>{videoCount}</Text>
          <Text style={styles.statLabel}>{t('statVideos')}</Text>
        </View>
      </View>
    );
  };

  // Render Tab Navigation
  const renderTabs = () => (
    <View style={styles.tabs}>
      <TouchableOpacity
        style={[styles.tab, selectedTab === 'ai' && styles.tabActive]}
        onPress={() => setSelectedTab('ai')}
      >
        <Ionicons
          name="bulb"
          size={20}
          color={selectedTab === 'ai' ? '#8B5CF6' : '#9CA3AF'}
        />
        <Text style={[styles.tabText, selectedTab === 'ai' && styles.tabTextActive]}>
          {t('tabAISuggestions')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'guides' && styles.tabActive]}
        onPress={() => setSelectedTab('guides')}
      >
        <Ionicons
          name="document-text"
          size={20}
          color={selectedTab === 'guides' ? '#8B5CF6' : '#9CA3AF'}
        />
        <Text style={[styles.tabText, selectedTab === 'guides' && styles.tabTextActive]}>
          {t('statGuides')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, selectedTab === 'media' && styles.tabActive]}
        onPress={() => setSelectedTab('media')}
      >
        <Ionicons
          name="play-circle"
          size={20}
          color={selectedTab === 'media' ? '#8B5CF6' : '#9CA3AF'}
        />
        <Text style={[styles.tabText, selectedTab === 'media' && styles.tabTextActive]}>
          {t('statMedia')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Get cache age display text
  const getCacheAgeText = () => {
    if (aiCacheAge === null) return null;

    const ageInMinutes = Math.round(aiCacheAge / 60000);
    const ageInHours = Math.round(aiCacheAge / 3600000);

    if (ageInMinutes < 1) {
      return t('justNow');
    } else if (ageInMinutes < 60) {
      return t('updatedMinutesAgo', { minutes: ageInMinutes });
    } else {
      return t('hoursAgo', { count: ageInHours });
    }
  };

  // Render AI Suggestions Tab Content
  const renderAISuggestions = () => (
    <View style={styles.tabContent}>
      <View style={styles.contentCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.cardIconContainer}>
              <Ionicons name="sparkles" size={20} color="#8B5CF6" />
            </View>
            <Text style={styles.cardTitle}>{t('aiPoweredCareTips')}</Text>
          </View>
          {aiCacheAge !== null && !aiResponse.loading && !aiResponse.error && aiResponse.suggestions && (
            <View style={styles.cacheBadge}>
              <Ionicons name="time-outline" size={12} color="#6B7280" />
              <Text style={styles.cacheBadgeText}>{getCacheAgeText()}</Text>
            </View>
          )}
        </View>

        {aiResponse.loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>{t('generatingAISuggestions')}</Text>
          </View>
        ) : aiResponse.error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
            <Text style={styles.errorText}>{aiResponse.error}</Text>
            <TouchableOpacity
              style={[styles.retryButton, aiRequestCooldown && styles.retryButtonDisabled]}
              onPress={() => weather && !aiRequestCooldown && generateAISuggestions(weather, true)}
              disabled={aiRequestCooldown}
            >
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>
                {aiRequestCooldown ? t('pleaseWait') : t('retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : aiResponse.suggestions ? (
          <View style={styles.cardContent}>
            <Markdown style={markdownStyles}>
              {aiResponse.suggestions}
            </Markdown>
          </View>
        ) : (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="language-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateTitle}>
              {i18n.language === 'kn' ? t('emptyAITitleKannada') : t('emptyAITitle')}
            </Text>
            <Text style={styles.emptyStateText}>
              {i18n.language === 'kn' ? t('emptyAIDescriptionKannada') : t('emptyAIDescription')}
            </Text>
            <TouchableOpacity
              style={[styles.generateButton, aiRequestCooldown && styles.retryButtonDisabled]}
              onPress={() => weather && !aiRequestCooldown && generateAISuggestions(weather, false)}
              disabled={aiRequestCooldown}
            >
              <Ionicons name="bulb" size={18} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>
                {t('generateSuggestions')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );

  // Render Guides Tab Content
  const renderGuidesContent = () => {
    const basicInfoItems = contentItems.filter(item => item.type === 'basicInfo');
    const pdfItems = contentItems.filter(item => item.type === 'pdf');

    return (
      <View style={styles.tabContent}>
        {/* Basic Info Cards */}
        {basicInfoItems.map((item) => (
          <View key={item.id} style={styles.contentCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardIconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="book" size={20} color="#3B82F6" />
                </View>
                <Text style={styles.cardTitle}>{getLocalizedTitle(item)}</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.guideText}>
                {getLocalizedDescription(item) || t('silkCaterpillarInfo')}
              </Text>
            </View>
          </View>
        ))}

        {/* PDF Guides */}
        {pdfItems.length > 0 && (
          <View style={styles.contentCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardIconContainer, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="document-text" size={20} color="#EF4444" />
                </View>
                <Text style={styles.cardTitle}>{t('pdfGuides')}</Text>
              </View>
              <Text style={styles.cardBadge}>{pdfItems.length}</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.mediaGrid}>
                {pdfItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.mediaGridItem}
                    onPress={() => openLink(item.url || '', 'pdf')}
                  >
                    <View style={styles.pdfContainer}>
                      <Ionicons name="document-text" size={48} color="#EF4444" />
                      <View style={styles.pdfBadge}>
                        <Text style={styles.pdfBadgeText}>PDF</Text>
                      </View>
                    </View>
                    <View style={styles.pdfInfo}>
                      <Text style={styles.mediaGridText} numberOfLines={2}>
                        {getLocalizedTitle(item)}
                      </Text>
                      {getLocalizedDescription(item) && (
                        <Text style={styles.pdfDescription} numberOfLines={2}>
                          {getLocalizedDescription(item)}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  // Render Media Tab Content
  const renderMediaContent = () => {
    return (
      <View style={styles.tabContent}>
        {/* Image Gallery */}
        {imageItems.length > 0 && (
          <View style={styles.contentCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardIconContainer, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="images" size={20} color="#10B981" />
                </View>
                <Text style={styles.cardTitle}>{t('imageGalleryTitle')}</Text>
              </View>
              <Text style={styles.cardBadge}>{imageItems.length}</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.mediaGrid}>
                {imageItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.mediaGridItem}
                    onPress={() => {
                      setSelectedImageIndex(index);
                      setSelectedImage({ url: item.url || '', title: getLocalizedTitle(item) });
                    }}
                  >
                    <View style={styles.imageContainer}>
                      {!imageErrors[item.id] ? (
                        <>
                          <Image
                            source={{ uri: item.url }}
                            style={styles.gridImage}
                            resizeMode="cover"
                            onLoadStart={() => setLoadingImages({ ...loadingImages, [item.id]: true })}
                            onLoadEnd={() => setLoadingImages({ ...loadingImages, [item.id]: false })}
                            onError={() => {
                              setLoadingImages({ ...loadingImages, [item.id]: false });
                              setImageErrors({ ...imageErrors, [item.id]: true });
                            }}
                          />
                          {loadingImages[item.id] && (
                            <View style={styles.imageLoadingOverlay}>
                              <ActivityIndicator size="small" color="#10B981" />
                            </View>
                          )}
                        </>
                      ) : (
                        <View style={styles.imageErrorContainer}>
                          <Ionicons name="alert-circle" size={32} color="#9CA3AF" />
                          <Text style={styles.imageErrorText}>{t('imageLoadError')}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.imageInfo}>
                      <Text style={styles.mediaGridText} numberOfLines={2}>
                        {getLocalizedTitle(item)}
                      </Text>
                      {getLocalizedDescription(item) && (
                        <Text style={styles.imageDescription} numberOfLines={2}>
                          {getLocalizedDescription(item)}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Video Tutorials */}
        {videoItems.length > 0 && (
          <View style={styles.contentCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.cardIconContainer, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="play-circle" size={20} color="#EF4444" />
                </View>
                <Text style={styles.cardTitle}>{t('videoTutorialsTitle')}</Text>
              </View>
              <Text style={styles.cardBadge}>{videoItems.length}</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={styles.videoGrid}>
                {videoItems.map((item) => {
                  const thumbnailUrl = getYouTubeThumbnail(item.url || '');
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.videoGridItem}
                      onPress={() => openLink(item.url || '', 'video')}
                    >
                      <View style={styles.videoThumbnailContainer}>
                        {thumbnailUrl ? (
                          <>
                            <Image
                              source={{ uri: thumbnailUrl }}
                              style={styles.videoThumbnail}
                              resizeMode="cover"
                              onLoadStart={() => setLoadingImages({ ...loadingImages, [`video_${item.id}`]: true })}
                              onLoadEnd={() => setLoadingImages({ ...loadingImages, [`video_${item.id}`]: false })}
                              onError={() => {
                                setLoadingImages({ ...loadingImages, [`video_${item.id}`]: false });
                                setImageErrors({ ...imageErrors, [`video_${item.id}`]: true });
                              }}
                            />
                            {loadingImages[`video_${item.id}`] && (
                              <View style={styles.imageLoadingOverlay}>
                                <ActivityIndicator size="small" color="#EF4444" />
                              </View>
                            )}
                            {!loadingImages[`video_${item.id}`] && !imageErrors[`video_${item.id}`] && (
                              <View style={styles.playButtonOverlay}>
                                <View style={styles.playButton}>
                                  <Ionicons name="play" size={32} color="#FFFFFF" />
                                </View>
                              </View>
                            )}
                          </>
                        ) : (
                          <View style={styles.videoPlaceholder}>
                            <Ionicons name="play-circle" size={48} color="#EF4444" />
                          </View>
                        )}
                        <View style={styles.videoDurationBadge}>
                          <Ionicons name="logo-youtube" size={16} color="#FFFFFF" />
                        </View>
                      </View>
                      <View style={styles.videoInfo}>
                        <Text style={styles.videoTitle} numberOfLines={2}>
                          {youtubeVideoTitles[item.id] || getLocalizedTitle(item)}
                        </Text>
                        {getLocalizedDescription(item) && (
                          <Text style={styles.videoDescription} numberOfLines={3}>
                            {getLocalizedDescription(item)}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('caterpillarCareInfo')} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#8B5CF6']}
            tintColor="#8B5CF6"
          />
        }
      >
        {renderHeroWeather()}
        {renderQuickStats()}
        {renderTabs()}

        {selectedTab === 'ai' && renderAISuggestions()}
        {selectedTab === 'guides' && renderGuidesContent()}
        {selectedTab === 'media' && renderMediaContent()}
      </ScrollView>

      {/* Fullscreen Image Viewer Modal with Zoom */}
      <Modal
        visible={selectedImage !== null}
        transparent={true}
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={{ flex: 1, marginLeft: -20, marginRight: -20 }}>
          <ImageViewer
            imageUrls={imageItems.map((item) => ({
              url: item.url || '',
              props: {
                source: { uri: item.url || '' }
              }
            }))}
            index={selectedImageIndex}
            enableSwipeDown={true}
            onSwipeDown={() => setSelectedImage(null)}
            onCancel={() => setSelectedImage(null)}
            backgroundColor="rgba(0, 0, 0, 0.9)"
            renderHeader={(currentIndex) => (
              <View style={styles.imageViewerHeader}>
                <TouchableOpacity
                  style={styles.imageViewerClose}
                  onPress={() => setSelectedImage(null)}
                >
                  <Ionicons name="close-circle" size={36} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}
            renderFooter={(currentIndex) => (
              <View style={styles.imageViewerFooter}>
                <Text style={styles.imageViewerTitle}>
                  {getLocalizedTitle(imageItems[currentIndex])}
                </Text>
                <Text style={styles.imageViewerCounter}>
                  {currentIndex + 1} / {imageItems.length}
                </Text>
              </View>
            )}
            renderIndicator={() => null}
            enableImageZoom={true}
            saveToLocalByLongPress={false}
            doubleClickInterval={250}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },

  // Hero Weather Section
  heroWeather: {
    marginBottom: 0,
  },
  heroGradient: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 32,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroLocation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 6,
  },
  heroTempSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heroTemp: {
    fontSize: 72,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 16,
  },
  heroDetails: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-around',
  },
  heroDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroDetailDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 16,
  },
  heroDetailLabel: {
    fontSize: 12,
    color: '#E9D5FF',
    marginTop: 4,
    fontWeight: '500',
  },
  heroDetailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },

  // Comprehensive Weather Cards
  weatherCardsContainer: {
    padding: 16,
    gap: 12,
  },
  weatherCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  weatherCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  weatherCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  weatherCardContent: {
    gap: 10,
  },
  weatherDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  weatherDataLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  weatherDataValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  dayNightCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  dayNightContent: {
    alignItems: 'center',
    gap: 12,
  },
  dayNightText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },

  // Quick Stats
  quickStats: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#F3F4F6',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#8B5CF6',
  },

  // Tab Content
  tabContent: {
    paddingHorizontal: 16,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  cardBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  cacheBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cacheBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardContent: {
    padding: 16,
  },

  // AI/Guide Content
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 8,
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  guideText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },

  // Media Items
  mediaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  mediaItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mediaIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  mediaItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },

  // Media Grid (for images)
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  mediaGridItem: {
    width: (width - 80) / 2,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    margin: 6,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageErrorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  imageErrorText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  mediaGridText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  imageInfo: {
    width: '100%',
  },
  imageDescription: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // PDF Grid
  pdfContainer: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FEE2E2',
    borderStyle: 'dashed',
    position: 'relative',
  },
  pdfBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pdfBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  pdfInfo: {
    width: '100%',
  },
  pdfDescription: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },

  // Video Grid
  videoGrid: {
    gap: 12,
  },
  videoGridItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  videoThumbnailContainer: {
    width: '100%',
    height: 180,
    backgroundColor: '#1F2937',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  videoDurationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoInfo: {
    padding: 12,
  },
  videoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 20,
  },
  videoDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Image Viewer Modal
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imageViewerContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: width,
    height: '80%',
  },
  imageViewerFooter: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 16,
    borderRadius: 12,
  },
  imageViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  imageViewerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  imageViewerCounter: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});

// Markdown Styles
const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  heading1: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 8,
  },
  heading2: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 6,
  },
  heading3: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginTop: 6,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 8,
  },
  strong: {
    fontWeight: '700',
    color: '#111827',
  },
  em: {
    fontStyle: 'italic',
    color: '#4B5563',
  },
  bullet_list: {
    marginBottom: 8,
  },
  ordered_list: {
    marginBottom: 8,
  },
  list_item: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 4,
  },
  code_inline: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#8B5CF6',
  },
  code_block: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#111827',
    marginBottom: 8,
  },
  blockquote: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  hr: {
    backgroundColor: '#E5E7EB',
    height: 1,
    marginVertical: 12,
  },
});
