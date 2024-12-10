export const getWeatherIcon = (condition) => {
    const isNight = () => {
      const hour = new Date().getHours();
      return hour >= 18 || hour < 5;
    };
  
    const iconMap = {
      'Clear': require('../assets/icons/sunny.png'),
      'Sunny': require('../assets/icons/sunny.png'),
      'Clouds': require('../assets/icons/cloudy.png'),
      'Few clouds': require('../assets/icons/partly-cloudy.png'), 
      'Overcast clouds': require('../assets/icons/overcast.png'),
      'Rain': require('../assets/icons/rainy.png'),
      'Light rain': require('../assets/icons/light-rain.png'),
      'Moderate rain': require('../assets/icons/moderate-rain.png'),
      'Heavy rain': require('../assets/icons/heavy-rain.png'),
      'Thunderstorm': require('../assets/icons/thunderstorm.png'),
      'Thunderstorm with light rain': require('../assets/icons/thunderstorm-rain.png'),
      'Snow': require('../assets/icons/snow.png'),
      'Mist': require('../assets/icons/mist.png'),
      'Fog': require('../assets/icons/fog.png'),
      'Tornado': require('../assets/icons/tornado.png'),
      'Clear-night': require('../assets/icons/clear-night.png'),
      'Partly-cloudy-night': require('../assets/icons/partly-cloudy-night.png'),
      'default': require('../assets/icons/default.png')
    };
  
    if (isNight()) {
      if (condition === 'Clear') return iconMap['Clear-night'];
      if (condition === 'Few clouds') return iconMap['Partly-cloudy-night'];
    }
  
    return iconMap[condition] || iconMap['default'];
  };