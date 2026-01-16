import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import client from "../api/client";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface FeedItem {
  _id: string;
  imageUrl: string;
  habitTitle: string;
  habitDescription: string;
  userName: string;
  aiFeedback: string;
  timestamp: string;
}

const fetchCommunityFeed = async (): Promise<FeedItem[]> => {
  const { data } = await client.get("/community/feed");
  return data;
};

const CommunityScreen = () => {
  const {
    data: feed,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["communityFeed"],
    queryFn: fetchCommunityFeed,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load feed</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: FeedItem }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.imageUrl }} style={styles.image} />
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.userName}>{item.userName}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>✓ VERIFIED</Text>
          </View>
        </View>
        <Text style={styles.habitTitle}>{item.habitTitle}</Text>
        <View style={styles.verdictContainer}>
          <Text style={styles.verdictLabel}>AI VERDICT:</Text>
          <Text style={styles.verdictText}>"{item.aiFeedback}"</Text>
        </View>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Community Feed 🌍</Text>
      {feed && feed.length > 0 ? (
        <FlatList
          data={feed}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🏜️</Text>
          <Text style={styles.emptyTitle}>No Public Verifications Yet</Text>
          <Text style={styles.emptySubtitle}>
            Be the first! Enable "Share Publicly" when creating a habit.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

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
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    padding: SPACING.m,
    fontFamily: FONTS.bold,
  },
  list: {
    paddingHorizontal: SPACING.m,
    paddingBottom: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: SPACING.m,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: SCREEN_WIDTH * 0.6,
    backgroundColor: COLORS.border,
  },
  cardContent: {
    padding: SPACING.m,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.s,
  },
  userName: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
  },
  badge: {
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.s,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  habitTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  verdictContainer: {
    backgroundColor: COLORS.background,
    padding: SPACING.s,
    borderRadius: 8,
    marginBottom: SPACING.s,
  },
  verdictLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  verdictText: {
    fontSize: 14,
    color: COLORS.text,
    fontStyle: "italic",
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: SPACING.m,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.s,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
  },
});

export default CommunityScreen;
