import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Linking,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../firebase.config';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import Header from '../components/Header';
import { callAIWithFallback } from '../utils/aiProviders';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Content item interface matching admin panel structure
interface ContentItem {
  id: string;
  type: 'image' | 'pdf' | 'video' | 'basicInfo';
  title: string;
  titleKn?: string;
  url?: string;
  description?: string;
  descriptionKn?: string;
  order: number;
  active: boolean;
  createdAt: any;
  updatedAt: any;
  // YouTube metadata (fetched automatically)
  youtubeThumbnail?: string;
  youtubeTitle?: string;
}

// Extract YouTube video ID from various URL formats
const extractYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
};

// Check if URL is a YouTube link
const isYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes('youtube.com') || url.includes('youtu.be');
};

// Get YouTube thumbnail URL
const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

// Convert Google Drive/Photos links to direct image URLs
const getDirectImageUrl = (url: string): string => {
  if (!url) return url;

  console.log('🖼️ Processing image URL:', url);

  // Google Drive file link: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
  if (driveFileMatch) {
    const directUrl = `https://drive.google.com/uc?export=view&id=${driveFileMatch[1]}`;
    console.log('🖼️ Converted to Drive direct URL:', directUrl);
    return directUrl;
  }

  // Google Drive open link: https://drive.google.com/open?id=FILE_ID
  const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (driveOpenMatch) {
    const directUrl = `https://drive.google.com/uc?export=view&id=${driveOpenMatch[1]}`;
    console.log('🖼️ Converted to Drive direct URL:', directUrl);
    return directUrl;
  }

  // Google Drive uc link (already direct): https://drive.google.com/uc?export=view&id=FILE_ID
  if (url.includes('drive.google.com/uc')) {
    return url;
  }

  // Google Drive thumbnail link: https://drive.google.com/thumbnail?id=FILE_ID
  const driveThumbnailMatch = url.match(/drive\.google\.com\/thumbnail\?id=([^&]+)/);
  if (driveThumbnailMatch) {
    const directUrl = `https://drive.google.com/uc?export=view&id=${driveThumbnailMatch[1]}`;
    console.log('🖼️ Converted thumbnail to direct URL:', directUrl);
    return directUrl;
  }

  // Google Photos share link
  if (url.includes('photos.google.com') || url.includes('photos.app.goo.gl')) {
    console.log('⚠️ Google Photos links may not display directly. Use a direct image URL.');
    return url;
  }

  // lh3.googleusercontent.com - direct Google image URL (works directly)
  if (url.includes('lh3.googleusercontent.com') || url.includes('googleusercontent.com')) {
    return url;
  }

  return url;
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState<{ [key: string]: boolean }>({});
  const [imageError, setImageError] = useState<{ [key: string]: boolean }>({});
  const [youtubeMetadata, setYoutubeMetadata] = useState<{ [key: string]: { title: string; titleKn: string; thumbnail: string } }>({});
  const [translations, setTranslations] = useState<{ [key: string]: { titleTranslated: string; descriptionTranslated: string; isTranslating: boolean; fromLang: string; toLang: string } }>({});

  const isKannada = i18n.language === 'kn';

  // Detect if text is in Kannada (uses Kannada Unicode range)
  const isKannadaText = (text: string): boolean => {
    if (!text || text.trim().length === 0) return false;

    // Kannada Unicode range: \u0C80-\u0CFF
    const kannadaChars = (text.match(/[\u0C80-\u0CFF]/g) || []).length;
    // English/Latin characters: a-z, A-Z
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

    // If there are any Kannada characters and more Kannada than English, it's Kannada
    if (kannadaChars > 0 && kannadaChars >= englishChars) {
      return true;
    }

    // If no Kannada characters at all, it's not Kannada
    if (kannadaChars === 0) {
      return false;
    }

    // Mixed text - if at least 20% is Kannada, consider it Kannada
    const totalLetters = kannadaChars + englishChars;
    return totalLetters > 0 && (kannadaChars / totalLetters) >= 0.2;
  };

  // Detect source language for translation
  const detectSourceLanguage = (text: string): 'en' | 'kn' => {
    return isKannadaText(text) ? 'kn' : 'en';
  };

  // Translate text using Groq with fallback (auto-detect direction)
  const translateText = async (text: string, type: 'title' | 'description' = 'title'): Promise<{ translated: string; fromLang: string; toLang: string }> => {
    try {
      if (!text || text.trim().length === 0) return { translated: '', fromLang: '', toLang: '' };

      const sourceIsKannada = isKannadaText(text);
      const targetLang = sourceIsKannada ? 'English' : 'Kannada';
      const fromLang = sourceIsKannada ? 'kn' : 'en';
      const toLang = sourceIsKannada ? 'en' : 'kn';

      const prompt = type === 'title'
        ? `Translate the following title to ${targetLang} language. Only return the translated text, nothing else:\n\n"${text}"`
        : `Translate the following description to ${targetLang} language. Keep it natural and easy to read. Only return the translated text, nothing else:\n\n"${text}"`;

      const response = await callAIWithFallback(prompt, 'groq');

      if (response.success && response.content) {
        // Clean up the response - remove quotes if present
        return {
          translated: response.content.trim().replace(/^["']|["']$/g, ''),
          fromLang,
          toLang
        };
      }
      return { translated: '', fromLang: '', toLang: '' };
    } catch (error) {
      console.log('Translation error:', error);
      return { translated: '', fromLang: '', toLang: '' };
    }
  };

  // Translate content item (title and description) - bidirectional
  const translateContent = async (item: ContentItem) => {
    // Skip if nothing to translate
    if (!item.title && !item.description) return;

    // Check if already translated - proper check for items with only title or only description
    const existing = translations[item.id];
    if (existing && !existing.isTranslating) {
      const titleDone = !item.title || existing.titleTranslated;
      const descDone = !item.description || existing.descriptionTranslated;
      if (titleDone && descDone) return;
    }

    console.log('📝 Translating content:', item.id, 'Title:', item.title?.substring(0, 30), 'Desc:', item.description?.substring(0, 30));

    // Mark as translating
    setTranslations(prev => ({
      ...prev,
      [item.id]: { titleTranslated: '', descriptionTranslated: '', isTranslating: true, fromLang: '', toLang: '' }
    }));

    try {
      // Always translate both title and description if they exist
      const [titleResult, descResult] = await Promise.all([
        item.title ? translateText(item.title, 'title') : Promise.resolve({ translated: '', fromLang: '', toLang: '' }),
        item.description ? translateText(item.description, 'description') : Promise.resolve({ translated: '', fromLang: '', toLang: '' })
      ]);

      console.log('✅ Translation done:', item.id, 'Title:', titleResult.translated?.substring(0, 30), 'Desc:', descResult.translated?.substring(0, 30));

      setTranslations(prev => ({
        ...prev,
        [item.id]: {
          titleTranslated: titleResult.translated || '',
          descriptionTranslated: descResult.translated || '',
          isTranslating: false,
          fromLang: titleResult.fromLang || descResult.fromLang || '',
          toLang: titleResult.toLang || descResult.toLang || ''
        }
      }));
    } catch (error) {
      console.log('❌ Content translation error:', error);
      setTranslations(prev => ({
        ...prev,
        [item.id]: { ...prev[item.id], isTranslating: false }
      }));
    }
  };

  // Translate YouTube title to Kannada (always English to Kannada for YouTube)
  const translateYouTubeTitle = async (title: string): Promise<string> => {
    try {
      if (!title) return '';

      const prompt = `Translate the following YouTube video title to Kannada language. Only return the translated text, nothing else:\n\n"${title}"`;
      const response = await callAIWithFallback(prompt, 'groq');

      if (response.success && response.content) {
        return response.content.trim().replace(/^["']|["']$/g, '');
      }
      return '';
    } catch (error) {
      console.log('YouTube title translation error:', error);
      return '';
    }
  };

  // Fetch YouTube metadata using oEmbed API
  const fetchYouTubeMetadata = async (url: string, itemId: string) => {
    try {
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) return;

      // Use oEmbed API (no API key required)
      const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oEmbedUrl);

      if (response.ok) {
        const data = await response.json();
        const englishTitle = data.title || '';

        // Set initial metadata with English title
        setYoutubeMetadata(prev => ({
          ...prev,
          [itemId]: {
            title: englishTitle,
            titleKn: '', // Will be filled after translation
            thumbnail: getYouTubeThumbnail(videoId),
          }
        }));

        // Translate title to Kannada using Groq
        if (englishTitle) {
          const kannadaTitle = await translateYouTubeTitle(englishTitle);
          if (kannadaTitle) {
            setYoutubeMetadata(prev => ({
              ...prev,
              [itemId]: {
                ...prev[itemId],
                titleKn: kannadaTitle,
              }
            }));
          }
        }
      } else {
        // Fallback to just thumbnail if oEmbed fails
        setYoutubeMetadata(prev => ({
          ...prev,
          [itemId]: {
            title: '',
            titleKn: '',
            thumbnail: getYouTubeThumbnail(videoId),
          }
        }));
      }
    } catch (error) {
      console.log('Error fetching YouTube metadata:', error);
      // Still try to set thumbnail on error
      const videoId = extractYouTubeVideoId(url);
      if (videoId) {
        setYoutubeMetadata(prev => ({
          ...prev,
          [itemId]: {
            title: '',
            titleKn: '',
            thumbnail: getYouTubeThumbnail(videoId),
          }
        }));
      }
    }
  };

  // Fetch content from Firestore - sorted by latest updated
  const fetchContent = async () => {
    try {
      const contentRef = collection(db, 'infoContent');
      const q = query(
        contentRef,
        where('active', '==', true),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const items: ContentItem[] = [];

      querySnapshot.forEach((doc) => {
        items.push({
          id: doc.id,
          ...doc.data(),
        } as ContentItem);
      });

      setContent(items);

      // Fetch YouTube metadata for video items and translate content
      items.forEach(item => {
        if (item.type === 'video' && item.url && isYouTubeUrl(item.url)) {
          fetchYouTubeMetadata(item.url, item.id);
        }

        // Translate ALL content - bidirectional support
        // This handles: English→Kannada AND Kannada→English
        // Check if source is Kannada (needs EN translation) or English (needs KN translation)
        const textToCheck = item.title || item.description || '';
        const sourceIsKannada = isKannadaText(textToCheck);

        // If source is Kannada, we ALWAYS need English translation (regardless of content type)
        // If source is English and no admin Kannada translation, we need Kannada translation
        if (sourceIsKannada || (!item.titleKn && !item.descriptionKn)) {
          translateContent(item);
        }
      });
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setYoutubeMetadata({}); // Clear cached metadata
    setTranslations({}); // Clear cached translations to re-translate
    fetchContent();
  }, []);

  // Get localized title (with AI translation - bidirectional)
  const getTitle = (item: ContentItem) => {
    const trans = translations[item.id];

    // If in Kannada mode
    if (isKannada) {
      // First check admin-provided Kannada translation
      if (item.titleKn) return item.titleKn;
      // If original is English, use translated Kannada
      if (trans?.titleTranslated && trans.toLang === 'kn') {
        return trans.titleTranslated;
      }
    } else {
      // In English mode - if original is Kannada, use translated English
      if (trans?.titleTranslated && trans.toLang === 'en') {
        return trans.titleTranslated;
      }
    }
    return item.title;
  };

  // Get localized description (with AI translation - bidirectional)
  const getDescription = (item: ContentItem) => {
    const trans = translations[item.id];

    // If in Kannada mode
    if (isKannada) {
      // First check admin-provided Kannada translation
      if (item.descriptionKn) return item.descriptionKn;
      // If original is English, use translated Kannada
      if (trans?.descriptionTranslated && trans.toLang === 'kn') {
        return trans.descriptionTranslated;
      }
    } else {
      // In English mode - if original is Kannada, use translated English
      if (trans?.descriptionTranslated && trans.toLang === 'en') {
        return trans.descriptionTranslated;
      }
    }
    return item.description || '';
  };

  // Check if content is being translated
  const isTranslatingContent = (itemId: string) => {
    return translations[itemId]?.isTranslating || false;
  };

  // Check if content has AI translation and should show badge
  const hasAITranslation = (item: ContentItem) => {
    const trans = translations[item.id];
    if (!trans) return false;

    // Check if we have any translation (title or description)
    const hasTranslatedContent = trans.titleTranslated || trans.descriptionTranslated;
    if (!hasTranslatedContent) return false;

    // Show badge if we have a translation that matches the current language mode
    if (isKannada && trans.toLang === 'kn') return true;
    if (!isKannada && trans.toLang === 'en') return true;

    return false;
  };

  // Get translation direction text
  const getTranslationLabel = (item: ContentItem) => {
    const trans = translations[item.id];
    if (!trans) return '';

    if (trans.fromLang === 'en' && trans.toLang === 'kn') {
      return 'EN → ಕನ್ನಡ';
    } else if (trans.fromLang === 'kn' && trans.toLang === 'en') {
      return 'ಕನ್ನಡ → EN';
    }
    return '';
  };

  // Get display title (prefer YouTube title for videos, with translation)
  const getDisplayTitle = (item: ContentItem) => {
    const localTitle = getTitle(item);

    // For videos, prefer YouTube fetched title (with Kannada translation if available)
    if (item.type === 'video' && youtubeMetadata[item.id]) {
      const ytMeta = youtubeMetadata[item.id];

      // If in Kannada mode and translated title available, use it
      if (isKannada && ytMeta.titleKn) {
        return ytMeta.titleKn;
      }
      // Otherwise use English title
      if (ytMeta.title) {
        return ytMeta.title;
      }
    }

    return localTitle || (isKannada ? 'ಶೀರ್ಷಿಕೆ ಇಲ್ಲ' : 'Untitled');
  };

  // Get icon for content type
  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return 'image';
      case 'video':
        return 'logo-youtube';
      case 'pdf':
        return 'document-text';
      case 'basicInfo':
        return 'information-circle';
      default:
        return 'document';
    }
  };

  // Get content type label
  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'image':
        return isKannada ? 'ಚಿತ್ರ' : 'Image';
      case 'video':
        return isKannada ? 'ವೀಡಿಯೋ' : 'Video';
      case 'pdf':
        return isKannada ? 'ಪಿಡಿಎಫ್' : 'PDF';
      case 'basicInfo':
        return isKannada ? 'ಮಾಹಿತಿ' : 'Info';
      default:
        return type;
    }
  };

  // Open item in detail view
  const openItemDetail = (item: ContentItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  // Close detail modal
  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  // Handle external link opening
  const openExternalLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening link:', error);
    }
  };

  // Render feed card
  const renderFeedCard = ({ item }: { item: ContentItem }) => {
    const isImageType = item.type === 'image' && item.url;
    const isVideoType = item.type === 'video';
    const isYouTube = isVideoType && item.url && isYouTubeUrl(item.url);
    const ytMetadata = youtubeMetadata[item.id];

    return (
      <TouchableOpacity
        style={styles.feedCard}
        activeOpacity={0.9}
        onPress={() => openItemDetail(item)}
      >
        {/* Card Header - Content Type Badge */}
        <View style={styles.cardHeader}>
          <View style={[
            styles.contentTypeBadge,
            isVideoType && styles.videoBadge,
            item.type === 'pdf' && styles.pdfBadge,
          ]}>
            <Ionicons
              name={getContentTypeIcon(item.type) as any}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.contentTypeText}>
              {getContentTypeLabel(item.type)}
            </Text>
          </View>
        </View>

        {/* Image Content - Show actual image */}
        {isImageType && (
          <View style={styles.imageContainer}>
            {imageLoading[item.id] && !imageError[item.id] && (
              <View style={styles.imageLoadingOverlay}>
                <ActivityIndicator size="large" color="#10B981" />
              </View>
            )}
            {imageError[item.id] ? (
              <View style={styles.imageErrorContainer}>
                <Ionicons name="image-outline" size={50} color="#D1D5DB" />
                <Text style={styles.imageErrorText}>
                  {isKannada ? 'ಚಿತ್ರ ಲೋಡ್ ವಿಫಲ' : 'Image failed to load'}
                </Text>
                <Text style={styles.imageErrorHint}>
                  {isKannada ? 'Google Drive ಲಿಂಕ್ ಪರಿಶೀಲಿಸಿ' : 'Check image URL format'}
                </Text>
              </View>
            ) : (
              <Image
                source={{ uri: getDirectImageUrl(item.url!) }}
                style={styles.feedImage}
                resizeMode="cover"
                onLoadStart={() => {
                  setImageLoading(prev => ({ ...prev, [item.id]: true }));
                  setImageError(prev => ({ ...prev, [item.id]: false }));
                }}
                onLoadEnd={() => setImageLoading(prev => ({ ...prev, [item.id]: false }))}
                onError={(e) => {
                  console.log('❌ Image load error:', item.url, e.nativeEvent.error);
                  setImageLoading(prev => ({ ...prev, [item.id]: false }));
                  setImageError(prev => ({ ...prev, [item.id]: true }));
                }}
              />
            )}
          </View>
        )}

        {/* YouTube Video - Show thumbnail with play button */}
        {isYouTube && (
          <View style={styles.videoContainer}>
            {ytMetadata?.thumbnail ? (
              <>
                <Image
                  source={{ uri: ytMetadata.thumbnail }}
                  style={styles.videoThumbnail}
                  resizeMode="cover"
                />
                <View style={styles.playButtonOverlay}>
                  <View style={styles.playButton}>
                    <Ionicons name="play" size={32} color="#FFFFFF" />
                  </View>
                </View>
                <View style={styles.youtubeBadge}>
                  <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                </View>
              </>
            ) : (
              <View style={styles.videoPlaceholder}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.loadingThumbnailText}>
                  {isKannada ? 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...' : 'Loading...'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Non-YouTube Video Placeholder */}
        {isVideoType && !isYouTube && (
          <View style={styles.videoPlaceholder}>
            <Ionicons name="play-circle" size={60} color="#FFFFFF" />
            <Text style={styles.videoText}>
              {isKannada ? 'ವೀಡಿಯೋ ವೀಕ್ಷಿಸಿ' : 'Watch Video'}
            </Text>
          </View>
        )}

        {/* PDF Placeholder */}
        {item.type === 'pdf' && (
          <View style={styles.pdfPlaceholder}>
            <Ionicons name="document-text" size={50} color="#EF4444" />
            <Text style={styles.pdfText}>
              {isKannada ? 'PDF ಡಾಕ್ಯುಮೆಂಟ್' : 'PDF Document'}
            </Text>
          </View>
        )}

        {/* Basic Info */}
        {item.type === 'basicInfo' && (
          <View style={styles.infoPlaceholder}>
            <Ionicons name="information-circle" size={50} color="#3B82F6" />
          </View>
        )}

        {/* Card Content */}
        <View style={styles.cardContent}>
          {/* Title - show loading while fetching/translating */}
          {(isYouTube && !ytMetadata?.title && !getTitle(item)) || (!isYouTube && isTranslatingContent(item.id) && !getTitle(item)) ? (
            <View style={styles.titleLoadingContainer}>
              <ActivityIndicator size="small" color="#6B7280" />
              <Text style={styles.titleLoadingText}>
                {isKannada ? 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...' : 'Loading...'}
              </Text>
            </View>
          ) : (
            <Text style={styles.cardTitle} numberOfLines={2}>
              {getDisplayTitle(item)}
            </Text>
          )}

          {/* Source & Translation status indicator */}
          <View style={styles.sourceIndicatorRow}>
            {/* YouTube badge */}
            {isYouTube && ytMetadata?.title && (
              <View style={styles.youtubeSourceBadge}>
                <Ionicons name="logo-youtube" size={12} color="#EF4444" />
                <Text style={styles.youtubeSourceText}>YouTube</Text>
              </View>
            )}

            {/* YouTube translation status */}
            {isYouTube && ytMetadata?.titleKn && (
              <View style={styles.translationBadge}>
                <Ionicons name="language" size={12} color="#10B981" />
                <Text style={styles.translatedText}>EN → ಕನ್ನಡ</Text>
              </View>
            )}
            {isYouTube && ytMetadata?.title && !ytMetadata?.titleKn && (
              <View style={styles.translationBadge}>
                <ActivityIndicator size={10} color="#6B7280" />
                <Text style={styles.translatingText}>
                  {isKannada ? 'ಅನುವಾದ...' : 'Translating...'}
                </Text>
              </View>
            )}

            {/* Non-YouTube translation status (bidirectional) */}
            {!isYouTube && hasAITranslation(item) && (
              <View style={styles.translationBadge}>
                <Ionicons name="language" size={12} color="#10B981" />
                <Text style={styles.translatedText}>{getTranslationLabel(item)}</Text>
              </View>
            )}
            {!isYouTube && isTranslatingContent(item.id) && (
              <View style={styles.translationBadge}>
                <ActivityIndicator size={10} color="#6B7280" />
                <Text style={styles.translatingText}>
                  {isKannada ? 'ಅನುವಾದ...' : 'Translating...'}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {getDescription(item) ? (
            <Text style={styles.cardDescription} numberOfLines={3}>
              {getDescription(item)}
            </Text>
          ) : isTranslatingContent(item.id) && item.description ? (
            <View style={styles.descLoadingContainer}>
              <ActivityIndicator size="small" color="#9CA3AF" />
              <Text style={styles.descLoadingText}>
                {isKannada ? 'ವಿವರಣೆ ಅನುವಾದ...' : 'Translating description...'}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.viewMoreButton}>
            <Text style={styles.viewMoreText}>
              {item.type === 'video'
                ? (isKannada ? 'ವೀಕ್ಷಿಸಿ' : 'Watch')
                : (isKannada ? 'ಹೆಚ್ಚು ನೋಡಿ' : 'View More')
              }
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#10B981" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render detail modal
  const renderDetailModal = () => {
    if (!selectedItem) return null;

    const isYouTube = selectedItem.type === 'video' && selectedItem.url && isYouTubeUrl(selectedItem.url);
    const ytMetadata = youtubeMetadata[selectedItem.id];

    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={closeModal}
        statusBarTranslucent={true}
      >
        <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle} numberOfLines={1}>
              {getContentTypeLabel(selectedItem.type)}
            </Text>
            <View style={styles.modalTypeBadge}>
              <Ionicons
                name={getContentTypeIcon(selectedItem.type) as any}
                size={18}
                color="#FFFFFF"
              />
            </View>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {/* Full Image */}
            {selectedItem.type === 'image' && selectedItem.url && (
              <TouchableOpacity
                activeOpacity={0.95}
                style={styles.modalImageContainer}
              >
                <Image
                  source={{ uri: getDirectImageUrl(selectedItem.url) }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )}

            {/* YouTube Video with Thumbnail */}
            {isYouTube && (
              <TouchableOpacity
                style={styles.modalVideoContainer}
                activeOpacity={0.9}
                onPress={() => openExternalLink(selectedItem.url!)}
              >
                {ytMetadata?.thumbnail ? (
                  <>
                    <Image
                      source={{ uri: ytMetadata.thumbnail }}
                      style={styles.modalVideoThumbnail}
                      resizeMode="cover"
                    />
                    <View style={styles.modalPlayOverlay}>
                      <View style={styles.modalPlayButton}>
                        <Ionicons name="play" size={40} color="#FFFFFF" />
                      </View>
                      <Text style={styles.tapToPlayText}>
                        {isKannada ? 'ವೀಕ್ಷಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ' : 'Tap to play'}
                      </Text>
                    </View>
                    <View style={styles.youtubeModalBadge}>
                      <Ionicons name="logo-youtube" size={24} color="#FF0000" />
                      <Text style={styles.youtubeText}>YouTube</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.videoPlaceholderModal}>
                    <Ionicons name="logo-youtube" size={60} color="#FF0000" />
                    <Text style={styles.watchVideoText}>
                      {isKannada ? 'ವೀಡಿಯೋ ವೀಕ್ಷಿಸಿ' : 'Watch on YouTube'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* Non-YouTube Video */}
            {selectedItem.type === 'video' && selectedItem.url && !isYouTube && (
              <TouchableOpacity
                style={styles.modalVideoPlaceholder}
                onPress={() => openExternalLink(selectedItem.url!)}
              >
                <Ionicons name="play-circle" size={80} color="#FFFFFF" />
                <Text style={styles.watchVideoText}>
                  {isKannada ? 'ವೀಡಿಯೋ ವೀಕ್ಷಿಸಲು ಟ್ಯಾಪ್ ಮಾಡಿ' : 'Tap to watch video'}
                </Text>
              </TouchableOpacity>
            )}

            {/* PDF Link */}
            {selectedItem.type === 'pdf' && selectedItem.url && (
              <TouchableOpacity
                style={styles.modalPdfContainer}
                onPress={() => openExternalLink(selectedItem.url!)}
              >
                <Ionicons name="document-text" size={80} color="#EF4444" />
                <Text style={styles.openPdfText}>
                  {isKannada ? 'PDF ತೆರೆಯಲು ಟ್ಯಾಪ್ ಮಾಡಿ' : 'Tap to open PDF'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Basic Info Display */}
            {selectedItem.type === 'basicInfo' && (
              <View style={styles.modalInfoContainer}>
                <Ionicons name="information-circle" size={60} color="#3B82F6" />
              </View>
            )}

            {/* Content Details */}
            <View style={styles.detailsContainer}>
              {/* Title */}
              <Text style={styles.modalDetailTitle}>
                {getDisplayTitle(selectedItem)}
              </Text>

              {/* YouTube auto-fetched title indicator */}
              {isYouTube && ytMetadata?.title && !getTitle(selectedItem) && (
                <View style={styles.autoFetchedBadge}>
                  <Ionicons name="sparkles" size={12} color="#6B7280" />
                  <Text style={styles.autoFetchedText}>
                    {isKannada ? 'YouTube ನಿಂದ' : 'From YouTube'}
                  </Text>
                </View>
              )}

              {/* Description */}
              {getDescription(selectedItem) ? (
                <Text style={styles.modalDescription}>
                  {getDescription(selectedItem)}
                </Text>
              ) : null}

              {/* Action Button for external content */}
              {(selectedItem.type === 'video' || selectedItem.type === 'pdf') && selectedItem.url && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    selectedItem.type === 'video' && styles.videoActionButton,
                    selectedItem.type === 'pdf' && styles.pdfActionButton,
                  ]}
                  onPress={() => openExternalLink(selectedItem.url!)}
                >
                  <Ionicons
                    name={selectedItem.type === 'video' ? 'play' : 'open-outline'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionButtonText}>
                    {selectedItem.type === 'video'
                      ? (isKannada ? 'YouTube ನಲ್ಲಿ ವೀಕ್ಷಿಸಿ' : 'Watch on YouTube')
                      : (isKannada ? 'PDF ತೆರೆಯಿರಿ' : 'Open PDF')
                    }
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[styles.bottomSpacing, { paddingBottom: insets.bottom }]} />
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // Empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="leaf-outline" size={80} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>
        {isKannada ? 'ಇನ್ನೂ ವಿಷಯವಿಲ್ಲ' : 'No content yet'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {isKannada
          ? 'ಹೊಸ ವಿಷಯಕ್ಕಾಗಿ ನಂತರ ಪರಿಶೀಲಿಸಿ'
          : 'Check back later for new updates'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title={t('home')} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>
            {isKannada ? 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...' : 'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header title={t('home')} />

      <FlatList
        data={content}
        renderItem={renderFeedCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.feedContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#10B981']}
            tintColor="#10B981"
          />
        }
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {renderDetailModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  feedContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  separator: {
    height: 16,
  },
  feedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  contentTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  videoBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
  },
  pdfBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
  },
  contentTypeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Image styles
  imageContainer: {
    width: '100%',
    height: SCREEN_WIDTH * 0.75,
    backgroundColor: '#F3F4F6',
    position: 'relative',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    zIndex: 5,
  },
  feedImage: {
    width: '100%',
    height: '100%',
  },
  // Video styles
  videoContainer: {
    width: '100%',
    height: SCREEN_WIDTH * 0.56, // 16:9 aspect ratio
    backgroundColor: '#000',
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 4,
  },
  youtubeBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 6,
    borderRadius: 6,
  },
  videoPlaceholder: {
    width: '100%',
    height: SCREEN_WIDTH * 0.5,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingThumbnailText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 8,
  },
  videoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  // PDF styles
  pdfPlaceholder: {
    width: '100%',
    height: SCREEN_WIDTH * 0.35,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdfText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  // Info styles
  infoPlaceholder: {
    width: '100%',
    height: SCREEN_WIDTH * 0.25,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Card content
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 24,
  },
  titleLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  titleLoadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  sourceIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  youtubeSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  youtubeSourceText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  translationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  translatedText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '500',
  },
  translatingText: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  descLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  descLoadingText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewMoreText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
    marginRight: 12,
  },
  modalHeaderTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalTypeBadge: {
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 8,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalImageContainer: {
    width: '100%',
    minHeight: SCREEN_HEIGHT * 0.45,
    maxHeight: SCREEN_HEIGHT * 0.6,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalVideoContainer: {
    width: '100%',
    height: SCREEN_WIDTH * 0.6,
    backgroundColor: '#000',
    position: 'relative',
  },
  modalVideoThumbnail: {
    width: '100%',
    height: '100%',
  },
  modalPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  modalPlayButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 6,
    marginBottom: 12,
  },
  tapToPlayText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  youtubeModalBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  youtubeText: {
    color: '#1F2937',
    fontSize: 13,
    fontWeight: '600',
  },
  videoPlaceholderModal: {
    width: '100%',
    height: SCREEN_WIDTH * 0.5,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalVideoPlaceholder: {
    width: '100%',
    height: SCREEN_WIDTH * 0.5,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchVideoText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  modalPdfContainer: {
    width: '100%',
    height: SCREEN_WIDTH * 0.5,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  openPdfText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  modalInfoContainer: {
    width: '100%',
    height: SCREEN_WIDTH * 0.3,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 8,
  },
  modalDetailTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 30,
    marginBottom: 8,
  },
  autoFetchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  autoFetchedText: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 26,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  videoActionButton: {
    backgroundColor: '#EF4444',
  },
  pdfActionButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});
