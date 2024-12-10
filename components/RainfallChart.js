import React from 'react';
import { View, Text, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

const RainfallChart = ({ forecastData }) => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const themeColors = {
    background: isDarkMode ? '#1f1f1f' : '#fff',
    text: isDarkMode ? '#fff' : '#000',
    primary: '#2196F3',
    shadow: isDarkMode ? '#ffffff40' : '#00000040',
  };

  if (!forecastData || !Array.isArray(forecastData) || forecastData.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>
          Không có dữ liệu lượng mưa
        </Text>
      </View>
    );
  }

  const chartData = {
    labels: forecastData.map(day => 
      new Date(day.dt * 1000).toLocaleDateString('vi-VN', { weekday: 'short' })
    ),
    datasets: [{
      data: forecastData.map(day => 
        day.rain ? (day.rain['3h'] || 0) : 0
      )
    }]
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: themeColors.background,
        shadowColor: themeColors.shadow 
      }
    ]}>      
      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 62} 
        height={220}
        chartConfig={{
          backgroundColor: themeColors.background,
          backgroundGradientFrom: themeColors.background,
          backgroundGradientTo: themeColors.background,
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          labelColor: (opacity = 1) => isDarkMode 
            ? `rgba(255, 255, 255, ${opacity})`
            : `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: themeColors.primary
          },
          propsForLabels: {
            fontSize: 10
          }
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16
        }}
        yAxisLabel=""
        yAxisSuffix=" mm"
        fromZero
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    padding: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }, 
});

export default RainfallChart;