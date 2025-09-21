# ===============================
# Firebase Environment Variables
# ===============================
eas env:create --name EXPO_PUBLIC_FIREBASE_API_KEY --value "AIzaSyAXbaHHvgZRTYZPPkcyUM3eeWV3UNo0oz8" --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "reshmeinfo.firebaseapp.com" --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "reshmeinfo" --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "reshmeinfo.firebasestorage.app" --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "1021212352672" --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_FIREBASE_APP_ID --value "1:1021212352672:web:878b3f8446c0a3082869c5" --environment production --visibility plaintext

# ===============================
# Admin Credentials (Admin 1)
# ===============================
eas env:create --name EXPO_PUBLIC_ADMIN_USERNAME_1 --value "super_admin" --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_ADMIN_PASSWORD_1 --value "@Mithun#7411" --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_ADMIN_ROLE_1 --value "super_admin" --environment production --visibility plaintext
eas env:create --name EXPO_PUBLIC_ADMIN_MARKET_1 --value "all" --environment production --visibility plaintext

# ===============================
# (Optional) Admin 2 Example
# ===============================
# eas env:create --name EXPO_PUBLIC_ADMIN_USERNAME_2 --value "admin2" --environment production --visibility plaintext
# eas env:create --name EXPO_PUBLIC_ADMIN_PASSWORD_2 --value "password2" --environment production --visibility plaintext
# eas env:create --name EXPO_PUBLIC_ADMIN_ROLE_2 --value "market_admin" --environment production --visibility plaintext
# eas env:create --name EXPO_PUBLIC_ADMIN_MARKET_2 --value "market2" --environment production --visibility plaintext
