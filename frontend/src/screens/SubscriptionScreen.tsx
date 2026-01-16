import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import Purchases, { PurchasesPackage } from "react-native-purchases";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";

// Placeholder API Keys - You would replace these with your actual RevenueCat keys
const API_KEYS = {
  apple: "appl_your_revenuecat_api_key",
  google: "goog_your_revenuecat_api_key",
};

const SubscriptionScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        if (Platform.OS === "ios") {
          Purchases.configure({ apiKey: API_KEYS.apple });
        } else if (Platform.OS === "android") {
          Purchases.configure({ apiKey: API_KEYS.google });
        }

        // Identify the user in RevenueCat with our DB ID
        if (user?._id) {
          await Purchases.logIn(user._id);
        }

        // Fetch Offerings
        const offerings = await Purchases.getOfferings();
        if (
          offerings.current !== null &&
          offerings.current.availablePackages.length !== 0
        ) {
          setPackages(offerings.current.availablePackages);
        }
      } catch (e: any) {
        // For development/mock purposes if no keys are set, we might fail here
        console.log("RevenueCat Error:", e);
        // Alert.alert("Error", "Failed to fetch offerings");
      } finally {
        setLoading(false);
      }
    };

    initRevenueCat();
  }, [user]);

  const onPurchase = async (pack: PurchasesPackage) => {
    setIsPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pack);
      if (
        typeof customerInfo.entitlements.active["pro"] !== "undefined" // Replace 'pro' with your Entitlement ID
      ) {
        Alert.alert(
          "Success",
          "Welcome to Pro! You can now verify unlimited habits.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (e: any) {
      if (!e.userCancelled) {
        Alert.alert("Error", e.message);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const onRestore = async () => {
    setIsPurchasing(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      if (typeof customerInfo.entitlements.active["pro"] !== "undefined") {
        Alert.alert("Restore Successful", "Your Pro plan has been restored.");
      } else {
        Alert.alert("Restore Failed", "No active Pro subscription found.");
      }
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  // Mock package if none found (for display purposes without real IAP config)
  const displayPackages =
    packages.length > 0
      ? packages
      : [
          {
            identifier: "pro_monthly",
            product: {
              priceString: "$4.99",
              title: "Pro Monthly",
              description: "Unlimited Verifications",
            },
          } as any,
        ];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Upgrade to PRO 🚀</Text>
          <Text style={styles.subtitle}>Unlock your full potential</Text>
        </View>

        <View style={styles.benefitsContainer}>
          <BenefitItem icon="⚡" text="Unlimited AI Verifications" />
          <BenefitItem icon="🌒" text="Dark Mode Access" />
          <BenefitItem icon="📈" text="Advanced Statistics" />
          <BenefitItem icon="🏆" text="Exclusive Badges" />
        </View>

        <View style={styles.plansContainer}>
          {displayPackages.map((pack, index) => (
            <TouchableOpacity
              key={index}
              style={styles.planCard}
              onPress={() => onPurchase(pack)}
              disabled={isPurchasing}
            >
              <View>
                <Text style={styles.planTitle}>
                  {pack.product.title || "Monthly Plan"}
                </Text>
                <Text style={styles.planDesc}>
                  {pack.product.description || "Auto-renews monthly"}
                </Text>
              </View>
              <Text style={styles.planPrice}>
                {pack.product.priceString || "$4.99"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.restoreBtn} onPress={onRestore}>
          <Text style={styles.restoreText}>Restore Purchases</Text>
        </TouchableOpacity>

        {isPurchasing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.loadingText}>Processing...</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.closeButtonText}>Maybe Later</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const BenefitItem = ({ icon, text }: { icon: string; text: string }) => (
  <View style={styles.benefitItem}>
    <Text style={styles.benefitIcon}>{icon}</Text>
    <Text style={styles.benefitText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.l,
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    marginBottom: SPACING.xl,
    marginTop: SPACING.l,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.primary,
    marginBottom: SPACING.s,
    fontFamily: FONTS.bold,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  benefitsContainer: {
    marginBottom: SPACING.xl,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.m,
    backgroundColor: COLORS.surface,
    padding: SPACING.m,
    borderRadius: 12,
  },
  benefitIcon: {
    fontSize: 24,
    marginRight: SPACING.m,
  },
  benefitText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: "600",
  },
  plansContainer: {
    gap: SPACING.m,
  },
  planCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.l,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  planPrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.primary,
  },
  closeButton: {
    position: "absolute",
    bottom: SPACING.l,
    left: SPACING.l,
    right: SPACING.l,
    padding: SPACING.m,
    alignItems: "center",
  },
  closeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  restoreBtn: {
    marginTop: SPACING.l,
    alignItems: "center",
  },
  restoreText: {
    color: COLORS.textSecondary,
    textDecorationLine: "underline",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingText: {
    color: "#FFF",
    marginTop: SPACING.s,
    fontWeight: "bold",
  },
});

export default SubscriptionScreen;
