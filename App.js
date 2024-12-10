import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Appearance,
  PermissionsAndroid,
  Platform,
  RefreshControl, 
  useColorScheme,  
  StatusBar,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AnimatedWeatherIcon from './components/AnimatedWeatherIcon';
import RainfallChart from './components/RainfallChart';

const OPENWEATHER_API_KEY = 'c25a2c1515c1c72e695981dbc07d62fa'; // EnkeyApi OpenWeather

const themes = {
  light: {
    background: '#f0f0f0',
    card: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    border: '#e0e0e0',
    searchInput: '#ffffff',
    searchButton: '#007AFF',
    weatherCard: '#ffffff',
    weatherItemBg: '#f9f9f9',
  },
  dark: {
    background: '#1a1a1a',
    card: '#2a2a2a',
    text: '#ffffff',
    textSecondary: '#cccccc',
    border: '#404040',
    searchInput: '#333333',
    searchButton: '#0A84FF',
    weatherCard: '#2a2a2a',
    weatherItemBg: '#333333',
  }
};


Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotificationsAsync() {
  let token;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('weather', {
      name: 'Weather Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Constants.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Không thể gửi thông báo vì chưa được cấp quyền!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
  }

  return token;
}

const WeatherApp = () => {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [city, setCity] = useState('London');
  const [loading, setLoading] = useState(true);
  const [offlineData, setOfflineData] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef();
  const responseListener = useRef();
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const systemColorScheme = useColorScheme();
  const [currentTheme, setCurrentTheme] = useState(themes[systemColorScheme || 'light']);
  

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchWeatherData(city).then(() => {
      setRefreshing(false);
    });
  }, [city]);

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {   
      console.log(notification);     
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {   
      console.log(response);
    
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);


  const sendWeatherNotification = async (weatherData) => {
    if (!weatherData) return;
  
    const warnings = [];
try{
 
    if (weatherData.main.temp > 27) {
      warnings.push("Nhiệt độ rất cao, hãy chú ý bảo vệ sức khỏe!");
    }
    if (weatherData.weather[0].main === 'Rain') {
      warnings.push("Hôm nay có mưa, đừng quên mang theo ô!");
    }
    if (weatherData.wind.speed > 1) {
      warnings.push(`Tốc độ gió: ${weatherData.wind.speed} m/s. Hạn chế ra ngoài!`);
    }

    // Only send notification if there are warnings
    if (warnings.length > 0) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⚠️ Cảnh báo thời tiết",
          body: `${weatherData.name}: ${warnings[0]}${warnings.length > 1 }`,
        },
        trigger: null,
      });
    }
  } catch (error) {
    console.error('Lỗi gửi thông báo:', error);
  }
};


useEffect(() => {
  const subscription = Appearance.addChangeListener(({ colorScheme }) => {
    setCurrentTheme(themes[colorScheme || 'light']);
  });

  return () => subscription.remove();
}, []);

