import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface SwipeableScreenProps {
  children: React.ReactNode;
  currentIndex: number;
  screens: string[];
}

const SwipeableScreen: React.FC<SwipeableScreenProps> = ({ children, currentIndex, screens }) => {
  const navigation = useNavigation();
  const scrollEnabled = useRef(true);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes (more horizontal than vertical)
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 20;
      },
      onPanResponderMove: (_, gestureState) => {
        // Optional: Add visual feedback here if needed
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dx, vx } = gestureState;
        const swipeThreshold = 50; // Minimum swipe distance
        const velocityThreshold = 0.3; // Minimum swipe velocity

        // Swipe right-to-left (next screen)
        if ((dx < -swipeThreshold || vx < -velocityThreshold) && currentIndex < screens.length - 1) {
          const nextScreen = screens[currentIndex + 1];
          navigation.navigate(nextScreen as never);
        }

        // Swipe left-to-right (previous screen)
        else if ((dx > swipeThreshold || vx > velocityThreshold) && currentIndex > 0) {
          const previousScreen = screens[currentIndex - 1];
          navigation.navigate(previousScreen as never);
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default SwipeableScreen;
