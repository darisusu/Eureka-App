import { useEffect } from "react";
import { View } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";

export default function StaffScreen() {
  useEffect(() => {
    const lockLandscape = async () => {
      try {
        await ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE
        );
      } catch {
        // Ignore orientation lock failures (e.g., unsupported platform).
      }
    };

    lockLandscape();

    return () => {
      ScreenOrientation.unlockAsync().catch(() => {
        // Ignore unlock failures.
      });
    };
  }, []);

  return <View className="flex-1 bg-white" />;
}