useEffect(() => {
  setCurrentTheme(themes[systemColorScheme || 'light']);
}, [systemColorScheme]);

  const saveOfflineData = async (data) => {
    try {
      await AsyncStorage.setItem('weatherData', JSON.stringify(data));
    } catch (error) {
      console.error('Lỗi lưu dữ liệu ngoại tuyến:', error);
    }
  };

  // Tải dữ liệu ngoại tuyến
  const loadOfflineData = async () => {
    try {
      const savedData = await AsyncStorage.getItem('weatherData');
      if (savedData) {
        setOfflineData(JSON.parse(savedData));
      }
    } catch (error) {
      console.error('Lỗi tải dữ liệu ngoại tuyến:', error);
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return true;
        } else {
          return false;
        }
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const getCurrentLocation = async () => {
    const hasPermission = await requestLocationPermission();
    if (hasPermission) {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Permission to access location was denied');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;
        
        // Fetch weather by coordinates
        const response = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${OPENWEATHER_API_KEY}&units=metric`
        );
        
        setCity(response.data.name);
      } catch (error) {
        console.log('Lỗi lấy vị trí:', error);
      }
    }
  };

 // Thông báo thời tiết
 const scheduleWeatherNotification = async (weatherData) => {
  
  // Kiểm tra điều kiện thời tiết
  if (weatherData.main.temp > 35) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Cảnh báo thời tiết 🌡️",
        body: "Nhiệt độ rất cao, hãy chú ý bảo vệ sức khỏe!",
      },
      trigger: null, // Ngay lập tức
    });
  }

  if (weatherData.weather[0].main === 'Rain') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Dự báo mưa 🌧️",
        body: "Hôm nay có mưa, đừng quên mang theo ô!",
      },
      trigger: null,
    });
  }
};


  // Hàm fetch dữ liệu thời tiết
  const fetchWeatherData = async (cityName, forceUpdate = false) => {
    if (!forceUpdate && offlineData && offlineData.current.name === cityName) {
      setWeather(offlineData.current);
      setForecast(offlineData.forecast);
      return;
    }
    try{
      setLoading(true);
      const currentResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );

      const forecastResponse = await axios.get(
        `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${OPENWEATHER_API_KEY}&units=metric`
      );
    const hourlyData = forecastResponse.data.list
    .slice(0, 7) 
    .map(hourData => ({
      time: new Date(hourData.dt * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      temp: Math.round(hourData.main.temp),   
      icon: getWeatherIcon(hourData.weather[0].main)
    }));
    setHourlyForecast(hourlyData);
      const dailyForecast = forecastResponse.data.list.filter((reading) => 
        reading.dt_txt.includes('12:00:00')
      ).slice(0, 9);

      setWeather({
          ...currentResponse.data,
          maxTemp: Math.round(currentResponse.data.main.temp_max),
          minTemp: Math.round(currentResponse.data.main.temp_min),
        });
      setForecast(dailyForecast);
      

      await saveOfflineData({
        current: currentResponse.data,
        forecast: dailyForecast
      });

      await sendWeatherNotification(currentResponse.data);
      
      setLoading(false);
    } catch (error) {
      console.log('Lỗi tải dữ liệu:', error);     
      if (offlineData) {
        setWeather(offlineData.current);
        setForecast(offlineData.forecast);
      }
      
      setLoading(false);
    }
  };

  // Khởi tạo
  useEffect(() => {
    loadOfflineData();
    getCurrentLocation();
  }, []);

  // Theo dõi thay đổi thành phố
  useEffect(() => {
    fetchWeatherData(city);
  }, [city]);

 
  // Hàm xác định icon thời tiết
  const getWeatherIcon = (condition) => {
    const iconMap = {
    'Clear': require('./assets/icons/sunny.png'),
    'Sunny': require('./assets/icons/sunny.png'),

    // Các loại mây
    'Clouds': require('./assets/icons/cloudy.png'),
    'Few clouds': require('./assets/icons/partly-cloudy.png'), 
    'Overcast clouds': require('./assets/icons/overcast.png'),

    // Các loại mưa
    'Rain': require('./assets/icons/rainy.png'),
    'Light rain': require('./assets/icons/light-rain.png'),
    'Moderate rain': require('./assets/icons/moderate-rain.png'),
    'Heavy rain': require('./assets/icons/heavy-rain.png'),


    // Giông bão
    'Thunderstorm': require('./assets/icons/thunderstorm.png'),
    'Thunderstorm with light rain': require('./assets/icons/thunderstorm-rain.png'),

    // Tuyết
    'Snow': require('./assets/icons/snow.png'),

    // Sương mù và các hiện tượng khác
    'Mist': require('./assets/icons/mist.png'),
    'Fog': require('./assets/icons/fog.png'),
    'Tornado': require('./assets/icons/tornado.png'),

    // Thời tiết ban đêm
    'Clear-night': require('./assets/icons/clear-night.png'),
    'Partly-cloudy-night': require('./assets/icons/partly-cloudy-night.png'),
      'default': require('./assets/icons/default.png')
    };
    const isNight = () => {
      const hour = new Date().getHours();
      return hour >= 18 || hour < 5;
    };
  

    if (isNight()) {
      if (condition === 'Clear') {
        return iconMap['Clear-night'];
      }
      if (condition === 'Few clouds') {
        return iconMap['Partly-cloudy-night'];
      }
    }
  

    return iconMap[condition] || iconMap['default'];
  };

 
  const handleSearch = () => {
    if (searchText.trim()) {      
      const normalizedCity = removeVietnameseAccents(searchText.trim());
      setCity(normalizedCity); 
      fetchWeatherData(normalizedCity); 
  } else {
      alert('Vui lòng nhập tên thành phố. Ví Dụ : Ha Noi');
  }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: currentTheme.background,
      paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10,
    },
    searchContainer: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    searchInput: {
      flex: 1,
      backgroundColor: currentTheme.searchInput,
      color: currentTheme.text,
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 10,
      marginRight: 10,
      elevation: 2,
    },
    searchButton: {
      backgroundColor: currentTheme.searchButton,
      paddingVertical: 10,
      paddingHorizontal: 15,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 2,
    },
    searchButtonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    weatherCard: {
      marginHorizontal: 20,     
    },
    cityName: {
      fontSize: 22,
      fontWeight: 'bold',
      color: currentTheme.text,
      marginBottom: 10,
    },
    temperature: {
      fontSize: 48,
      fontWeight: 'bold',
      color: currentTheme.text,
    },
    description: {
      fontSize: 16,
      color: currentTheme.textSecondary,
      textTransform: 'capitalize',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: currentTheme.text,
      marginBottom: 10,
    },
    dailyForecastItem: {
      alignItems: 'center',
      marginRight: 15,
      backgroundColor: currentTheme.weatherItemBg,
      padding: 10,
      borderRadius: 10,
    },
    dailyForecastDay: {
      fontSize: 14,
      color: currentTheme.textSecondary,
      marginBottom: 5,
    },
    dailyForecastTemp: {
      fontSize: 16,
      fontWeight: 'bold',
      color: currentTheme.text,
    },
    hourlyForecastItem: {
      alignItems: 'center',
      marginRight: 15,
      backgroundColor: currentTheme.weatherItemBg,
      padding: 10,
      borderRadius: 10,
    },
    hourlyTime: {
      fontSize: 14,
      color: currentTheme.textSecondary,
      marginBottom: 5,
    },
    hourlyTemp: {
      fontSize: 16,
      fontWeight: 'bold',
      color: currentTheme.text,
    },
    detailGridItem: {
      width: '48%',
      backgroundColor: currentTheme.weatherItemBg,
      padding: 15,
      borderRadius: 10,
      marginVertical: 10,
      alignItems: 'center',
    },
    detailLabel: {
      fontSize: 14,
      color: currentTheme.textSecondary,
      marginBottom: 5,
    },
    detailValue: {
      fontSize: 16,
      fontWeight: 'bold',
      color: currentTheme.text,
    },
    minMaxTemp: {
      fontSize: 16,
      color: currentTheme.textSecondary,
      marginTop: 5,
    },
  });

  const removeVietnameseAccents = (str) => {
    // Bỏ tiền tố nếu cần
    str = str.replace(/^(Thành phố|Tỉnh|Thị xã|Quận|Huyện|Phường|Xã)\s+/i, '');
    
    // Loại bỏ dấu tiếng Việt
    const accentsMap = {
        a: "áàảãạâấầẩẫậăắằẳẵặ",
        A: "ÁÀẢÃẠÂẤẦẨẪẬĂẮẰẲẴẶ",
        e: "éèẻẽẹêếềểễệ",
        E: "ÉÈẺẼẸÊẾỀỂỄỆ",
        i: "íìỉĩị",
        I: "ÍÌỈĨỊ",
        o: "óòỏõọôốồổỗộơớờởỡợ",
        O: "ÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ",
        u: "úùủũụưứừửữự",
        U: "ÚÙỦŨỤƯỨỪỬỮỰ",
        y: "ýỳỷỹỵ",
        Y: "ÝỲỶỸỴ",
        d: "đ",
        D: "Đ"
    };
    for (let key in accentsMap) {
        const accents = accentsMap[key];
        for (let char of accents) {
            str = str.replace(new RegExp(char, 'g'), key);
        }
    }

    // Loại bỏ khoảng trắng thừa
    str = str.trim().replace(/\s+/g, ' ');
    
    return str;
};

  if (loading) {
    return (
      <View style={styles.container}>
      <Text>Đang tải...</Text>
    </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <StatusBar
        barStyle={systemColorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={currentTheme.background}
      />
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={systemColorScheme === 'dark' ? '#FFFFFF' : '#000000'}
            colors={[currentTheme.searchButton]}
            progressBackgroundColor={currentTheme.card}
          />
        }
      >
        <View style={styles.searchContainer}>
          <TextInput
            style={dynamicStyles.searchInput}
            placeholder="Nhập tên thành phố"
            placeholderTextColor={themes.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity 
            style={dynamicStyles.searchButton}
            onPress={handleSearch}
          >
            <Text style={[styles.searchButtonText, { color: '#FFFFFF' }]}>
              Tìm kiếm
            </Text>
          </TouchableOpacity>
        </View>

        {weather && (
          <View style={dynamicStyles.weatherCard}>
            <View style={styles.mainWeatherInfo}>
              <Text style={dynamicStyles.cityName}>
                {weather.name}, {weather.sys.country}
              </Text>
              <View style={styles.temperatureContainer}>
              <AnimatedWeatherIcon 
                  condition={weather.weather[0].main}
                  size={80}
                  style={styles.weatherIcon}
                />
                <Text style={dynamicStyles.temperature}>
                  {Math.round(weather.main.temp)}°C
                </Text>
              </View>
              <Text style={dynamicStyles.minMaxTemp}>
                (Cao nhất: {Math.round(weather.main.temp_max)}°C, 
                Thấp nhất: {Math.round(weather.main.temp_min)}°C)
              </Text>
              <Text style={dynamicStyles.description}>
                {weather.weather[0].description}
              </Text>
            </View>

            <View style={styles.sectionContainer}>
              <Text style={dynamicStyles.sectionTitle}>Dự Báo Theo Giờ</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.hourlyForecastScroll}
              >
                {hourlyForecast.map((hour, index) => (
                  <View key={index} style={dynamicStyles.hourlyForecastItem}>
                    <Text style={dynamicStyles.hourlyTime}>{hour.time}</Text>
                    <Image 
                      source={hour.icon} 
                      style={styles.hourlyIcon} 
                    />
                    <Text style={dynamicStyles.hourlyTemp}>{hour.temp}°C</Text>
                  </View>
                ))}
              </ScrollView>
            </View>

      
            <View style={styles.sectionContainer}>
              <Text style={dynamicStyles.sectionTitle}>Dự Báo Theo Ngày</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.dailyForecastContainer}
              >
                {forecast.map((day, index) => (
                  <View key={index} style={dynamicStyles.dailyForecastItem}>
                    <Text style={dynamicStyles.dailyForecastDay}>
                      {new Date(day.dt * 1000).toLocaleDateString('vi-VN', { weekday: 'short' })}
                    </Text>
                    <Image
                      source={getWeatherIcon(day.weather[0].main)}
                      style={styles.dailyForecastIcon}
                    />
                    <Text style={dynamicStyles.dailyForecastTemp}>
                      {Math.round(day.main.temp)}°C 
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* Chi tiết thời tiết */}
            <View style={styles.sectionContainer}>
              <Text style={dynamicStyles.sectionTitle}>Chi Tiết Thời Tiết</Text>
              <View style={styles.detailsGrid}>
                <View style={dynamicStyles.detailGridItem}>
                  <Text style={dynamicStyles.detailLabel}>Độ Ẩm</Text>
                  <Text style={dynamicStyles.detailValue}>{weather.main.humidity}%</Text>
                </View>
                <View style={dynamicStyles.detailGridItem}>
                  <Text style={dynamicStyles.detailLabel}>Áp Suất</Text>
                  <Text style={dynamicStyles.detailValue}>{weather.main.pressure} hPa</Text>
                </View>
                <View style={dynamicStyles.detailGridItem}>
                  <Text style={dynamicStyles.detailLabel}>Tầm Nhìn</Text>
                  <Text style={dynamicStyles.detailValue}>
                    {(weather.visibility / 1000).toFixed(1)} km
                  </Text>
                </View>
                <View style={dynamicStyles.detailGridItem}>
                  <Text style={dynamicStyles.detailLabel}>Tốc Độ Gió</Text>
                  <Text style={dynamicStyles.detailValue}>{weather.wind.speed} m/s</Text>
                </View>
              </View>
            </View>
            <View style={styles.sectionContainer}>
              <Text style={dynamicStyles.sectionTitle}>Biểu Đồ Lượng Mưa</Text>
              <RainfallChart forecastData={forecast} />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchButtonText: {
    fontWeight: 'bold',
    
  },
  temperatureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  mainWeatherInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  weatherIcon: {
    width: 80,
    height: 80,
    marginRight: 15,
  },
  sectionContainer: {
    marginTop: 20,
  },
  hourlyForecastScroll: {
    paddingRight: 20,
  },
  dailyForecastContainer: {
    marginTop: 10,
  },
  dailyForecastIcon: {
    width: 50,
    height: 50,
    marginBottom: 5,
  },
  hourlyIcon: {
    width: 50,
    height: 50,
    marginBottom: 5,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});


export default WeatherApp;

// import React from 'react';
// import { StatusBar } from 'react-native';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import Router from './navigation/Router';
// import { ThemeProvider } from './context/ThemeContext';
// import { NotificationProvider } from './context/NotificationContext';

// const App = () => {
//   return (
//     <SafeAreaProvider>
//       <ThemeProvider>
//         <NotificationProvider>
//           <StatusBar 
//             barStyle="dark-content" 
//             backgroundColor="#f0f0f0" 
//           />
//           <Router />
//         </NotificationProvider>
//       </ThemeProvider>
//     </SafeAreaProvider>
//   );
// };

// export default App;