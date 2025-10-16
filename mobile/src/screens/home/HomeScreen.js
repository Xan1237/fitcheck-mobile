import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const HomeScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [showViewCommentsModal, setShowViewCommentsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [postComments, setPostComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/posts');
      setPosts(response.data.posts || []);
    } catch (error) {
      console.error('Error fetching feed:', error);
    } finally { 
      setLoading(false);
    }
  };

  const handleLikePress = async (postId) => {
    try {
      // Optimistically update the UI first
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.postId === postId) {
            const isCurrentlyLiked = post.is_liked;
            return {
              ...post,
              is_liked: !isCurrentlyLiked,
              total_likes: isCurrentlyLiked 
                ? (post.total_likes || 0) - 1 
                : (post.total_likes || 0) + 1
            };
          }
          return post;
        })
      );

      // Call the API
      await api.get(`/api/addPostLike/${postId}`);
      
    } catch (error) {
      console.error('Error handling like:', error);
      
      // Revert the optimistic update on error
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.postId === postId) {
            const isCurrentlyLiked = post.is_liked;
            return {
              ...post,
              is_liked: !isCurrentlyLiked,
              total_likes: isCurrentlyLiked 
                ? (post.total_likes || 0) - 1 
                : (post.total_likes || 0) + 1
            };
          }
          return post;
        })
      );
    }
  };

  const handleCommentPress = async (post) => {
    setSelectedPost(post);
    setShowViewCommentsModal(true);
    await fetchPostComments(post.postId);
  };

  const fetchPostComments = async (postId) => {
    try {
      setLoadingComments(true);
      const response = await api.get(`/api/post/${postId}/comments`);
      // Handle the API response structure
      setPostComments(response.data.data || response.data.comments || response.data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setPostComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = () => {
    setShowViewCommentsModal(false);
    setShowCommentModal(true);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('Error', 'Please enter a comment');
      return;
    }

    if (!selectedPost?.postId) {
      Alert.alert('Error', 'Invalid post');
      return;
    }

    try {
      const commentData = {
        text: commentText.trim(),
        created_at: new Date().toISOString(),
        username: user?.username || 'Anonymous'
      };

      await api.post(`/api/post/${selectedPost.postId}/comment`, commentData);
      
      // Update the post's comment count optimistically
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.postId === selectedPost.postId) {
            return {
              ...post,
              total_comments: (post.total_comments || 0) + 1
            };
          }
          return post;
        })
      );

      // Close modal and reset
      setShowCommentModal(false);
      setCommentText('');
      setSelectedPost(null);
      
      // Refresh comments if view modal is still open
      if (selectedPost?.postId) {
        await fetchPostComments(selectedPost.postId);
      }
      
      Alert.alert('Success', 'Comment added successfully!');
      
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment. Please try again.');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  };

  const renderPost = (post) => (
    <View key={post.postId} style={styles.postCard}>
      <View style={styles.postHeader}>
        <View style={styles.userInfo}>
          <Image
            source={{ 
              uri: post.profile_picture_url || 'https://via.placeholder.com/40' 
            }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.username}>{post.username || 'Anonymous'}</Text>
            <Text style={styles.timestamp}>
              {new Date(post.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      <Text style={styles.postContent}>{post.description || post.title}</Text>

      {post.image_url && (
        <Image source={{ uri: post.image_url }} style={styles.postImage} />
      )}

      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleLikePress(post.postId)}
        >
          <Ionicons 
            name={post.is_liked ? "heart" : "heart-outline"} 
            size={24} 
            color={post.is_liked ? "#FF3040" : "#666"} 
          />
          <Text style={styles.actionText}>{post.total_likes || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleCommentPress(post)}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#666" />
          <Text style={styles.actionText}>{post.total_comments || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FitCheck</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>
            Welcome back, {user?.username}!
          </Text>
          <Text style={styles.welcomeSubtext}>
            Ready for your fitness journey today?
          </Text>
        </View>

        <View style={styles.quickActions}>
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('FindGyms')}
          >
            <Ionicons name="location" size={32} color="#007AFF" />
            <Text style={styles.quickActionText}>Find Gyms</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('CreatePost')}
          >
            <Ionicons name="add-circle" size={32} color="#FF9500" />
            <Text style={styles.quickActionText}>Share Post</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Ionicons name="people" size={32} color="#34C759" />
            <Text style={styles.quickActionText}>Connect</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.feedSection}>
          <Text style={styles.sectionTitle}>Your Feed</Text>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text>Loading your feed...</Text>
            </View>
          ) : posts.length > 0 ? (
            posts.map(renderPost)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="fitness-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No posts yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Follow some users to see their posts here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Comment Modal */}
      <Modal
        visible={showCommentModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowCommentModal(false);
              setCommentText('');
              setSelectedPost(null);
            }}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Comment</Text>
            <TouchableOpacity onPress={handleSubmitComment} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            {selectedPost && (
              <View style={styles.postPreview}>
                <Text style={styles.postPreviewUser}>@{selectedPost.username}</Text>
                <Text style={styles.postPreviewText} numberOfLines={2}>
                  {selectedPost.description || selectedPost.title}
                </Text>
              </View>
            )}
            
            <TextInput
              style={styles.commentInput}
              placeholder="Write your comment..."
              value={commentText}
              onChangeText={setCommentText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{commentText.length}/500</Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* View Comments Modal */}
      <Modal
        visible={showViewCommentsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowViewCommentsModal(false);
              setSelectedPost(null);
              setPostComments([]);
            }}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Comments ({postComments.length})
            </Text>
            <TouchableOpacity onPress={handleAddComment} style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            {selectedPost && (
              <View style={styles.postPreview}>
                <Text style={styles.postPreviewUser}>@{selectedPost.username}</Text>
                <Text style={styles.postPreviewText} numberOfLines={2}>
                  {selectedPost.description || selectedPost.title}
                </Text>
              </View>
            )}
            
            {loadingComments ? (
              <View style={styles.loadingContainer}>
                <Text>Loading comments...</Text>
              </View>
            ) : postComments.length > 0 ? (
              <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={true}>
                {postComments.map((comment, index) => (
                  <View key={comment.id || index} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentUserInfo}>
                        <Image
                          source={{ 
                            uri: comment.profile_picture_url || 'https://via.placeholder.com/32' 
                          }}
                          style={styles.commentAvatar}
                        />
                        <Text style={styles.commentUsername}>@{comment.username}</Text>
                      </View>
                      <Text style={styles.commentTime}>
                        {new Date(comment.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptyCommentsContainer}>
                <Ionicons name="chatbubble-outline" size={48} color="#ccc" />
                <Text style={styles.emptyCommentsText}>No comments yet</Text>
                <Text style={styles.emptyCommentsSubtext}>Be the first to comment!</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  welcomeSection: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  welcomeSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  quickActionCard: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  feedSection: {
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  postCard: {
    backgroundColor: 'white',
    marginBottom: 10,
    padding: 15,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
    flex: 1,
  },
  postPreview: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  postPreviewUser: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 5,
  },
  postPreviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: '#f8f8f8',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  
  // Comments viewing styles
  commentsList: {
    flex: 1,
    marginTop: 16,
  },
  commentItem: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  emptyCommentsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyCommentsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyCommentsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default HomeScreen;
