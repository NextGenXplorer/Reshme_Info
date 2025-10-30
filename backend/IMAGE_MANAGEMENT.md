# Image Management for Notifications

Complete guide for managing notification images in the ReshmeInfo backend.

## Overview

The backend supports **two ways** to add images to notifications:

1. **External Image URLs** (Recommended) - Use images hosted on GitHub, Imgur, or other services
2. **Upload to Firebase Storage** (Optional) - Upload images directly to Firebase Storage

## ✅ Option 1: Using External Image URLs (Recommended)

### Supported Image Hosting Services

You can use image URLs from any of these popular services:

- **GitHub** - `https://raw.githubusercontent.com/user/repo/main/image.png`
- **GitHubusercontent** - `https://githubusercontent.com/...`
- **Imgur** - `https://i.imgur.com/xxx.png`
- **Firebase Storage** - `https://firebasestorage.googleapis.com/...`
- **Google Cloud Storage** - `https://storage.googleapis.com/...`
- **Cloudinary** - `https://res.cloudinary.com/...`
- **ImgBB** - `https://i.ibb.co/...`
- **Postimg** - `https://i.postimg.cc/...`
- Any other publicly accessible image URL

### Supported Image Formats

- PNG (`.png`)
- JPEG (`.jpg`, `.jpeg`)
- GIF (`.gif`)
- WebP (`.webp`)
- BMP (`.bmp`)
- SVG (`.svg`)

### How to Use External URLs

#### Example 1: GitHub Image
```
https://raw.githubusercontent.com/NextGenXplorer/Reshme_Info/main/assets/notification-image.png
```

#### Example 2: Imgur Image
```
https://i.imgur.com/abc123.png
```

#### Example 3: Direct URL
```
https://example.com/path/to/image.jpg
```

### Validate Image URL (API Endpoint)

**Endpoint:** `POST /validate-image-url`

**Request Body:**
```json
{
  "imageUrl": "https://raw.githubusercontent.com/user/repo/main/image.png"
}
```

**Response (Success):**
```json
{
  "success": true,
  "valid": true,
  "message": "Image URL is valid and accessible",
  "contentType": "image/png"
}
```

**Response (Error):**
```json
{
  "success": false,
  "valid": false,
  "message": "Image URL is not accessible (HTTP 404)"
}
```

**cURL Example:**
```bash
curl -X POST https://your-backend.com/validate-image-url \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://i.imgur.com/example.png"}'
```

## 🔄 Option 2: Upload to Firebase Storage (Optional)

If you don't have an external image URL, you can upload images directly to Firebase Storage.

### Upload Image Endpoint

**Endpoint:** `POST /upload-image`

**Content-Type:** `multipart/form-data`

**Form Field:** `image` (file)

**Constraints:**
- Maximum file size: 5MB
- Allowed types: Images only
- Automatic optimization: Resized to max 1200x1200px, converted to PNG

**Response (Success):**
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "imageUrl": "https://storage.googleapis.com/bucket-name/notification-images/1234567890-image.png",
  "filename": "notification-images/1234567890-image.png",
  "size": 245678
}
```

**cURL Example:**
```bash
curl -X POST https://your-backend.com/upload-image \
  -F "image=@/path/to/your/image.png"
```

**JavaScript/React Native Example:**
```javascript
const formData = new FormData();
formData.append('image', {
  uri: imageUri,
  type: 'image/png',
  name: 'notification-image.png'
});

const response = await fetch('https://your-backend.com/upload-image', {
  method: 'POST',
  body: formData,
  headers: {
    'Content-Type': 'multipart/form-data',
  }
});

const result = await response.json();
console.log('Uploaded image URL:', result.imageUrl);
```

### Delete Uploaded Image

**Endpoint:** `DELETE /delete-image`

**Request Body:**
```json
{
  "imageUrl": "https://storage.googleapis.com/bucket-name/notification-images/1234567890-image.png"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

### List All Uploaded Images

**Endpoint:** `GET /list-images`

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "name": "notification-images/1234567890-image1.png",
      "url": "https://storage.googleapis.com/bucket-name/notification-images/1234567890-image1.png",
      "created": "2025-01-15T10:30:00.000Z",
      "size": 245678
    },
    {
      "name": "notification-images/1234567891-image2.png",
      "url": "https://storage.googleapis.com/bucket-name/notification-images/1234567891-image2.png",
      "created": "2025-01-15T11:45:00.000Z",
      "size": 189432
    }
  ]
}
```

## 📤 Sending Notifications with Images

### Send Custom Notification with Image

**Endpoint:** `POST /send-custom-notification`

**Request Body:**
```json
{
  "title": "New Silk Price Update",
  "message": "Check out the latest cocoon prices!",
  "priority": "high",
  "targetAudience": "all",
  "imageUrl": "https://raw.githubusercontent.com/user/repo/main/price-banner.png"
}
```

**Notes:**
- `imageUrl` is **OPTIONAL**
- If not provided, uses default logo: `https://raw.githubusercontent.com/NextGenXplorer/Reshme_Info/main/assets/reshme_logo.png`
- Image will be displayed in push notification and in-app notification detail screen

