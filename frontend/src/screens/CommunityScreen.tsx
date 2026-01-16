import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import {
  FeedItem,
  Comment,
  fetchCommunityFeed,
  toggleLike,
  addComment,
  fetchComments,
  reportSubmission,
  blockUser,
} from "../api/community";
import { COLORS, SPACING, FONTS } from "../constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import FireAnimation from "../components/FireAnimation";

const SCREEN_WIDTH = Dimensions.get("window").width;

const CommunityScreen = () => {
  const queryClient = useQueryClient();
  const [showFireAnimation, setShowFireAnimation] = useState<string | null>(
    null
  );
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<FeedItem | null>(
    null
  );
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const {
    data: feed,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["communityFeed"],
    queryFn: fetchCommunityFeed,
  });

  // Like mutation with optimistic update
  const likeMutation = useMutation({
    mutationFn: toggleLike,
    onMutate: async (submissionId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["communityFeed"] });

      // Snapshot current data
      const previousFeed = queryClient.getQueryData<FeedItem[]>([
        "communityFeed",
      ]);

      // Optimistically update
      queryClient.setQueryData<FeedItem[]>(["communityFeed"], (old) => {
        if (!old) return old;
        return old.map((item) => {
          if (item._id === submissionId) {
            const newIsLiked = !item.isLiked;
            return {
              ...item,
              isLiked: newIsLiked,
              likeCount: item.likeCount + (newIsLiked ? 1 : -1),
            };
          }
          return item;
        });
      });

      return { previousFeed };
    },
    onError: (err, submissionId, context) => {
      // Rollback on error
      if (context?.previousFeed) {
        queryClient.setQueryData(["communityFeed"], context.previousFeed);
      }
    },
    onSettled: () => {
      // Refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ["communityFeed"] });
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: ({
      submissionId,
      text,
    }: {
      submissionId: string;
      text: string;
    }) => addComment(submissionId, text),
    onSuccess: (data) => {
      // Add new comment to local list
      setComments((prev) => [data.comment, ...prev]);
      setCommentText("");

      // Update comment count in feed
      queryClient.setQueryData<FeedItem[]>(["communityFeed"], (old) => {
        if (!old) return old;
        return old.map((item) => {
          if (item._id === selectedSubmission?._id) {
            return { ...item, commentCount: data.commentCount };
          }
          return item;
        });
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const handleLike = useCallback(
    (item: FeedItem) => {
      // Show fire animation only when liking (not unliking)
      if (!item.isLiked) {
        setShowFireAnimation(item._id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      likeMutation.mutate(item._id);
    },
    [likeMutation]
  );

  const openComments = useCallback(async (item: FeedItem) => {
    setSelectedSubmission(item);
    setCommentModalVisible(true);
    setLoadingComments(true);

    try {
      const fetchedComments = await fetchComments(item._id);
      setComments(fetchedComments);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const closeComments = useCallback(() => {
    setCommentModalVisible(false);
    setSelectedSubmission(null);
    setComments([]);
    setCommentText("");
  }, []);

  const submitComment = useCallback(() => {
    if (!commentText.trim() || !selectedSubmission) return;

    commentMutation.mutate({
      submissionId: selectedSubmission._id,
      text: commentText.trim(),
    });
  }, [commentText, selectedSubmission, commentMutation]);

  // Report Mutation
  const reportMutation = useMutation({
    mutationFn: reportSubmission,
    onSuccess: (_, submissionId) => {
      queryClient.setQueryData<FeedItem[]>(["communityFeed"], (old) =>
        old ? old.filter((item) => item._id !== submissionId) : []
      );
      Alert.alert("Reported", "Content has been reported and hidden.");
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to report.");
    },
  });

  // Block Mutation
  const blockMutation = useMutation({
    mutationFn: blockUser,
    onSuccess: (_, userId) => {
      queryClient.setQueryData<FeedItem[]>(["communityFeed"], (old) =>
        old ? old.filter((item) => item.userId !== userId) : []
      );
      queryClient.invalidateQueries({ queryKey: ["communityFeed"] });
      Alert.alert("User Blocked", "User has been blocked.");
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message || "Failed to block user.");
    },
  });

  const showOptions = useCallback(
    (item: FeedItem) => {
      Alert.alert("Options", undefined, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report Post",
          style: "destructive",
          onPress: () => {
            Alert.alert("Confirm", "Report this post?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Report",
                style: "destructive",
                onPress: () => reportMutation.mutate(item._id),
              },
            ]);
          },
        },
        {
          text: "Block User",
          style: "destructive",
          onPress: () => {
            if (item.userId) {
              Alert.alert("Confirm", `Block ${item.userName}?`, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Block",
                  style: "destructive",
                  onPress: () => blockMutation.mutate(item.userId!),
                },
              ]);
            }
          },
        },
      ]);
    },
    [reportMutation, blockMutation]
  );

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

  const renderItem = useCallback(
    ({ item }: { item: FeedItem }) => (
      <View style={styles.card}>
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <View style={styles.userInfoRow}>
              <Text style={styles.userName}>{item.userName}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>✓ VERIFIED</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => showOptions(item)}
              style={styles.optionsButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.optionsIcon}>⋮</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.habitTitle}>{item.habitTitle}</Text>
          <View style={styles.verdictContainer}>
            <Text style={styles.verdictLabel}>AI VERDICT:</Text>
            <Text style={styles.verdictText}>"{item.aiFeedback}"</Text>
          </View>

          {/* Interaction Row */}
          <View style={styles.interactionRow}>
            <TouchableOpacity
              style={styles.interactionButton}
              onPress={() => handleLike(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.interactionIcon}>
                {item.isLiked ? "❤️" : "🤍"}
              </Text>
              <Text
                style={[
                  styles.interactionCount,
                  item.isLiked && styles.interactionCountActive,
                ]}
              >
                {item.likeCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.interactionButton}
              onPress={() => openComments(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.interactionIcon}>💬</Text>
              <Text style={styles.interactionCount}>{item.commentCount}</Text>
            </TouchableOpacity>

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
      </View>
    ),
    [showFireAnimation, handleLike, openComments, showOptions]
  );

  const renderComment = useCallback(
    ({ item }: { item: Comment }) => (
      <View style={styles.commentItem}>
        <Text style={styles.commentUserName}>{item.userName}</Text>
        <Text style={styles.commentText}>{item.text}</Text>
        <Text style={styles.commentTime}>
          {new Date(item.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    ),
    []
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

      {/* Shared Fire Animation Engine */}
      <FireAnimation
        visible={!!showFireAnimation}
        onAnimationEnd={() => setShowFireAnimation(null)}
      />

      {/* Comments Modal */}
      <Modal
        visible={commentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeComments}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Comments</Text>
              <TouchableOpacity onPress={closeComments}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Comments List */}
            {loadingComments ? (
              <View style={styles.commentsLoading}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : comments.length === 0 ? (
              <View style={styles.noComments}>
                <Text style={styles.noCommentsText}>
                  No comments yet. Be the first!
                </Text>
              </View>
            ) : (
              <FlatList
                data={comments}
                keyExtractor={(item) => item._id}
                renderItem={renderComment}
                style={styles.commentsList}
                showsVerticalScrollIndicator={false}
              />
            )}

            {/* Comment Input */}
            <View style={styles.commentInputContainer}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={COLORS.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
                maxLength={500}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!commentText.trim() || commentMutation.isPending) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={submitComment}
                disabled={!commentText.trim() || commentMutation.isPending}
              >
                {commentMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  userInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.s,
  },
  optionsButton: {
    padding: 4,
  },
  optionsIcon: {
    fontSize: 20,
    color: COLORS.textSecondary,
    fontWeight: "bold",
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
    marginBottom: SPACING.m,
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
  interactionRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.m,
  },
  interactionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.l,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.s,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  interactionIcon: {
    fontSize: 20,
    marginRight: SPACING.xs,
  },
  interactionCount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  interactionCountActive: {
    color: COLORS.error,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: "auto",
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
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
    paddingBottom: Platform.OS === "ios" ? 34 : SPACING.m,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 24,
    color: COLORS.textSecondary,
    padding: SPACING.xs,
  },
  commentsLoading: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  noComments: {
    padding: SPACING.xl,
    alignItems: "center",
  },
  noCommentsText: {
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  commentsList: {
    flex: 1,
    paddingHorizontal: SPACING.m,
  },
  commentItem: {
    paddingVertical: SPACING.m,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  commentText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: SPACING.xs,
  },
  commentTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: SPACING.m,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  commentInput: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    fontSize: 14,
    color: COLORS.text,
    maxHeight: 100,
    marginRight: SPACING.s,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 60,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  sendButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 14,
  },
});

export default CommunityScreen;
