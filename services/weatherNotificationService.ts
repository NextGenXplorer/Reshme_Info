import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const LAST_WEATHER_KEY = 'last_weather_notification';
const WEATHER_ENABLED_KEY = 'weather_notifications_enabled';
const WEATHER_NOTIFICATION_ID = 'weather_notification_id';

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

// Fetch and check weather data
async function fetchAndCheckWeather(): Promise<boolean> {
  try {
    console.log('⏰ Checking weather data');

    // Check if notifications are enabled
    const enabled = await AsyncStorage.getItem(WEATHER_ENABLED_KEY);
    if (enabled !== 'true') {
      console.log('❌ Weather notifications disabled');
      return false;
    }

    // Get location permission
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('❌ No location permission');
      return false;
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    // Fetch comprehensive weather data
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.coords.latitude}&longitude=${location.coords.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,rain,showers,surface_pressure,cloud_cover,visibility,dew_point_2m,apparent_temperature,soil_temperature_0cm,soil_temperature_6cm,is_day,uv_index&timezone=auto`
    );

    const data = await response.json();

    // Get location name
    const locationData = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const locationName = locationData[0]
      ? `${locationData[0].city || locationData[0].district || ''}, ${locationData[0].region || ''}`
      : 'Your Location';

    const weather: WeatherData = {
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

    // Check if weather changed significantly
    const lastWeatherStr = await AsyncStorage.getItem(LAST_WEATHER_KEY);
    let shouldNotify = true;

    if (lastWeatherStr) {
      const lastWeather: WeatherData = JSON.parse(lastWeatherStr);

      // Only notify if temperature changed by more than 2°C or humidity by 10%
      const tempDiff = Math.abs(weather.temperature - lastWeather.temperature);
      const humidityDiff = Math.abs(weather.humidity - lastWeather.humidity);

      shouldNotify = tempDiff >= 2 || humidityDiff >= 10;
    }

    if (shouldNotify) {
      // Generate notification content
      const notificationContent = generateWeatherNotification(weather);

      // Send local notification
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Send immediately
      });

      // Save weather data
      await AsyncStorage.setItem(LAST_WEATHER_KEY, JSON.stringify(weather));

      console.log('✅ Weather notification sent:', weather);
    } else {
      console.log('ℹ️ Weather unchanged, skipping notification');
    }

    return true;
  } catch (error) {
    console.error('❌ Weather check error:', error);
    return false;
  }
}

function generateWeatherNotification(weather: WeatherData): Notifications.NotificationContentInput {
  // Determine weather condition based on code
  let condition = 'Clear';
  let emoji = '☀️';

  if (weather.weatherCode >= 61 && weather.weatherCode <= 67) {
    condition = 'Rainy';
    emoji = '🌧️';
  } else if (weather.weatherCode >= 71 && weather.weatherCode <= 77) {
    condition = 'Snowy';
    emoji = '❄️';
  } else if (weather.weatherCode >= 51 && weather.weatherCode <= 57) {
    condition = 'Drizzle';
    emoji = '🌦️';
  } else if (weather.weatherCode >= 2 && weather.weatherCode <= 3) {
    condition = 'Cloudy';
    emoji = '☁️';
  } else if (weather.weatherCode >= 95) {
    condition = 'Stormy';
    emoji = '⛈️';
  }

  // Generate care advice based on conditions
  let careAdvice = '';

  if (weather.temperature < 23) {
    careAdvice += '🌡️ Temperature low - Keep caterpillars warm. ';
  } else if (weather.temperature > 28) {
    careAdvice += '🌡️ Temperature high - Ensure proper ventilation. ';
  }

  if (weather.humidity < 70) {
    careAdvice += '💧 Low humidity - Spray water to increase moisture. ';
  } else if (weather.humidity > 85) {
    careAdvice += '💧 High humidity - Improve ventilation to prevent disease. ';
  }

  if (!careAdvice) {
    careAdvice = '✅ Weather conditions optimal for silk caterpillars!';
  }

  return {
    title: `${emoji} Weather Update - ${weather.locationName}`,
    body: `${weather.temperature}°C, ${weather.humidity}% humidity\n${careAdvice.trim()}`,
    data: {
      type: 'weather_update',
      temperature: weather.temperature,
      humidity: weather.humidity,
      windSpeed: weather.windSpeed,
    },
    sound: true,
    priority: Notifications.AndroidNotificationPriority.DEFAULT,
  };
}

// Schedule repeating weather notifications (Expo Go compatible)
export async function registerWeatherNotificationTask(): Promise<boolean> {
  try {
    // Cancel any existing notification
    const existingId = await AsyncStorage.getItem(WEATHER_NOTIFICATION_ID);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    }

    // Schedule repeating notification every 2 hours
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🌤️ Weather Check',
        body: 'Checking weather conditions for your silk farm...',
        data: { type: 'weather_check' },
      },
      trigger: {
        seconds: 2 * 60 * 60, // 2 hours
        repeats: true,
      },
    });

    // Store notification ID
    await AsyncStorage.setItem(WEATHER_NOTIFICATION_ID, notificationId);

    console.log('✅ Weather notifications scheduled (repeating every 2 hours)');
    return true;
  } catch (error) {
    console.error('❌ Failed to schedule weather notifications:', error);
    return false;
  }
}

// Cancel scheduled weather notifications
export async function unregisterWeatherNotificationTask(): Promise<boolean> {
  try {
    const existingId = await AsyncStorage.getItem(WEATHER_NOTIFICATION_ID);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem(WEATHER_NOTIFICATION_ID);
    }
    console.log('✅ Weather notifications cancelled');
    return true;
  } catch (error) {
    console.error('❌ Failed to cancel weather notifications:', error);
    return false;
  }
}

// Enable weather notifications
export async function enableWeatherNotifications(): Promise<boolean> {
  try {
    await AsyncStorage.setItem(WEATHER_ENABLED_KEY, 'true');
    await registerWeatherNotificationTask();
    console.log('✅ Weather notifications enabled');
    return true;
  } catch (error) {
    console.error('❌ Failed to enable weather notifications:', error);
    return false;
  }
}

// Disable weather notifications
export async function disableWeatherNotifications(): Promise<boolean> {
  try {
    await AsyncStorage.setItem(WEATHER_ENABLED_KEY, 'false');
    await unregisterWeatherNotificationTask();
    console.log('✅ Weather notifications disabled');
    return true;
  } catch (error) {
    console.error('❌ Failed to disable weather notifications:', error);
    return false;
  }
}

// Check if weather notifications are enabled
export async function areWeatherNotificationsEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(WEATHER_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    return false;
  }
}

// Trigger weather notification manually (for testing)
export async function triggerWeatherNotificationNow(): Promise<boolean> {
  try {
    console.log('🧪 Triggering weather notification manually...');

    // Check if notifications are enabled
    const enabled = await AsyncStorage.getItem(WEATHER_ENABLED_KEY);
    if (enabled !== 'true') {
      console.log('❌ Weather notifications disabled');
      Alert.alert('Error', 'Weather notifications are disabled. Please enable them first.');
      return false;
    }

    // Get location permission
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('❌ No location permission');
      Alert.alert('Error', 'Location permission required');
      return false;
    }

    // Get current location
    console.log('📍 Getting location...');
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    // Fetch comprehensive weather data
    console.log('🌤️ Fetching weather data...');
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.coords.latitude}&longitude=${location.coords.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,precipitation,rain,showers,surface_pressure,cloud_cover,visibility,dew_point_2m,apparent_temperature,soil_temperature_0cm,soil_temperature_6cm,is_day,uv_index&timezone=auto`
    );

    const data = await response.json();

    // Get location name
    const locationData = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const locationName = locationData[0]
      ? `${locationData[0].city || locationData[0].district || ''}, ${locationData[0].region || ''}`
      : 'Your Location';

    const weather: WeatherData = {
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

    // Generate notification content
    console.log('📬 Generating notification...', weather);
    const notificationContent = generateWeatherNotification(weather);

    // Send local notification immediately
    await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: null, // Send immediately
    });

    // Save weather data
    await AsyncStorage.setItem(LAST_WEATHER_KEY, JSON.stringify(weather));

    console.log('✅ Test notification sent successfully!');
    Alert.alert('Success', 'Weather notification sent! Check your notification panel.');
    return true;
  } catch (error) {
    console.error('❌ Failed to trigger weather notification:', error);
    Alert.alert('Error', `Failed to send notification: ${error.message}`);
    return false;
  }
}