## 🎨 Best Practices

### Image Recommendations

1. **Aspect Ratio:** 2:1 (landscape) or 1:1 (square) works best
2. **Resolution:** 1200x600px (landscape) or 1200x1200px (square)
3. **File Size:** Under 500KB for faster loading
4. **Format:** PNG or JPEG (PNG recommended for transparency)

### Using GitHub for Images

**Step 1:** Upload image to your GitHub repository
```
/assets/notifications/banner.png
```

**Step 2:** Get raw URL
```
https://raw.githubusercontent.com/username/repo/main/assets/notifications/banner.png
```

**Step 3:** Use in notification
```json
{
  "imageUrl": "https://raw.githubusercontent.com/username/repo/main/assets/notifications/banner.png"
}
```

### Using Imgur for Images

**Step 1:** Upload to Imgur (https://imgur.com/upload)

**Step 2:** Get direct link (right-click image → "Copy image address")
```
https://i.imgur.com/ABC123.png
```

**Step 3:** Use in notification
```json
{
  "imageUrl": "https://i.imgur.com/ABC123.png"
}
```

## 🔍 Validation Examples

### Valid URLs ✅

```
✅ https://raw.githubusercontent.com/user/repo/main/image.png
✅ https://i.imgur.com/abc123.jpg
✅ https://storage.googleapis.com/bucket/image.png
✅ https://example.com/images/banner.jpg
✅ https://res.cloudinary.com/demo/image/upload/sample.jpg
```

### Invalid URLs ❌

```
❌ http://example.com/image.png (use HTTPS)
❌ https://example.com/page.html (not an image)
❌ file:///local/path/image.png (local files not accessible)
❌ data:image/png;base64,... (base64 not supported, upload instead)
```

## 📱 Admin App Integration

The admin notification form in the React Native app includes an `imageUrl` field:

```typescript
const [formData, setFormData] = useState({
  title: '',
  message: '',
  imageUrl: '', // Optional field
  priority: 'medium',
  targetAudience: 'all',
  expiryDays: 7,
});
```

**Usage in Admin Panel:**
1. Leave `imageUrl` empty for default logo
2. Paste GitHub/Imgur URL for external image
3. Or upload via `/upload-image` endpoint first, then paste the returned URL

## 🚀 Installation

### Install Dependencies

```bash
cd backend
npm install multer sharp
```

### Environment Variables

Add to `.env`:
```env
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
```

### Restart Server

```bash
npm start
```

## 🧪 Testing

### Test URL Validation

```bash
curl -X POST http://localhost:3000/validate-image-url \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://raw.githubusercontent.com/NextGenXplorer/Reshme_Info/main/assets/reshme_logo.png"}'
```

### Test Image Upload

```bash
curl -X POST http://localhost:3000/upload-image \
  -F "image=@./test-image.png"
```

### Test Notification with Image

```bash
curl -X POST http://localhost:3000/send-custom-notification \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "Testing image support",
    "priority": "high",
    "targetAudience": "all",
    "imageUrl": "https://i.imgur.com/example.png"
  }'
```

## 📊 Image URL Sources Summary

| Source | Example URL | Pros | Cons |
|--------|------------|------|------|
| **GitHub** | `raw.githubusercontent.com` | Free, version controlled, reliable | Public repos only |
| **Imgur** | `i.imgur.com` | Easy upload, no account needed | May have limits |
| **Firebase Storage** | `storage.googleapis.com` | Integrated, secure | Requires upload |
| **Cloudinary** | `res.cloudinary.com` | CDN, transformations | May need account |
| **Direct URL** | Any `https://` image | Simple | Must be publicly accessible |

## ⚠️ Troubleshooting

### Image Not Showing in Notification

**Problem:** Image URL provided but not displayed

**Solutions:**
1. Verify URL is publicly accessible (open in browser)
2. Check URL uses HTTPS (not HTTP)
3. Validate URL using `/validate-image-url` endpoint
4. Ensure image file exists at the URL
5. Check image format is supported

### Upload Fails

**Problem:** Image upload returns error

**Solutions:**
1. Check file size is under 5MB
2. Verify file is an image (not PDF/document)
3. Check Firebase Storage is enabled
4. Verify `FIREBASE_STORAGE_BUCKET` in `.env`
5. Check Firebase Storage security rules

### Image Too Large

**Problem:** Image loads slowly or times out

**Solutions:**
1. Compress image before uploading (use TinyPNG, etc.)
2. Resize to recommended dimensions (1200x1200 max)
3. Use JPEG instead of PNG for photos
4. Consider using a CDN for faster delivery

## 📚 Additional Resources

- [GitHub Raw URLs](https://docs.github.com/en/repositories/working-with-files/using-files/getting-permanent-links-to-files)
- [Imgur API Documentation](https://apidocs.imgur.com/)
- [Firebase Storage Documentation](https://firebase.google.com/docs/storage)
- [Image Optimization Guide](https://web.dev/fast/#optimize-your-images)

---

**Note:** The `imageUrl` field is **completely optional**. If not provided, notifications will use the default ReshmeInfo logo automatically.
