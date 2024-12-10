import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Easing } from 'react-native';

const AnimatedWeatherIcon = ({ condition, size = 80, style }) => {
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const getWeatherIcon = (condition) => {
    const iconMap = {
      'Clear': require('../assets/icons/sunny.png'),
      'Sunny': require('../assets/icons/sunny.png'),
      'Clouds': require('../assets/icons/cloudy.png'),
      'Rain': require('../assets/icons/rainy.png'),
      'Snow': require('../assets/icons/snow.png'),
      'Thunderstorm': require('../assets/icons/thunderstorm.png'),
      'Clear-night': require('../assets/icons/clear-night.png'),
      'default': require('../assets/icons/default.png')
    };
    return iconMap[condition] || iconMap['default'];
  };

  const createAnimation = (type) => {
    switch (type) {
      case 'Clear':
      case 'Sunny':
        return Animated.loop(
          Animated.timing(rotation, {
            toValue: 1,
            duration: 8000,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        );

      case 'Rain':
        return Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: 10,
              duration: 1000,
              easing: Easing.linear,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 0,
              duration: 1000,
              easing: Easing.linear,
              useNativeDriver: true,
            })
          ])
        );

      case 'Clouds':
        return Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -5,
              duration: 2000,
              easing: Easing.sine,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 5,
              duration: 2000,
              easing: Easing.sine,
              useNativeDriver: true,
            })
          ])
        );

      case 'Snow':
        return Animated.loop(
          Animated.parallel([
            Animated.sequence([
              Animated.timing(scale, {
                toValue: 1.2,
                duration: 1500,
                easing: Easing.sine,
                useNativeDriver: true,
              }),
              Animated.timing(scale, {
                toValue: 1,
                duration: 1500,
                easing: Easing.sine,
                useNativeDriver: true,
              })
            ]),
            Animated.sequence([
              Animated.timing(translateY, {
                toValue: 5,
                duration: 1500,
                easing: Easing.sine,
                useNativeDriver: true,
              }),
              Animated.timing(translateY, {
                toValue: -5,
                duration: 1500,
                easing: Easing.sine,
                useNativeDriver: true,
              })
            ])
          ])
        );

      case 'Thunderstorm':
        return Animated.loop(
          Animated.sequence([
            Animated.timing(fadeAnim, {
              toValue: 0.4,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.delay(2000)
          ])
        );

      default:
        return Animated.loop(
          Animated.sequence([
            Animated.timing(translateY, {
              toValue: -3,
              duration: 2000,
              easing: Easing.sine,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: 3,
              duration: 2000,
              easing: Easing.sine,
              useNativeDriver: true,
            })
          ])
        );
    }
  };

  useEffect(() => {
    const animation = createAnimation(condition);
    animation.start();

    return () => {
      animation.stop();
    };
  }, [condition]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.Image
        source={getWeatherIcon(condition)}
        style={[
          styles.icon,
          { width: size, height: size },
          {
            transform: [
              { translateY },
              { scale },
              { rotate: spin }
            ],
            opacity: fadeAnim,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    resizeMode: 'contain',
  },
});

export default AnimatedWeatherIcon;