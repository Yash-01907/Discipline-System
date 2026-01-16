import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface Props {
  visible: boolean;
  onAnimationEnd?: () => void;
}

const FireAnimation: React.FC<Props> = ({ visible, onAnimationEnd }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      translateYAnim.setValue(0);

      // Run animation sequence
      Animated.sequence([
        // Pop in
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1.5,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ]),
        // Float up and fade out
        Animated.parallel([
          Animated.timing(translateYAnim, {
            toValue: -60,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 2,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (onAnimationEnd) {
          onAnimationEnd();
        }
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.Text
        style={[
          styles.emoji,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
          },
        ]}
      >
        🔥
      </Animated.Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  emoji: {
    fontSize: 48,
  },
});

export default FireAnimation;
