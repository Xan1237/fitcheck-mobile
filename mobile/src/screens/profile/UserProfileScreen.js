import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:5175';
const { width } = Dimensions.get('window');

const UserProfileScreen = ({ navigation, route }) => {
  const { userId, user: initialUser } = route.params;
  const [profile, setProfile] = useState(initialUser || null);
  const [posts, setPosts] = useState([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalPosts: 0,
    personalRecords: 0,
  });

  useEffect(() => {
    // Call API when component loads - either with userId or initialUser data
    if (userId || initialUser?.username) {
      fetchUserProfile();
      checkFollowingStatus();
    }
  }, [userId]);

  useEffect(() => {
    // Also fetch profile data when component first mounts
    if (initialUser?.username) {
      fetchUserProfile();
      checkFollowingStatus();
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      
      // Get username from multiple sources
      const username = initialUser?.username || profile?.username;
      
      if (!username) {
        console.error('No username available to fetch profile');
        Alert.alert('Error', 'Unable to load user profile - missing username');
        return;
      }

      console.log('Fetching profile for username:', username);
      
      const response = await axios.get(`${API_BASE_URL}/api/GetUserData/?userName=${encodeURIComponent(username)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      console.log('Profile API response:', response.data);

      if (response.data && response.data.success && response.data.user) {
        const userData = response.data.user;
        setProfile({
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          gender: userData.gender,
          bio: userData.bio,
          location: userData.location,
          gymExperience: userData.gymExperience,
          preferredGymType: userData.preferredGymType,
          trainingFrequency: userData.trainingFrequency,
          profileImage: userData.profilePictureUrl,
          pr: userData.pr || [],
        });
        
        // Set posts from user data
        setPosts(userData.posts || []);
        
        // Update stats based on user data
        setStats({
          totalPosts: userData.posts ? userData.posts.length : 0,
          personalRecords: userData.pr ? userData.pr.length : 0,
        });

        console.log('Profile data updated successfully');
      } else {
        console.error('Invalid API response structure:', response.data);
        Alert.alert('Error', 'Failed to load user profile - invalid response');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    // Posts are already fetched in fetchUserProfile, so this is optional
    // Could be used for separate post loading if needed
    return;
  };

  const fetchUserStats = async () => {
    // Stats are calculated from the user data in fetchUserProfile
    // This function could be used for additional stats if needed
    return;
  };

  const checkFollowingStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      const response = await axios.get(`${API_BASE_URL}/api/follow/status/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setIsFollowing(response.data.isFollowing);
      }
    } catch (error) {
      console.error('Error checking follow status:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please sign in to follow users');
        return;
      }

      const response = await axios.post(`${API_BASE_URL}/api/follow`, 
        { userId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        setIsFollowing(!isFollowing);
        setFollowers(prev => isFollowing ? prev - 1 : prev + 1);
      }
    } catch (error) {
      console.error('Error following user:', error);
      Alert.alert('Error', 'Failed to follow user');
    }
  };

  const handleMessage = () => {
    // Navigate to chat with this user
    navigation.navigate('ChatDetail', { userId, userName: profile?.username });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserProfile(),
      checkFollowingStatus()
    ]);
    setRefreshing(false);
  };

  const renderPost = (post, index) => (
    <TouchableOpacity key={index} style={styles.postCard}>
      {post.image && (
        <Image source={{ uri: post.image }} style={styles.postImage} />
      )}
      <View style={styles.postContent}>
        <Text style={styles.postText}>{post.content}</Text>
        <View style={styles.postStats}>
          <View style={styles.postStat}>
            <MaterialIcons name="favorite" size={16} color="#ff6b00" />
            <Text style={styles.postStatText}>{post.likes || 0}</Text>
          </View>
          <View style={styles.postStat}>
            <MaterialIcons name="comment" size={16} color="#666" />
            <Text style={styles.postStatText}>{post.comments || 0}</Text>
          </View>
          <Text style={styles.postDate}>
            {new Date(post.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!profile || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="person" size={48} color="#ccc" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{profile.username}</Text>
        <TouchableOpacity>
          <MaterialIcons name="more-vert" size={24} color="#222" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#ff6b00']}
            tintColor="#ff6b00"
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.imageContainer}>
            {profile?.profileImage ? (
              <Image source={{ uri: profile.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.defaultImage}>
                <MaterialIcons name="person" size={40} color="#ccc" />
              </View>
            )}
          </View>
          
          <Text style={styles.username}>
            {profile?.firstName && profile?.lastName 
              ? `${profile.firstName} ${profile.lastName}` 
              : profile?.username || 'User'}
          </Text>
          
          {profile?.firstName && profile?.lastName && (
            <Text style={styles.usernameHandle}>@{profile?.username}</Text>
          )}
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? 'Following' : 'Follow'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
              <MaterialIcons name="message" size={18} color="#ff6b00" />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalPosts}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.personalRecords}</Text>
            <Text style={styles.statLabel}>PRs</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.bioSection}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.bioText}>
            {profile?.bio || 'No bio available'}
          </Text>
          
          {/* Additional Info */}
          {(profile?.location || profile?.gymExperience || profile?.preferredGymType || profile?.trainingFrequency) && (
            <View style={styles.additionalInfo}>
              {profile?.location && (
                <View style={styles.infoItem}>
                  <MaterialIcons name="location-on" size={16} color="#666" />
                  <Text style={styles.infoText}>{profile.location}</Text>
                </View>
              )}
              {profile?.gymExperience && (
                <View style={styles.infoItem}>
                  <MaterialIcons name="fitness-center" size={16} color="#666" />
                  <Text style={styles.infoText}>Experience: {profile.gymExperience}</Text>
                </View>
              )}
              {profile?.trainingFrequency && (
                <View style={styles.infoItem}>
                  <MaterialIcons name="schedule" size={16} color="#666" />
                  <Text style={styles.infoText}>Frequency: {profile.trainingFrequency}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Personal Records */}
        {profile?.pr && profile.pr.length > 0 && (
          <View style={styles.prSection}>
            <Text style={styles.sectionTitle}>Personal Records</Text>
            {profile.pr.map((record, index) => (
              <View key={index} style={styles.prItem}>
                <Text style={styles.prExercise}>{record.exercise_name}</Text>
                <Text style={styles.prDetails}>
                  {record.weight} lbs × {record.reps} reps
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Posts Section */}
        <View style={styles.postsSection}>
          <Text style={styles.sectionTitle}>Posts</Text>
          {posts.length > 0 ? (
            posts.map(renderPost)
          ) : (
            <View style={styles.noPostsContainer}>
              <MaterialIcons name="post-add" size={48} color="#ccc" />
              <Text style={styles.noPostsText}>No posts yet</Text>
              <Text style={styles.noPostsSubtext}>This user hasn't shared anything yet!</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  
  // Profile Header
  profileHeader: {
    backgroundColor: '#ffffff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  defaultImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  usernameHandle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  followButton: {
    flex: 1,
    backgroundColor: '#ff6b00',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ff6b00',
  },
  followButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButtonText: {
    color: '#ff6b00',
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ff6b00',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 5,
  },
  messageButtonText: {
    color: '#ff6b00',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Stats
  statsContainer: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    paddingVertical: 20,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  
  // Bio
  bioSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 12,
  },
  bioText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
  },
  additionalInfo: {
    marginTop: 15,
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
  },
  
  // Personal Records
  prSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 8,
  },
  prItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  prExercise: {
    fontSize: 16,
    fontWeight: '500',
    color: '#222',
    flex: 1,
  },
  prDetails: {
    fontSize: 14,
    color: '#ff6b00',
    fontWeight: '600',
  },
  
  // Posts
  postsSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  postCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: 16,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  postContent: {
    gap: 8,
  },
  postText: {
    fontSize: 16,
    color: '#222',
    lineHeight: 22,
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  postStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postStatText: {
    fontSize: 14,
    color: '#666',
  },
  postDate: {
    fontSize: 12,
    color: '#999',
    marginLeft: 'auto',
  },
  noPostsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noPostsText: {
    fontSize: 18,
    color: '#666',
    fontWeight: '500',
    marginTop: 16,
  },
  noPostsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default UserProfileScreen;
