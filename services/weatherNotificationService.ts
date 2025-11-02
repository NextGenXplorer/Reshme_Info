import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WEATHER_TASK_NAME = 'WEATHER_NOTIFICATION_TASK';
const LAST_WEATHER_KEY = 'last_weather_notification';
const WEATHER_ENABLED_KEY = 'weather_notifications_enabled';

interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  locationName: string;
}

// Define the background task
TaskManager.defineTask(WEATHER_TASK_NAME, async () => {
  try {
    console.log('⏰ Running weather notification task');

    // Check if notifications are enabled
    const enabled = await AsyncStorage.getItem(WEATHER_ENABLED_KEY);
    if (enabled !== 'true') {
      console.log('❌ Weather notifications disabled');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Get location permission
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('❌ No location permission');
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }

    // Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    // Fetch weather data
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.coords.latitude}&longitude=${location.coords.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
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

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('❌ Weather task error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

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

// Register background task
export async function registerWeatherNotificationTask(): Promise<boolean> {
  try {
    // Check if already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(WEATHER_TASK_NAME);

    if (isRegistered) {
      console.log('✅ Weather task already registered');
      return true;
    }

    // Register background fetch task - every 2 hours
    await BackgroundFetch.registerTaskAsync(WEATHER_TASK_NAME, {
      minimumInterval: 2 * 60 * 60, // 2 hours in seconds
      stopOnTerminate: false, // Continue after app is closed
      startOnBoot: true, // Start when device boots
    });

    console.log('✅ Weather notification task registered');
    return true;
  } catch (error) {
    console.error('❌ Failed to register weather task:', error);
    return false;
  }
}

// Unregister background task
export async function unregisterWeatherNotificationTask(): Promise<boolean> {
  try {
    await BackgroundFetch.unregisterTaskAsync(WEATHER_TASK_NAME);
    console.log('✅ Weather notification task unregistered');
    return true;
  } catch (error) {
    console.error('❌ Failed to unregister weather task:', error);
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
    const result = await TaskManager.getTaskOptionsAsync(WEATHER_TASK_NAME);
    if (result) {
      // Execute the task manually
      await BackgroundFetch.setMinimumIntervalAsync(15 * 60); // 15 minutes for testing
      console.log('✅ Weather notification triggered manually');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Failed to trigger weather notification:', error);
    return false;
  }
}
