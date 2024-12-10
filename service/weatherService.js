import axios from 'axios';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';


const OPENWEATHER_API_KEY = 'c25a2c1515c1c72e695981dbc07d62fa';

export const getCurrentLocation = async () => {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Permission to access location was denied');
      return 'London'; 
    }

    let location = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = location.coords;
    
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&exclude=daily,minutely&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
    
    return response.data.name;
  } catch (error) {
    console.error('Lỗi lấy vị trí:', error);
    return 'London'; 
  }
};

export const fetchWeatherData = async (cityName, forceUpdate = false) => {
  try {
      const offlineData = await AsyncStorage.getItem('weatherData');
    const parsedOfflineData = offlineData ? JSON.parse(offlineData) : null;

    if (!forceUpdate && parsedOfflineData && parsedOfflineData.current.name === cityName) {
      return parsedOfflineData;
    }  
    const currentResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
      
    const forecastResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${OPENWEATHER_API_KEY}&units=metric`
    );
   
   
    


    const processedData = {         
      forecast: forecastResponse.data.list.filter((reading) => 
        reading.dt_txt.includes('12:00:00')
      ).slice(0, 7),
    
      current: {
        ...currentResponse.data,
        temp: Math.round(currentResponse.data.main.temp),     
      }   
    };
  

    const weatherData = await fetchWeatherData(location);
   
    await AsyncStorage.setItem('weatherData', JSON.stringify(processedData));

    await sendWeatherNotifications(processedData.current);

    return processedData;


  } catch (error) {
    console.error('Lỗi tải dữ liệu:', error);
    throw error;
  }
};

const sendWeatherNotifications = async (weatherData) => {
  try {
    const notifications = [];

    if (weatherData.main.temp > 35) {
      notifications.push({
        title: "Cảnh báo nhiệt độ cao 🌡️",
        body: "Nhiệt độ rất cao, hãy chú ý bảo vệ sức khỏe!",
      });
    }

    if (weatherData.weather[0].main === 'Rain') {
      notifications.push({
        title: "Dự báo mưa 🌧️",
        body: "Hôm nay có mưa, đừng quên mang theo ô!",
      });
    }

    if (weatherData.wind.speed > 4) {
      notifications.push({
        title: "Cảnh báo gió mạnh 💨",
        body: `Tốc độ gió: ${weatherData.wind.speed} m/s. Hạn chế ra ngoài!`,
      });
    }

    for (const notification of notifications) {
      await Notifications.scheduleNotificationAsync({
        content: notification,
        trigger: null,
      });
    }
  } catch (error) {
    console.error('Lỗi gửi thông báo:', error);
  }
};

export const saveToFavorites = async (cityName) => {
  try {
    const favorites = await AsyncStorage.getItem('favoriteCities');
    const favoritesArray = favorites ? JSON.parse(favorites) : [];
    
    if (!favoritesArray.includes(cityName)) {
      favoritesArray.push(cityName);
      await AsyncStorage.setItem('favoriteCities', JSON.stringify(favoritesArray));
    }
  } catch (error) {
    console.error('Lỗi lưu thành phố yêu thích:', error);
  }
};

export const getFavorites = async () => {
  try {
    const favorites = await AsyncStorage.getItem('favoriteCities');
    return favorites ? JSON.parse(favorites) : [];
  } catch (error) {
    console.error('Lỗi lấy danh sách yêu thích:', error);
    return [];
  }
};